"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineBasicMaterial,
  Vector3,
  type LineSegments,
  type PointLight,
  DoubleSide,
  MeshBasicMaterial,
  ShaderMaterial,
  SpriteMaterial,
  type Mesh,
  type Sprite,
} from "three";
import { uniform } from "@/features/shared/three/uniform";
import { FIGURE_HEIGHT } from "../../layout";
import { useSoftDisc } from "../kit/matchAssets";
import { POWER_OFF_SECONDS, powerAt } from "./layout";

const SURGE = new Color("#5fd8ff");
/** The floor shockwaves: when (seconds after power-on), from the pad out to OUTER_RADIUS over RING_SECONDS. */
const WAVES = [0, 0.42, 0.9];
const RING_SECONDS = 0.9;
const INNER_RADIUS = 0.45;
const OUTER_RADIUS = 1.4;
/** The column of power climbing her body: how long it takes to fade after power-on. */
const COLUMN_SECONDS = 2.4;
const COLUMN_RADIUS = 0.38;
/** Sparks thrown up round the pad. */
const SPARK_COUNT = 40;
const SPARK_SECONDS = 1.6;
/** Lightning crawling from the pad up her body: how many bolts, how jagged, how often they re-strike, for how long. */
const ARC_COUNT = 8;
const ARC_STEPS = 9;
const ARC_RESTRIKE_SECONDS = 0.05;
const ARC_SECONDS = 2.6;
/** A blue light flaring on her chest with each jolt. */
const FLARE_INTENSITY = 9;
const FLARE_SECONDS = 2.8;
/** Once powered she keeps crackling: a short spark across her body every so often, and a faint chest glow. */
const CRACKLE_GAP = { min: 0.8, max: 3.2 };
const CRACKLE_SECONDS = 0.16;
const IDLE_FLARE = 0.9;

const COLUMN_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Bands of light racing up the column, brightest at the base and gone at the top.
const COLUMN_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uStrength;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float bands = pow(0.5 + 0.5 * sin((vUv.y * 5.0 - uTime * 3.0) * 6.2832), 4.0);
    float fade = (1.0 - vUv.y) * (1.0 - vUv.y);
    float glow = uStrength * fade * (0.6 + 2.2 * bands);
    gl_FragColor = vec4(uColor * glow, glow);
    #include <colorspace_fragment>
  }
`;

/** Where each spark starts on the pad's rim and how it flies. */
const SPARKS = Array.from({ length: SPARK_COUNT }, (_, index) => {
  const angle = (index / SPARK_COUNT) * Math.PI * 2 + (index % 3) * 0.4;
  return {
    angle,
    rise: 0.7 + ((index * 7) % 6) * 0.16,
    delay: ((index * 5) % 11) * 0.08,
    drift: 0.1 + (index % 4) * 0.05,
  };
});

/** The jolt of power as Unidade Alva lifts her head: shockwaves across the deck, a column up her body, sparks. */
export function PowerSurge({ introSeconds }: { introSeconds: () => number | null }) {
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      column: new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uStrength: { value: 0 }, uColor: { value: SURGE } },
        vertexShader: COLUMN_VERTEX,
        fragmentShader: COLUMN_FRAGMENT,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
      rings: WAVES.map(
        () =>
          new MeshBasicMaterial({
            color: SURGE.clone().multiplyScalar(2),
            transparent: true,
            opacity: 0,
            blending: AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
      sparks: SPARKS.map(
        () =>
          new SpriteMaterial({
            map: disc,
            color: SURGE.clone().multiplyScalar(2.5),
            transparent: true,
            opacity: 0,
            blending: AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
      arcs: new LineBasicMaterial({
        color: SURGE.clone().lerp(new Color("#ffffff"), 0.5).multiplyScalar(2.5),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    }),
    [disc],
  );
  const arcGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(ARC_COUNT * ARC_STEPS * 2 * 3), 3));
    return geometry;
  }, []);
  useEffect(() => () => arcGeometry.dispose(), [arcGeometry]);
  useEffect(
    () => () => {
      materials.column.dispose();
      materials.arcs.dispose();
      [...materials.rings, ...materials.sparks].forEach((material) => material.dispose());
    },
    [materials],
  );
  const column = useRef<Mesh>(null);
  const rings = useRef<(Mesh | null)[]>([]);
  const sparks = useRef<(Sprite | null)[]>([]);
  const arcs = useRef<LineSegments>(null);
  const flare = useRef<PointLight>(null);
  const struckAt = useRef(-1);
  /** When her next idle crackle comes, and when the current one ends. */
  const crackle = useRef({ next: ARC_SECONDS + 0.6, until: -1 });

  useFrame(({ clock }) => {
    const since = (introSeconds() ?? 0) - POWER_OFF_SECONDS;
    if (column.current) {
      const material = column.current.material as ShaderMaterial;
      uniform(material, "uTime").value = clock.elapsedTime;
      // Follows the lights' stutter, swells as they hold, then dies down to nothing.
      const decay = since < 0 ? 0 : Math.max(0, 1 - since / COLUMN_SECONDS);
      uniform(material, "uStrength").value = since < 0 ? 0 : (0.4 + powerAt(since + POWER_OFF_SECONDS)) * decay;
      column.current.visible = since >= 0 && decay > 0;
    }
    WAVES.forEach((at, index) => {
      const ring = rings.current[index];
      if (!ring) return;
      const progress = (since - at) / RING_SECONDS;
      ring.visible = progress >= 0 && progress < 1;
      if (!ring.visible) return;
      ring.scale.setScalar(INNER_RADIUS + (OUTER_RADIUS - INNER_RADIUS) * Math.sqrt(progress));
      (ring.material as MeshBasicMaterial).opacity = (1 - progress) * 0.9;
    });
    // A jolt follows the lights' stutter, then fades out as they settle.
    const jolt = since < 0 ? 0 : (0.35 + powerAt(since + POWER_OFF_SECONDS)) * Math.max(0, 1 - since / FLARE_SECONDS);
    const settled = since >= ARC_SECONDS;
    // Settled, the chest glow breathes unevenly (two slow waves out of step).
    const idle = settled ? IDLE_FLARE * (0.6 + 0.25 * Math.sin(since * 1.3) + 0.15 * Math.sin(since * 3.7 + 1)) : 0;
    if (flare.current) flare.current.intensity = Math.max(FLARE_INTENSITY * jolt, idle);
    if (arcs.current) {
      const material = arcs.current.material as LineBasicMaterial;
      if (!settled) {
        const live = since >= 0;
        arcs.current.visible = live;
        if (live) {
          material.opacity = Math.min(1, 1.4 * jolt + 0.2 * Math.random());
          if (since - struckAt.current > ARC_RESTRIKE_SECONDS || since < struckAt.current) {
            struckAt.current = since;
            strike(arcGeometry, ARC_COUNT, false);
          }
        }
      } else {
        const state = crackle.current;
        if (since >= state.next) {
          state.until = since + CRACKLE_SECONDS;
          state.next = since + CRACKLE_GAP.min + Math.random() * (CRACKLE_GAP.max - CRACKLE_GAP.min);
          strike(arcGeometry, 1 + Math.floor(Math.random() * 2), true);
        }
        arcs.current.visible = since < state.until;
        material.opacity = 0.5 + 0.5 * Math.random();
      }
    }
    SPARKS.forEach(({ angle, rise, delay, drift }, index) => {
      const spark = sparks.current[index];
      if (!spark) return;
      const progress = (since - delay) / SPARK_SECONDS;
      spark.visible = progress >= 0 && progress < 1;
      if (!spark.visible) return;
      const radius = INNER_RADIUS - drift * progress;
      spark.position.set(
        Math.cos(angle) * radius,
        0.05 + rise * FIGURE_HEIGHT * 0.6 * progress,
        Math.sin(angle) * radius,
      );
      spark.scale.setScalar(0.06 * (1 - progress) + 0.015);
      spark.material.opacity = 1 - progress;
    });
  });

  return (
    <group>
      <pointLight ref={flare} position-y={FIGURE_HEIGHT * 0.6} color={SURGE} distance={3} decay={1.5} intensity={0} />
      <lineSegments ref={arcs} geometry={arcGeometry} material={materials.arcs} visible={false} />
      <mesh ref={column} material={materials.column} position-y={(FIGURE_HEIGHT * 1.15) / 2} visible={false}>
        <cylinderGeometry args={[COLUMN_RADIUS * 0.8, COLUMN_RADIUS, FIGURE_HEIGHT * 1.15, 40, 1, true]} />
      </mesh>
      {materials.rings.map((material, index) => (
        <mesh
          key={index}
          ref={(mesh) => void (rings.current[index] = mesh)}
          material={material}
          rotation-x={-Math.PI / 2}
          position-y={0.01}
          visible={false}
        >
          <ringGeometry args={[0.94, 1, 64]} />
        </mesh>
      ))}
      {materials.sparks.map((material, index) => (
        <sprite
          key={index}
          ref={(sprite) => void (sparks.current[index] = sprite)}
          material={material}
          visible={false}
        />
      ))}
    </group>
  );
}

/** Fresh jagged bolts: `count` of them from the pad's rim up her body, or (`onBody`) short ones across it. */
function strike(geometry: BufferGeometry, count: number, onBody: boolean): void {
  const positions = geometry.getAttribute("position") as BufferAttribute;
  const out = positions.array as Float32Array;
  let at = 0;
  const point = new Vector3();
  const previous = new Vector3();
  const jitter = new Vector3();
  out.fill(0);
  for (let arc = 0; arc < count; arc++) {
    const angle = Math.random() * Math.PI * 2;
    const from = onBody
      ? new Vector3(Math.cos(angle) * 0.2, FIGURE_HEIGHT * (0.3 + Math.random() * 0.5), Math.sin(angle) * 0.2)
      : new Vector3(Math.cos(angle) * INNER_RADIUS, 0.02, Math.sin(angle) * INNER_RADIUS);
    const reach = 0.15 + Math.random() * 0.1;
    const to = new Vector3(
      Math.cos(angle + 0.5) * reach,
      onBody ? from.y + (Math.random() - 0.5) * 0.4 : FIGURE_HEIGHT * (0.2 + Math.random() * 0.65),
      Math.sin(angle + 0.5) * reach,
    );
    previous.copy(from);
    for (let step = 1; step <= ARC_STEPS; step++) {
      point.lerpVectors(from, to, step / ARC_STEPS);
      if (step < ARC_STEPS) {
        point.add(
          jitter
            .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
            .multiplyScalar(onBody ? 0.06 : 0.12),
        );
      }
      out.set([previous.x, previous.y, previous.z, point.x, point.y, point.z], at);
      at += 6;
      previous.copy(point);
    }
  }
  positions.needsUpdate = true;
}
