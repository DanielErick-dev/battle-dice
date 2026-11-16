"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, MeshStandardMaterial, ShaderMaterial, type Group, type Mesh } from "three";
import { useCanvasTexture } from "@/features/shared/three/canvasTexture";
import { Reticle } from "./Reticle";
import { PowerUp } from "./PowerUp";
import type { SceneryProps } from "../types";
import { DECK, HAZARD, PAD, SEAMS } from "./textures";
import { preloadProps, useFittedProp } from "../kit/matchAssets";
import { uniform } from "@/features/shared/three/uniform";

const FLOOR_RADIUS = 1.4;

const PAD_RADIUS = 0.46;

const PAD_HEIGHT = 0.035;

const HAZARD_WIDTH = 0.06;

const SEAM = new Color("#5fd8ff");

preloadProps(["hangarReactor", "hangarGenerator", "hangarCapsule", "hangarRack", "hangarCore", "hangarDrone"]);

/** Meshy machines round the back of the bay: where, how tall and which way each faces. */
type Machine = "hangarReactor" | "hangarGenerator" | "hangarCapsule" | "hangarRack" | "hangarCore";

const MACHINES: readonly { prop: Machine; x: number; z: number; height: number; turn: number }[] = [
  { prop: "hangarReactor", x: -0.95, z: -0.72, height: 1.15, turn: 0.55 },
  { prop: "hangarGenerator", x: 0.92, z: -0.68, height: 0.5, turn: -0.65 },
  { prop: "hangarCapsule", x: -0.34, z: -1.05, height: 0.72, turn: 0.15 },
  { prop: "hangarRack", x: 0.34, z: -1.05, height: 0.72, turn: -0.15 },
  { prop: "hangarCore", x: -1.08, z: 0.08, height: 0.34, turn: 1.1 },
];

/** The sentinel drone hovering over the bay's right side. */
const DRONE = { x: 0.88, y: 1.05, z: -0.3, height: 0.36 };

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
  uniform float uPower;
  varying vec2 vUv;
  void main() {
    float seam = texture2D(uSeams, vUv).r;
    float radius = length(vUv * 2.0 - 1.0);
    // A ring of light running outwards through the seams, every few seconds.
    float wave = fract(uTime * 0.3) * 1.15;
    float scan = exp(-pow((radius - wave) / 0.07, 2.0));
    float rim = 1.0 - smoothstep(0.5, 0.95, radius);
    float glow = seam * (0.16 + 1.5 * scan) * rim * uPower;
    gl_FragColor = vec4(uColor * glow, glow);
    #include <colorspace_fragment>
  }
`;

/** Unidade Alva's stage in place of the rune pedestal; origin on the floor. */
export function HangarBay({ intro, setLights, introSeconds }: SceneryProps) {
  const deck = useCanvasTexture(DECK);
  const seams = useCanvasTexture(SEAMS);
  const pad = useCanvasTexture(PAD);
  const hazard = useCanvasTexture(HAZARD);
  const machines: Record<Machine, ReturnType<typeof useFittedProp>> = {
    hangarReactor: useFittedProp("hangarReactor"),
    hangarGenerator: useFittedProp("hangarGenerator"),
    hangarCapsule: useFittedProp("hangarCapsule"),
    hangarRack: useFittedProp("hangarRack"),
    hangarCore: useFittedProp("hangarCore"),
  };
  const drone = useFittedProp("hangarDrone");
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
        uniforms: { uSeams: { value: seams }, uTime: { value: 0 }, uPower: { value: 0 }, uColor: { value: SEAM } },
        vertexShader: SEAM_VERTEX,
        fragmentShader: SEAM_FRAGMENT,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      pad: new MeshStandardMaterial({ map: pad, roughness: 0.35, metalness: 0.75 }),
      padSide: new MeshStandardMaterial({ color: "#3a4250", roughness: 0.4, metalness: 0.8 }),
      hazard: new MeshStandardMaterial({ map: hazard, roughness: 0.6, metalness: 0.2 }),
    }),
    [deck, seams, pad, hazard],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const scan = useRef<Mesh>(null);
  /** 0 while she is switched off, 1 once powered up (see PowerUp). */
  const power = useRef(0);
  const onPower = useCallback((level: number) => void (power.current = level), []);
  const hover = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (scan.current) {
      const material = scan.current.material as ShaderMaterial;
      uniform(material, "uTime").value = t;
      // The seams stay dark until the bay powers up.
      uniform(material, "uPower").value = power.current;
    }
    if (hover.current) {
      hover.current.position.y = DRONE.y + Math.sin(t * 1.3) * 0.05;
      hover.current.rotation.y = -0.6 + Math.sin(t * 0.4) * 0.35;
    }
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
      <PowerUp key={intro} setLights={setLights} introSeconds={introSeconds} onPower={onPower} />
      {MACHINES.map(({ prop, x, z, height, turn }) => (
        <mesh
          key={prop}
          geometry={machines[prop].geometry}
          material={machines[prop].material}
          position={[x, 0, z]}
          rotation-y={turn}
          scale={height}
          castShadow
        />
      ))}
      <group ref={hover} position={[DRONE.x, DRONE.y, DRONE.z]}>
        <mesh geometry={drone.geometry} material={drone.material} position-y={-DRONE.height / 2} scale={DRONE.height} />
      </group>
    </group>
  );
}
