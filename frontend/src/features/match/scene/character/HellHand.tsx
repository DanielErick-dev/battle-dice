"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  MeshStandardMaterial,
  Plane,
  ShaderMaterial,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import { DEFAULT_TIMINGS } from "../../config";
import { useAge } from "../useAge";

/** Seconds the hand takes to come up and close, then to sink back with its prey (see the drag timings). */
const GRAB_SECONDS = DEFAULT_TIMINGS.dragGrabMs / 1000;
const SINK_SECONDS = DEFAULT_TIMINGS.dragSinkMs / 1000;
/** After the sink, the crack glows on a little, then seals. */
const SEAL_SECONDS = 0.9;

/**
 * The hand, in the effects' units (a figure stands 1.9 tall in them): the palm stands behind the
 * figure facing it, and its fingers reach higher than the head before curling over it.
 */
const PALM = { width: 1.15, height: 1.05, depth: 0.32, behind: 0.5 };
/** Phalanx lengths (base to tip) and thickness of the four fingers, from the index out. */
const FINGERS = [
  { x: -0.4, lengths: [0.48, 0.36, 0.28], radius: 0.12 },
  { x: -0.13, lengths: [0.52, 0.4, 0.3], radius: 0.125 },
  { x: 0.14, lengths: [0.5, 0.38, 0.29], radius: 0.12 },
  { x: 0.4, lengths: [0.4, 0.3, 0.24], radius: 0.105 },
];
const THUMB = { lengths: [0.42, 0.34], radius: 0.13 };
/** The thumb's tilt off the palm's side, splayed out and swung in across the front. */
const THUMB_OPEN = -0.6;
const THUMB_CLOSED = 0.5;
/** How far each joint bends once the fist is closed (radians), from the knuckle out. */
const CURL = [1.0, 1.1, 0.9];
/** Below the ground at the start (and the end), out of sight. */
const SUNK_Y = -3.4;
/** Up, the palm's base stays a little under the ground, as if the arm went on down into hell. */
const RISEN_Y = -0.25;
const CRACK_RADIUS = 1.5;

const CRACK_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CRACK_FRAGMENT = /* glsl */ `
  uniform float uOpen;
  uniform float uTime;
  varying vec2 vUv;

  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);
    // Jagged rays out of the centre, each wandering a little as it goes, reaching further as it opens.
    float rays = 9.0;
    float wander = (noise(r * 6.0 + a * 3.0) - 0.5) * 0.35;
    float ray = abs(fract((a + wander) / 6.2831853 * rays) - 0.5) * 2.0;
    float width = 0.06 * (1.0 - r);
    float line = 1.0 - smoothstep(width * 0.4, width, 1.0 - ray);
    float reach = uOpen * (0.65 + 0.35 * noise(floor((a + wander) / 6.2831853 * rays) * 7.0));
    line *= step(r, reach);
    // The pit at the centre, glowing from below.
    float pit = 1.0 - smoothstep(0.0, 0.38 * uOpen, r);
    float flicker = 0.8 + 0.2 * sin(uTime * 13.0 + r * 20.0);
    float glow = max(line, pit) * flicker;
    vec3 color = mix(vec3(1.0, 0.18, 0.02), vec3(1.0, 0.75, 0.3), pit * 0.6) * 2.4;
    gl_FragColor = vec4(color, glow * smoothstep(1.0, 0.85, r));
  }
`;

/**
 * Hell's Drag on the board: the ground cracks open under the victim, glowing like a furnace; a
 * huge charred hand with burning veins rises out of it behind them, its fingers curl over them, and
 * it sinks back into the crack with them in its fist; then the crack seals. Placed on the victim's
 * tile (`groundY`: the top of it, where the hand is cut off so it seems to come out of the floor)
 * in the token effects' scale (the canvas needs `localClippingEnabled`). Mounted fresh with every drag.
 */
export function HellHand({ groundY }: { groundY: number }) {
  const root = useRef<Group>(null);
  const hand = useRef<Group>(null);
  const joints = useRef<(Group | null)[]>([]);
  const thumb = useRef<(Group | null)[]>([]);
  const thumbBase = useRef<Group>(null);
  const crack = useRef<Mesh>(null);
  const palm = useRef<Mesh>(null);
  const embers = useRef<Group>(null);
  const floor = useMemo(() => new Plane(new Vector3(0, 1, 0), -groundY), [groundY]);
  const skin = useMemo(() => burningSkin(floor), [floor]);
  const claw = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#0a0303",
        emissive: new Color("#ff3010"),
        emissiveIntensity: 0.6,
        roughness: 0.35,
        clippingPlanes: [floor],
      }),
    [floor],
  );
  const crackMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: CRACK_VERTEX,
        fragmentShader: CRACK_FRAGMENT,
        uniforms: { uOpen: { value: 0 }, uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      skin.dispose();
      claw.dispose();
      crackMaterial.dispose();
    },
    [skin, claw, crackMaterial],
  );
  const age = useAge();

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    const end = GRAB_SECONDS + SINK_SECONDS + SEAL_SECONDS;
    if (root.current) root.current.visible = t < end;
    if (t >= end) return;
    const ramp = (from: number, seconds: number) => Math.min(1, Math.max(0, (t - from) / seconds));

    // Rises fast, slows as it towers over them; closes; then drags down, slow then all at once.
    const rise = 1 - (1 - ramp(GRAB_SECONDS * 0.15, GRAB_SECONDS * 0.45)) ** 3;
    const close = smooth(ramp(GRAB_SECONDS * 0.6, GRAB_SECONDS * 0.35));
    const sink = ramp(GRAB_SECONDS, SINK_SECONDS) ** 2;
    if (hand.current) {
      hand.current.position.y = SUNK_Y + (RISEN_Y - SUNK_Y) * rise - (RISEN_Y - SUNK_Y + 0.6) * sink;
      // A tremor as it heaves.
      hand.current.position.x = Math.sin(t * 31) * 0.02 * (rise - sink);
      // Leaning in over them as it closes.
      hand.current.rotation.x = 0.12 * close;
    }
    joints.current.forEach((joint, index) => {
      if (joint) joint.rotation.x = CURL[index % CURL.length] * close;
    });
    // The thumb swings in across the front, then folds over.
    if (thumbBase.current) thumbBase.current.rotation.z = THUMB_OPEN + (THUMB_CLOSED - THUMB_OPEN) * close;
    thumb.current.forEach((joint, depth) => {
      if (joint) joint.rotation.x = CURL[depth + 1] * close;
    });
    const palmSkin = palm.current?.material as MeshStandardMaterial | undefined;
    if (palmSkin) palmSkin.userData.uniforms.uTime.value = t;

    const open = smooth(ramp(0, GRAB_SECONDS * 0.25)) * (1 - ramp(GRAB_SECONDS + SINK_SECONDS, SEAL_SECONDS));
    const crackGlow = crack.current?.material as ShaderMaterial | undefined;
    if (crackGlow) {
      crackGlow.uniforms.uOpen.value = open;
      crackGlow.uniforms.uTime.value = t;
    }
    if (embers.current) embers.current.visible = open > 0.05;
  });

  return (
    <group ref={root}>
      <mesh ref={crack} rotation-x={-Math.PI / 2} position-y={0.04} material={crackMaterial}>
        <planeGeometry args={[CRACK_RADIUS * 2, CRACK_RADIUS * 2]} />
      </mesh>
      <group ref={embers}>
        <Sparkles count={40} scale={[2.2, 2.6, 2.2]} position-y={1.3} size={7} speed={2.2} color="#ff4a1a" />
      </group>
      <group ref={hand} position-y={SUNK_Y}>
        <group position-z={-PALM.behind}>
          <mesh ref={palm} material={skin} position-y={PALM.height / 2}>
            <boxGeometry args={[PALM.width, PALM.height, PALM.depth, 4, 4, 2]} />
          </mesh>
          {/* The wrist, running on down into the crack. */}
          <mesh material={skin} position-y={-0.9}>
            <cylinderGeometry args={[0.38, 0.46, 1.8, 12]} />
          </mesh>
          {FINGERS.map((finger, fingerIndex) => (
            <group key={fingerIndex} position={[finger.x, PALM.height, 0]}>
              <Finger
                lengths={finger.lengths}
                radius={finger.radius}
                skin={skin}
                claw={claw}
                onJoint={(depth, joint) => (joints.current[fingerIndex * 3 + depth] = joint)}
              />
            </group>
          ))}
          {/* The thumb, off the palm's side, folding in across the front. */}
          <group ref={thumbBase} position={[PALM.width / 2, PALM.height * 0.3, 0.05]} rotation-z={THUMB_OPEN}>
            <Finger
              lengths={THUMB.lengths}
              radius={THUMB.radius}
              skin={skin}
              claw={claw}
              onJoint={(depth, joint) => (thumb.current[depth] = joint)}
            />
          </group>
        </group>
      </group>
    </group>
  );
}

/** A finger of joints nested in each other (`depth` 0 at the knuckle), each bending towards +z, with a claw at its tip. */
function Finger({
  lengths,
  radius,
  skin,
  claw,
  depth = 0,
  onJoint,
}: {
  lengths: readonly number[];
  radius: number;
  skin: MeshStandardMaterial;
  claw: MeshStandardMaterial;
  depth?: number;
  onJoint: (depth: number, joint: Group | null) => void;
}) {
  const [length, ...rest] = lengths;
  return (
    <group ref={(joint) => onJoint(depth, joint)}>
      <mesh material={skin} position-y={length / 2}>
        <capsuleGeometry args={[radius, length, 4, 10]} />
      </mesh>
      <group position-y={length}>
        {rest.length > 0 ? (
          <Finger lengths={rest} radius={radius * 0.88} skin={skin} claw={claw} depth={depth + 1} onJoint={onJoint} />
        ) : (
          <mesh material={claw} position-y={radius * 0.9} rotation-x={0.35}>
            <coneGeometry args={[radius * 0.75, radius * 3, 8]} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/**
 * Charred skin, nearly black, split by veins of fire that pulse (in object space, so they stay put
 * on the hand as it moves), and an ember rim where it turns from the view. Cut off at `floor`.
 */
function burningSkin(floor: Plane): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: "#140806",
    roughness: 0.95,
    clippingPlanes: [floor],
  });
  const uniforms = { uTime: { value: 0 } };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying vec3 vLocal;\nvoid main() {")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n  vLocal = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform float uTime;\nvarying vec3 vLocal;\nvoid main() {")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        vec3 q = vLocal * 7.0;
        float veins = abs(sin(q.x * 1.3 + sin(q.y * 1.7) * 1.6) * sin(q.z * 1.1 + sin(q.x * 1.9) * 1.4 + q.y * 0.8));
        float vein = 1.0 - smoothstep(0.0, 0.09, veins);
        float pulse = 0.75 + 0.25 * sin(uTime * 6.0 + vLocal.y * 9.0);
        float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
        totalEmissiveRadiance += vec3(1.0, 0.22, 0.04) * (vein * 2.2 * pulse + pow(1.0 - facing, 3.0) * 0.8);`,
      );
  };
  material.customProgramCacheKey = () => "hell-hand-skin";
  return material;
}

function smooth(x: number): number {
  return x * x * (3 - 2 * x);
}
