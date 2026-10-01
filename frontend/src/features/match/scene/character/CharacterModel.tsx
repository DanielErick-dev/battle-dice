"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import {
  AnimationMixer,
  Box3,
  Color,
  LoopOnce,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type AnimationAction,
  type Object3D,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { CharacterClip, ClipLengths } from "../../characters";

/** Seconds to blend from one clip into the next. */
const CROSSFADE_SECONDS = 0.25;
/** Slower blend out of an intro or cast, so its final pose settles into the next loop. */
const SETTLE_CROSSFADE_SECONDS = 0.8;
/** Playback speed per clip: the run cycle is sped up to match how fast tokens cover a tile. */
const CLIP_SPEED: Readonly<Record<CharacterClip, number>> = {
  idle: 1,
  run: 1.25,
  cast: 1,
  intro: 1,
  showcase: 1,
  float: 1,
  dash: 1,
  land: 1,
};
/** Clips played once, holding their last pose until the next clip takes over. */
const ONE_SHOT_CLIPS: readonly CharacterClip[] = ["cast", "intro", "dash", "land"];

interface CharacterModelProps {
  url: string;
  /** Height the figure is scaled to, in world units. */
  height: number;
  /** Clip to play, read every frame so movement code can switch it without re-rendering. */
  clip: RefObject<CharacterClip>;
  /** Told the length of each clip the model has (so also which it has), once it's loaded. */
  onClipLengths?: (lengths: ClipLengths) => void;
  /** Playback speed of the intro for this character, on top of CLIP_SPEED (1 by default). */
  introSpeed?: number;
  /** Drawn as a translucent apparition glowing in this colour instead of its own textures. */
  ghost?: string;
  /** Extras bound to the figure's own skeleton (e.g. EnergyBlades in its hands). */
  children?: (figure: Object3D) => ReactNode;
}

/**
 * A rigged character playing its idle or run loop, or a one-shot clip once, crossfading
 * between them. Each instance gets its own copy of the skeleton, so several players can share one
 * model file. A clip the model lacks is ignored and the current one keeps playing.
 */
export function CharacterModel({
  url,
  height,
  clip,
  onClipLengths,
  introSpeed = 1,
  ghost,
  children,
}: CharacterModelProps) {
  const { scene: source, animations } = useGLTF(url);
  const figure = useMemo(() => prepareFigure(source, ghost), [source, ghost]);
  const scale = useMemo(() => height / modelHeight(source), [source, height]);
  const mixer = useMemo(() => new AnimationMixer(figure), [figure]);
  const clips = useMemo(() => new Map(animations.map((animation) => [animation.name, animation])), [animations]);
  const playing = useRef<CharacterClip | null>(null);

  /**
   * The mixer's action for a clip, asked for on every switch rather than kept: the mixer
   * recreates actions after `uncacheRoot`, which a remount (React's dev double-mount) runs.
   */
  const actionFor = (name: CharacterClip): AnimationAction | undefined => {
    const animation = clips.get(name);
    if (!animation) return undefined;
    const action = mixer.clipAction(animation);
    if (ONE_SHOT_CLIPS.includes(name)) {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    return action;
  };

  useEffect(() => {
    const lengths: ClipLengths = {};
    for (const name of Object.keys(CLIP_SPEED) as CharacterClip[]) {
      const duration = clips.get(name)?.duration;
      // As long as it lasts on screen, at this character's intro speed.
      if (duration !== undefined) lengths[name] = duration / (name === "intro" ? introSpeed : 1);
    }
    onClipLengths?.(lengths);
  }, [clips, onClipLengths, introSpeed]);

  useEffect(
    () => () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(figure);
      // Played again from scratch if this figure mounts again.
      playing.current = null;
    },
    [mixer, figure],
  );

  useFrame((_, delta) => {
    // A missing showcase or float idles; any other missing clip keeps the current one going
    // (idle if nothing plays yet).
    const wanted = clips.has(clip.current)
      ? clip.current
      : clip.current === "showcase" || clip.current === "float"
        ? "idle"
        : (playing.current ?? "idle");
    if (wanted !== playing.current) {
      const next = actionFor(wanted);
      const previous = playing.current ? actionFor(playing.current) : undefined;
      if (next) {
        next
          .reset()
          .setEffectiveTimeScale(CLIP_SPEED[wanted] * (wanted === "intro" ? introSpeed : 1))
          .setEffectiveWeight(1)
          .play();
        const fade =
          playing.current === "intro" || playing.current === "cast" || playing.current === "land"
            ? SETTLE_CROSSFADE_SECONDS
            : CROSSFADE_SECONDS;
        if (previous) next.crossFadeFrom(previous, fade, false);
      }
      playing.current = wanted;
    }
    mixer.update(delta);
  });

  return (
    <primitive object={figure} scale={scale}>
      {children?.(figure)}
    </primitive>
  );
}

/**
 * A private copy of the model (own skeleton) that casts shadows; with `ghost`, a see-through
 * shadow of it instead, its outline glowing in that colour, casting none.
 */
function prepareFigure(source: Object3D, ghost?: string) {
  const figure = cloneSkinned(source);
  const ghostMaterial = ghost ? shadowMaterial(ghost) : null;
  figure.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    if (ghostMaterial) node.material = ghostMaterial;
    node.castShadow = !ghostMaterial;
    // The bind-pose bounds don't follow the animated bones; a running figure could get culled.
    node.frustumCulled = false;
  });
  return figure;
}

/**
 * A living shadow: nearly black and see-through, with only its outline glowing in `rim` (the
 * edges, where the surface turns away from the view, light up as smoke does against the light).
 */
function shadowMaterial(rim: string): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: "#04050a",
    emissive: new Color(rim),
    emissiveIntensity: 0.08,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    roughness: 1,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = { value: new Color(rim).multiplyScalar(1.6) };
    shader.fragmentShader = shader.fragmentShader.replace("void main() {", "uniform vec3 uRim;\nvoid main() {").replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
        float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
        totalEmissiveRadiance += uRim * pow(1.0 - facing, 3.0);`,
    );
  };
  return material;
}

/** Height of the model in its own units (Meshy exports stand 1.7 tall). */
function modelHeight(source: Object3D): number {
  return new Box3().setFromObject(source).getSize(new Vector3()).y || 1;
}

/** Starts downloading a model before it's needed (e.g. as a match opens). */
export function preloadCharacterModel(url: string): void {
  useGLTF.preload(url);
}
