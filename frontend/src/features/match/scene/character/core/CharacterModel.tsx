"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { AnimationMixer, Box3, LoopOnce, Vector3, type AnimationAction, type Object3D } from "three";
import type { CharacterClip, ClipLengths } from "../../../characters";
import { CHARACTER_CLIPS, CLIP_PLAYBACK, clipToPlay, crossfadeSeconds } from "./clipPlayback";
import { prepareFigure } from "./figureMaterials";

interface CharacterModelProps {
  url: string;
  /** Height the figure is scaled to, in world units. */
  height: number;
  /** Clip to play, read every frame so movement code can switch it without re-rendering. */
  clip: RefObject<CharacterClip>;
  /** Told the length of each clip the model has (so also which it has), once it's loaded. */
  onClipLengths?: (lengths: ClipLengths) => void;
  /** Playback speed of the intro for this character, on top of CLIP_PLAYBACK (1 by default). */
  introSpeed?: number;
  /** Drawn as a translucent apparition glowing in this colour instead of its own textures. */
  ghost?: string;
  /** Charred and smouldering: Seraphiel after the Fall, until he has a model of his own. */
  fallen?: boolean;
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
  fallen = false,
  children,
}: CharacterModelProps) {
  const { scene: source, animations } = useGLTF(url);
  const figure = useMemo(() => prepareFigure(source, ghost, fallen), [source, ghost, fallen]);
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
    if (CLIP_PLAYBACK[name].once) {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    return action;
  };

  useEffect(() => {
    const lengths: ClipLengths = {};
    for (const name of CHARACTER_CLIPS) {
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
    const wanted = clipToPlay(clip.current, (name) => clips.has(name), playing.current);
    if (wanted !== playing.current) {
      const next = actionFor(wanted);
      const previous = playing.current ? actionFor(playing.current) : undefined;
      if (next) {
        next
          .reset()
          .setEffectiveTimeScale(CLIP_PLAYBACK[wanted].speed * (wanted === "intro" ? introSpeed : 1))
          .setEffectiveWeight(1)
          .play();
        if (previous) next.crossFadeFrom(previous, crossfadeSeconds(playing.current, wanted), false);
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

/** Height of the model in its own units (Meshy exports stand 1.7 tall). */
function modelHeight(source: Object3D): number {
  return new Box3().setFromObject(source).getSize(new Vector3()).y || 1;
}

/** Starts downloading a model before it's needed (e.g. as a match opens). */
export function preloadCharacterModel(url: string): void {
  useGLTF.preload(url);
}
