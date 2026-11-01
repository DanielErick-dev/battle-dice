"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  Vector2,
  Vector3,
  type Mesh,
} from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useSoftDisc } from "../kit/matchAssets";

/** Seconds between lightning strikes; each strike flickers a few times. */
const STRIKE_EVERY = 6.5;

const FLICKERS = [
  { at: 0, length: 0.08 },
  { at: 0.16, length: 0.06 },
  { at: 0.34, length: 0.12 },
];

const BOLT = new Color("#fff6c8").multiplyScalar(2);

/** Bolts far behind the terrace, dark until a strike flickers one of them on, the clouds lit round it. */
export function Lightning() {
  const disc = useSoftDisc();
  const bolts = useMemo(() => [boltGeometry(157, 0.38, -0.5), boltGeometry(163, -0.42, 0.45)], []);
  useEffect(() => () => bolts.forEach((bolt) => bolt.dispose()), [bolts]);
  const materials = useMemo(
    () => ({
      bolt: new MeshBasicMaterial({
        color: BOLT,
        transparent: true,
        opacity: 0,
        side: DoubleSide,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      sky: new MeshBasicMaterial({
        map: disc,
        color: "#fde68a",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    }),
    [disc],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const meshes = useRef<(Mesh | null)[]>([]);
  const glow = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const strike = Math.floor(t / STRIKE_EVERY);
    const since = t - strike * STRIKE_EVERY;
    const flash = FLICKERS.reduce(
      (most, { at, length }) => Math.max(most, since >= at && since < at + length ? 1 - (since - at) / length / 2 : 0),
      0,
    );
    const which = strike % bolts.length;
    meshes.current.forEach((mesh, index) => {
      if (mesh) mesh.visible = index === which && flash > 0;
    });
    materials.bolt.setValues({ opacity: flash });
    materials.sky.setValues({ opacity: flash * 0.35 });
    glow.current?.position.set(which ? -0.4 : 0.4, 2.1, -1.5);
  });

  return (
    <>
      <mesh ref={glow} material={materials.sky} scale={[1.6, 1.1, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {bolts.map((geometry, index) => (
        <mesh
          key={index}
          ref={(mesh) => void (meshes.current[index] = mesh)}
          geometry={geometry}
          material={materials.bolt}
          visible={false}
        />
      ))}
    </>
  );
}

/**
 * A jagged bolt with a fork, as a flat ribbon facing the camera, from high in the sky at `x` down towards the
 * horizon behind the terrace; `drift` is how far sideways it wanders on the way.
 */
function boltGeometry(seed: number, x: number, drift: number): BufferGeometry {
  const random = seededRandom(seed);
  const positions: number[] = [];
  const ribbon = (points: Vector3[], width: number) => {
    // Each point's own sideways offset from its neighbours, so the segments join without gaps.
    const edges = points.map((point, index) => {
      const ahead = points[Math.min(index + 1, points.length - 1)];
      const behind = points[Math.max(index - 1, 0)];
      const across = new Vector2(ahead.y - behind.y, behind.x - ahead.x)
        .normalize()
        .multiplyScalar(width * (1 - index / points.length));
      return [
        [point.x - across.x, point.y - across.y, point.z],
        [point.x + across.x, point.y + across.y, point.z],
      ];
    });
    for (let index = 0; index < edges.length - 1; index++) {
      const [a, b] = edges[index];
      const [c, d] = edges[index + 1];
      positions.push(...a, ...b, ...d, ...a, ...d, ...c);
    }
  };
  const path = (from: Vector3, steps: number, length: number, lean: number) =>
    Array.from({ length: steps + 1 }, (_, index) => {
      const along = index / steps;
      const kink = index && index < steps ? (random() - 0.5) * 0.12 : 0;
      return new Vector3(from.x + lean * along + kink, from.y - length * along, from.z);
    });
  const main = path(new Vector3(x, 2.7, -1.6), 9, 1.4, drift * 0.4);
  ribbon(main, 0.012);
  const fork = main[4];
  ribbon(path(fork.clone(), 5, 0.55, drift * 0.5), 0.007);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
}
