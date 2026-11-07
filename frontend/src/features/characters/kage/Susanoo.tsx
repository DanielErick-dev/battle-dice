"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, FrontSide, LessEqualDepth, MeshBasicMaterial, type Group } from "three";
import { preloadProps, usePropMesh } from "../core/props";
import { useDisposable } from "../shared/disposal";
import { withRim, type RimUniforms } from "../shared/rimGlow";

/**
 * The Susanoo model (PROPS.susanoo, a Meshy bust: torso, horned skull, arms reaching forward to
 * cupped hands): how much bigger than its export it's drawn.
 */
const SCALE = 2.5;
/**
 * Where the middle of the bust stands, in world units from her feet (she stands 3 tall): raised over
 * her, its chest above her head (so it towers over the tile rather than spreading across the board,
 * in the way of those beside her), and only a little behind her, so she's inside it.
 */
const CENTRE: [number, number, number] = [0, 2.9, -0.3];
/** How far below its place it rises from as it takes form. */
const RISE_DEPTH = 3.5;
/** See-through enough that she reads inside it. */
const OPACITY = 0.62;
/** Its outline's glow: a burning crimson edge, so its whole shape (horned head too) reads on the dark. */
const RIM_COLOR = "#ff2a3d";
const RIM_STRENGTH = 2.4;
/** Per second: how fast it takes form, and how slowly it fades once the armour is gone. */
const FORM_RATE = 1.2;
const FADE_RATE = 1.1;

preloadProps(["susanoo"]);

/**
 * Kage Rubra's Susanoo, while her Spectral Armour lasts: a spirit warrior of red bone and fire rises
 * out of the ground round her and towers over her, she standing inside it, its hands reaching out
 * ahead. In the figure's own frame (+z ahead), in world units. Breathes and glows while it stands;
 * sinks and fades once the armour is gone. No lights: its own glow, through the bloom.
 *
 * Drawn in two passes: its depth first, then its colour over only the nearest surface, so the
 * see-through body shows its outside alone (the back of its skull doesn't wash out its face).
 */
export function Susanoo({ active }: { active: boolean }) {
  const { geometry, material } = usePropMesh("susanoo");
  const spirit = useMemo(() => {
    const copy = material.clone();
    copy.transparent = true;
    copy.depthWrite = false;
    copy.depthFunc = LessEqualDepth;
    copy.side = FrontSide;
    copy.emissive = new Color("#ffffff");
    copy.emissiveMap = copy.map;
    copy.emissiveIntensity = 0.8;
    const rim: RimUniforms = {
      uRimColor: { value: new Color(RIM_COLOR) },
      uRimStrength: { value: RIM_STRENGTH },
    };
    copy.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, rim);
      shader.fragmentShader = withRim(shader.fragmentShader);
    };
    copy.customProgramCacheKey = () => "susanooRim";
    return copy;
  }, [material]);
  useDisposable(spirit);
  const depth = useDisposable(useMemo(() => new MeshBasicMaterial({ colorWrite: false, side: FrontSide }), []));

  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  /** How far it has risen (0 to 1), and how strong it is: fading in with it, and out once gone. */
  const formed = useRef(0);
  const power = useRef(0);

  useFrame(({ clock }, delta) => {
    formed.current = active ? Math.min(1, formed.current + delta * FORM_RATE * 0.7) : formed.current;
    power.current = active
      ? Math.min(1, power.current + delta * FORM_RATE)
      : Math.max(0, power.current - delta * FADE_RATE);
    // Gone for good: it rises from the start next time.
    if (!active && power.current === 0) formed.current = 0;
    if (root.current) root.current.visible = power.current > 0.005;

    const time = clock.elapsedTime;
    const rise = 1 - (1 - formed.current) ** 3;
    if (body.current) {
      // Rises out of the ground, then breathes.
      body.current.position.y = -(1 - rise) * RISE_DEPTH + Math.sin(time * 1.3) * 0.04;
      body.current.scale.set(1, 1 + Math.sin(time * 1.3) * 0.01, 1);
    }
    spirit.setValues({
      opacity: power.current * OPACITY,
      emissiveIntensity: 0.7 + Math.sin(time * 2.1) * 0.1 + Math.sin(time * 3.7) * 0.05,
    });
  });

  const position = CENTRE;
  return (
    <group ref={root} visible={false}>
      <group ref={body}>
        {/* Drawn after her, so she shows through it: depth first, then colour. */}
        <mesh geometry={geometry} material={depth} scale={SCALE} position={position} renderOrder={2} />
        <mesh geometry={geometry} material={spirit} scale={SCALE} position={position} renderOrder={3} />
      </group>
    </group>
  );
}
