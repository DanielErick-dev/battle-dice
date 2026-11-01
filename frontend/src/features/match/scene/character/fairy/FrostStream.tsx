"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  Color,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Object3D,
  QuadraticBezierCurve3,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
} from "three";
import { seededRandom } from "@/game/domain/core/random";
import { DEFAULT_TIMINGS } from "../../../config";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../../boardLayout";
import { useAge } from "../../useAge";
import { additiveMaterial } from "../shared/additive";
import { useDisposable, useDisposables } from "../shared/disposal";
import { easeOutCubic } from "../shared/easing";

/** Snowflakes and fairy dust in the stream, and how long the first takes to reach the tile. */
const FLAKES = 200;
const TRAVEL_SECONDS = 1.5;
/** The last flakes leave the wand this long after the first. */
const SPREAD_SECONDS = 0.5;
/** How wide the stream swirls round its path at its widest (midway), and how fast it turns. */
const SWIRL = 0.42;
const SWIRL_TURNS = 2.5;
/** The arc's rise over the straight line, for every unit of distance. */
const ARC = 0.3;
/** The puff of snow where it lands, as the tile is enchanted (DEFAULT_TIMINGS.frostStreamMs). */
const PUFF_SECONDS = DEFAULT_TIMINGS.frostStreamMs / 1000 - TRAVEL_SECONDS;
/** Past 1.0 so the dust glows through the bloom; the snow kept just under it. */
const DUST = new Color("#9be7ff").multiplyScalar(2.4);
const SNOW = new Color("#f2fbff").multiplyScalar(1.6);

/**
 * Fairy Bloom's snow, in world space: a swirling stream of snowflakes and glittering dust leaves the
 * wand's tip (`from`, where it was as she cast) and arcs to the tile she's enchanting, landing in a
 * puff as the tile goes white. Timed like the playback (DEFAULT_TIMINGS.frostStreamMs); mounted with
 * a fresh key per tile, it fades itself out.
 */
export function FrostStream({ from, to }: { from: Vector3; to: Vec3 }) {
  const curve = useMemo(() => {
    const start = from.clone();
    const end = new Vector3(to[0], to[1] + TILE_HEIGHT / 2 + 0.15, to[2]);
    const mid = start.clone().lerp(end, 0.5);
    mid.y += 0.6 + start.distanceTo(end) * ARC;
    return new QuadraticBezierCurve3(start, mid, end);
    // Only where the wand was as the stream left it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);
  const flakes = useMemo(() => {
    const random = seededRandom(Math.round(curve.v2.x * 97 + curve.v2.z * 13));
    return Array.from({ length: FLAKES }, (_, index) => ({
      delay: (index / FLAKES) * SPREAD_SECONDS,
      phase: random() * Math.PI * 2,
      reach: 0.3 + random() * 0.7,
      size: 0.5 + random() * 0.8,
      dust: index % 3 === 0,
    }));
  }, [curve]);
  const geometry = useDisposable(useMemo(() => new IcosahedronGeometry(0.045, 0), []));
  const materials = useMemo(
    () => ({
      snow: new MeshBasicMaterial({ color: SNOW, transparent: true, depthWrite: false, toneMapped: false }),
      dust: additiveMaterial({ color: DUST }),
      puff: additiveMaterial({ color: DUST }),
    }),
    [],
  );
  useDisposables(materials);

  const snow = useRef<InstancedMesh>(null);
  const dust = useRef<InstancedMesh>(null);
  const head = useRef<Group>(null);
  const puff = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const age = useAge();
  const scratch = useMemo(
    () => ({
      point: new Vector3(),
      tangent: new Vector3(),
      side: new Vector3(),
      up: new Vector3(),
      dummy: new Object3D(),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    const { point, tangent, side, up, dummy } = scratch;
    let snowCount = 0;
    let dustCount = 0;
    for (const flake of flakes) {
      const u = (t - flake.delay) / TRAVEL_SECONDS;
      const mesh = flake.dust ? dust.current : snow.current;
      if (!mesh || u <= 0 || u >= 1) continue;
      curve.getPoint(u, point);
      curve.getTangent(u, tangent);
      side.crossVectors(tangent, Object3D.DEFAULT_UP).normalize();
      up.crossVectors(side, tangent).normalize();
      // Swirling round the path, widest midway, narrowing to the wand and to the tile.
      const radius = Math.sin(u * Math.PI) * SWIRL * flake.reach;
      const angle = flake.phase + u * SWIRL_TURNS * Math.PI * 2;
      dummy.position
        .copy(point)
        .addScaledVector(side, Math.cos(angle) * radius)
        .addScaledVector(up, Math.sin(angle) * radius);
      dummy.rotation.set(angle, angle * 0.7, 0);
      dummy.scale.setScalar(flake.size * (1 - u * 0.4));
      dummy.updateMatrix();
      mesh.setMatrixAt(flake.dust ? dustCount++ : snowCount++, dummy.matrix);
    }
    for (const [mesh, count] of [
      [snow.current, snowCount],
      [dust.current, dustCount],
    ] as const) {
      if (!mesh) continue;
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
    // The glittering head leads the stream.
    if (head.current) {
      const u = Math.min(1, t / TRAVEL_SECONDS);
      head.current.visible = u < 1;
      curve.getPoint(u, head.current.position);
    }
    // The puff where it lands.
    const landed = (t - TRAVEL_SECONDS) / PUFF_SECONDS;
    if (puff.current) puff.current.visible = landed > 0 && landed < 1;
    if (landed > 0 && landed < 1) {
      ring.current?.scale.setScalar(0.3 + easeOutCubic(landed) * 1.2);
      materials.puff.opacity = 0.8 * (1 - landed);
    }
    materials.snow.opacity = t < TRAVEL_SECONDS + SPREAD_SECONDS ? 0.95 : 0;
    materials.dust.opacity = materials.snow.opacity;
  });

  return (
    <group>
      <instancedMesh ref={snow} args={[geometry, materials.snow, FLAKES]} frustumCulled={false} />
      <instancedMesh ref={dust} args={[geometry, materials.dust, FLAKES]} frustumCulled={false} />
      <group ref={head}>
        <Sparkles count={60} scale={0.8} size={6} speed={1.2} color="#eafaff" />
      </group>
      <group ref={puff} position={curve.v2} visible={false}>
        <mesh ref={ring} rotation-x={-Math.PI / 2} material={materials.puff}>
          <ringGeometry args={[TILE_SIZE * 0.3, TILE_SIZE * 0.42, 40]} />
        </mesh>
        <Sparkles
          count={80}
          scale={[TILE_SIZE, 1.2, TILE_SIZE]}
          position-y={0.5}
          size={5}
          speed={0.8}
          color="#eafaff"
        />
      </group>
    </group>
  );
}
