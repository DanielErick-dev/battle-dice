"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { IcosahedronGeometry, MeshStandardMaterial, Object3D, type InstancedMesh, type Mesh } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useDisposable, useDisposables } from "../shared/disposal";
import { clamp01 } from "../shared/easing";
import { iceShard } from "../shared/ice";

/** Height the snow climbs to (effects units, a figure 1.9 tall): over the head, then down to the knees. */
const WHOLE = 2.15;
const LEGS = 0.62;
/** Per second the snow climbs up the body, and slides back down it. */
const CLIMB_RATE = 1.6;
const SLIDE_RATE = 1.1;
/** Rings of lumps hugging the body, every this high, and lumps per ring. */
const RING_STEP = 0.11;
const LUMPS_PER_RING = 12;
/** Ice shards jutting out of the snow. */
const SHARDS = 10;

/**
 * Half the body's width at height `y`: slim at the ankles, wider at the hips and the shoulders,
 * narrow at the neck and round over the head. The snow hugs this outline.
 */
function bodyRadius(y: number): number {
  if (y < 0.5) return 0.2 + y * 0.12;
  if (y < 0.95) return 0.26 + (y - 0.5) * 0.15;
  if (y < 1.45) return 0.33 + (y - 0.95) * 0.12;
  if (y < 1.6) return 0.39 - (y - 1.45) * 1.2;
  return 0.2 + Math.sin(Math.min(1, (y - 1.6) / 0.45) * Math.PI) * 0.06;
}

/**
 * The fairy's snow holding a player fast: lumps of packed snow climb up and wrap their whole body,
 * hugging it, ice shards jutting out (`rounds` 2 or more); a round later they slide down and only
 * grip the legs (`rounds` 1); then the snow falls away (0). Each lump settles in as the snow climbs
 * past it. In the token's effects frame (see EFFECT_SCALE).
 */
export function SnowBind({ rounds }: { rounds: number }) {
  const lumps = useMemo(() => {
    const random = seededRandom(83);
    const list: {
      y: number;
      angle: number;
      out: number;
      size: number;
      squash: number;
      spin: number;
    }[] = [];
    for (let y = 0.04; y <= WHOLE; y += RING_STEP) {
      for (let index = 0; index < LUMPS_PER_RING; index++) {
        list.push({
          y: y + (random() - 0.5) * RING_STEP * 0.8,
          angle: ((index + random() * 0.6) / LUMPS_PER_RING) * Math.PI * 2 + y * 2.1,
          // Fat and well out from the body, so no gap shows the figure (or what it holds) through the snow.
          out: 1.08 + random() * 0.22,
          size: 0.13 + random() * 0.08,
          squash: 0.6 + random() * 0.3,
          spin: random() * Math.PI * 2,
        });
      }
    }
    return list;
  }, []);
  const shards = useMemo(() => {
    const random = seededRandom(89);
    return Array.from({ length: SHARDS }, () => ({
      geometry: iceShard(random, 0.18, random() < 0.3),
      y: 0.15 + random() * 1.7,
      angle: random() * Math.PI * 2,
      tilt: 0.5 + random() * 0.6,
      size: 0.16 + random() * 0.14,
    }));
  }, []);
  const lumpGeometry = useDisposable(useMemo(() => new IcosahedronGeometry(1, 1), []));
  const materials = useMemo(
    () => ({
      snow: new MeshStandardMaterial({
        color: "#f2f7fc",
        roughness: 0.95,
        emissive: "#9cc7ee",
        emissiveIntensity: 0.12,
      }),
      ice: new MeshStandardMaterial({
        color: "#d6ecfa",
        emissive: "#2a6fb5",
        emissiveIntensity: 0.25,
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
      }),
    }),
    [],
  );
  useDisposables(materials);
  useDisposables(useMemo(() => shards.map(({ geometry }) => geometry), [shards]));

  const mesh = useRef<InstancedMesh>(null);
  const shardMeshes = useRef<(Mesh | null)[]>([]);
  /** How high the snow has climbed right now. */
  const level = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame(({ clock }, delta) => {
    const target = rounds >= 2 ? WHOLE : rounds === 1 ? LEGS : 0;
    const rate = target > level.current ? CLIMB_RATE : SLIDE_RATE;
    level.current += Math.sign(target - level.current) * Math.min(Math.abs(target - level.current), delta * rate);
    const top = level.current;
    const now = clock.elapsedTime;

    if (mesh.current) {
      mesh.current.visible = top > 0.01;
      lumps.forEach((lump, index) => {
        // A lump packs in as the snow climbs past it, and crumbles as it slides away below it.
        const grown = clamp01((top - lump.y) / 0.18);
        // Not packed in yet: tucked away inside the body, never at zero scale (its normals would turn
        // to NaN, and the bloom would smear that over the whole screen).
        const radius = (bodyRadius(lump.y) * lump.out + lump.size * 0.35) * (0.4 + 0.6 * grown);
        dummy.position.set(Math.cos(lump.angle) * radius, lump.y, Math.sin(lump.angle) * radius);
        dummy.rotation.set(lump.spin, lump.angle, 0);
        const size = Math.max(0.01, lump.size * grown);
        dummy.scale.set(size, size * lump.squash, size);
        dummy.updateMatrix();
        mesh.current!.setMatrixAt(index, dummy.matrix);
      });
      mesh.current.instanceMatrix.needsUpdate = true;
    }
    shards.forEach((shard, index) => {
      const shardMesh = shardMeshes.current[index];
      if (!shardMesh) return;
      const grown = clamp01((top - shard.y) / 0.25);
      shardMesh.visible = grown > 0.02;
      const radius = bodyRadius(shard.y) + 0.06;
      shardMesh.position.set(Math.cos(shard.angle) * radius, shard.y, Math.sin(shard.angle) * radius);
      shardMesh.rotation.set(0, -shard.angle, 0);
      shardMesh.rotateZ(-shard.tilt);
      // A faint shiver, the cold creaking.
      shardMesh.scale.setScalar(Math.max(0.01, shard.size * grown * (1 + Math.sin(now * 7 + index) * 0.02)));
    });
  });

  return (
    <group>
      <instancedMesh
        ref={mesh}
        args={[lumpGeometry, materials.snow, lumps.length]}
        visible={false}
        castShadow
        frustumCulled={false}
      />
      {shards.map(({ geometry }, index) => (
        <mesh
          key={index}
          ref={(shardMesh) => {
            shardMeshes.current[index] = shardMesh;
          }}
          geometry={geometry}
          material={materials.ice}
          visible={false}
        />
      ))}
    </group>
  );
}
