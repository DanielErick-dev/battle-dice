"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  SpriteMaterial,
  type Mesh,
  type Sprite,
} from "three";
import { useCanvasTexture } from "../kit/textures";
import { Reticle } from "./Reticle";
import { LOCKED } from "./layout";
import { CRATE, DECK, HAZARD, PAD, SCREEN, SEAMS } from "./textures";
import { useSoftDisc } from "../kit/matchAssets";

const FLOOR_RADIUS = 1.4;

const PAD_RADIUS = 0.46;

const PAD_HEIGHT = 0.035;

const HAZARD_WIDTH = 0.06;

const SEAM = new Color("#5fd8ff");

const CRATES = [
  { x: -0.64, z: -0.56, size: 0.24, turn: 0.35, y: 0 },
  { x: -0.38, z: -0.78, size: 0.18, turn: -0.2, y: 0 },
  { x: -0.62, z: -0.58, size: 0.15, turn: 0.9, y: 0.24 },
];

const PYLONS = [-0.22, 0.22];

const BEACONS = [
  { x: -0.62, y: 0.4, z: -0.58, phase: 0 },
  { x: 0.68, y: 0.56, z: -0.72, phase: 1.3 },
  { x: -0.22, y: 0.74, z: -0.9, phase: 0.6 },
  { x: 0.22, y: 0.74, z: -0.9, phase: 2.1 },
];

const SEAM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SEAM_FRAGMENT = /* glsl */ `
  uniform sampler2D uSeams;
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float seam = texture2D(uSeams, vUv).r;
    float radius = length(vUv * 2.0 - 1.0);
    // A ring of light running outwards through the seams, every few seconds.
    float wave = fract(uTime * 0.3) * 1.15;
    float scan = exp(-pow((radius - wave) / 0.07, 2.0));
    float rim = 1.0 - smoothstep(0.5, 0.95, radius);
    float glow = seam * (0.16 + 1.5 * scan) * rim;
    gl_FragColor = vec4(uColor * glow, glow);
    #include <colorspace_fragment>
  }
`;

/**
 * Unidade Alva's stage instead of the rune pedestal: a launch pad ringed in hazard stripes on a hex-plated deck
 * whose seams pulse with a scan, crates and a terminal behind, beacons, and a target reticle locking on ahead.
 * Origin on the floor.
 */
export function HangarBay() {
  const deck = useCanvasTexture(DECK);
  const seams = useCanvasTexture(SEAMS);
  const pad = useCanvasTexture(PAD);
  const hazard = useCanvasTexture(HAZARD);
  const crate = useCanvasTexture(CRATE);
  const screen = useCanvasTexture(SCREEN);
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      deck: new MeshStandardMaterial({
        map: deck,
        transparent: true,
        roughness: 0.45,
        metalness: 0.6,
        depthWrite: false,
      }),
      seams: new ShaderMaterial({
        uniforms: { uSeams: { value: seams }, uTime: { value: 0 }, uColor: { value: SEAM } },
        vertexShader: SEAM_VERTEX,
        fragmentShader: SEAM_FRAGMENT,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      pad: new MeshStandardMaterial({ map: pad, roughness: 0.35, metalness: 0.75 }),
      padSide: new MeshStandardMaterial({ color: "#3a4250", roughness: 0.4, metalness: 0.8 }),
      hazard: new MeshStandardMaterial({ map: hazard, roughness: 0.6, metalness: 0.2 }),
      crate: new MeshStandardMaterial({ map: crate, roughness: 0.55, metalness: 0.5 }),
      steel: new MeshStandardMaterial({ color: "#8a94a3", roughness: 0.35, metalness: 0.85 }),
      dark: new MeshStandardMaterial({ color: "#1c222c", roughness: 0.5, metalness: 0.6 }),
      screen: new MeshBasicMaterial({ map: screen, color: "#9be8ff", toneMapped: false }),
      strip: new MeshBasicMaterial({ color: SEAM.clone().multiplyScalar(1.6), transparent: true, toneMapped: false }),
      beacon: new SpriteMaterial({
        map: disc,
        color: LOCKED.clone().multiplyScalar(2),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [deck, seams, pad, hazard, crate, screen, disc],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const beacons = useRef<(Sprite | null)[]>([]);
  const scan = useRef<Mesh>(null);
  const strips = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (scan.current) (scan.current.material as ShaderMaterial).uniforms.uTime.value = t;
    screen.offset.setY((t * 0.08) % 1);
    strips.current.forEach((strip) => {
      if (strip) (strip.material as MeshBasicMaterial).opacity = 0.55 + 0.35 * Math.sin(t * 2.2);
    });
    beacons.current.forEach((beacon, index) => {
      if (!beacon) return;
      const on = Math.sin(t * 2.6 + BEACONS[index].phase) > 0.55 ? 1 : 0.15;
      beacon.scale.setScalar(0.07 * on + 0.02);
    });
  });

  return (
    <group>
      <mesh material={materials.deck} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[FLOOR_RADIUS, 64]} />
      </mesh>
      <mesh ref={scan} material={materials.seams} rotation-x={-Math.PI / 2} position-y={0.003} renderOrder={1}>
        <circleGeometry args={[FLOOR_RADIUS, 64]} />
      </mesh>
      {/* Top flush with the floor the figure stands on, its side standing proud of the deck below. */}
      <mesh material={[materials.padSide, materials.pad, materials.padSide]} position-y={-PAD_HEIGHT / 2 + 0.004}>
        <cylinderGeometry args={[PAD_RADIUS, PAD_RADIUS + 0.015, PAD_HEIGHT, 64]} />
      </mesh>
      <mesh material={materials.hazard} rotation-x={-Math.PI / 2} position-y={0.004}>
        <ringGeometry args={[PAD_RADIUS + 0.02, PAD_RADIUS + 0.02 + HAZARD_WIDTH, 96]} />
      </mesh>
      <Reticle />
      {CRATES.map(({ x, z, size, turn, y }) => (
        <mesh key={`${x}:${z}:${y}`} material={materials.crate} position={[x, y + size / 2, z]} rotation-y={turn}>
          <boxGeometry args={[size, size, size]} />
        </mesh>
      ))}
      <group position={[0.62, 0, -0.62]} rotation-y={-0.5}>
        <mesh material={materials.dark} position-y={0.2}>
          <boxGeometry args={[0.18, 0.4, 0.14]} />
        </mesh>
        <mesh material={materials.steel} position-y={0.41}>
          <boxGeometry args={[0.24, 0.03, 0.18]} />
        </mesh>
        <group position={[0, 0.44, 0.02]} rotation-x={-0.6}>
          <mesh material={materials.dark}>
            <boxGeometry args={[0.24, 0.16, 0.015]} />
          </mesh>
          <mesh material={materials.screen} position-z={0.009}>
            <planeGeometry args={[0.21, 0.13]} />
          </mesh>
        </group>
      </group>
      {PYLONS.map((x) => (
        <group key={x} position={[x, 0, -0.9]}>
          <mesh material={materials.steel} position-y={0.36}>
            <boxGeometry args={[0.05, 0.72, 0.05]} />
          </mesh>
          <mesh
            ref={(mesh) => void (strips.current[PYLONS.indexOf(x)] = mesh)}
            material={materials.strip}
            position={[0, 0.36, 0.027]}
          >
            <planeGeometry args={[0.012, 0.6]} />
          </mesh>
          <mesh material={materials.dark} position-y={0.02}>
            <boxGeometry args={[0.1, 0.04, 0.1]} />
          </mesh>
        </group>
      ))}
      {BEACONS.map(({ x, y, z }, index) => (
        <sprite
          key={index}
          ref={(sprite) => void (beacons.current[index] = sprite)}
          material={materials.beacon}
          position={[x, y, z]}
        />
      ))}
    </group>
  );
}
