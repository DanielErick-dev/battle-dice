"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Object3D,
  type Group,
  type InstancedMesh,
  type Mesh,
} from "three";
import { seededRandom } from "@/game/domain/random";
import { useAge } from "../useAge";

/** How long the burst lasts, from the moment the feet leave the ground. */
const BURST_SECONDS = 2.4;
/** Snowflakes thrown out round her, how far out and how high they fly, and how fast they spin. */
const FLAKES = 140;
const REACH = 1.5;
const LIFT = 2.2;
const SPIN = 1.4;
/** Past 1.0 so the dust and the ring glow through the bloom; the snow kept just under it. */
const DUST = new Color("#8fe9ff").multiplyScalar(2.6);
const SNOW = new Color("#f2fbff").multiplyScalar(1.5);

/**
 * The Crystal Fairy hopping on her own snow (in the token's effect frame, a figure 1.9 tall): as her
 * feet leave the ground, snowflakes burst out round her in a swirl, flying up and out and drifting
 * back down, a cloud of glittering fairy dust and falling snow wraps her, and a ring of frost rolls
 * out over the tile. Mounted with a fresh key per hop, it fades itself out.
 */
export function SnowHopBurst() {
  const flakes = useMemo(() => {
    const random = seededRandom(31);
    return Array.from({ length: FLAKES }, () => ({
      angle: random() * Math.PI * 2,
      reach: 0.35 + random() * REACH,
      lift: 0.4 + random() * LIFT,
      size: 0.6 + random() * 0.9,
      delay: random() * 0.35,
    }));
  }, []);
  const geometry = useMemo(() => new IcosahedronGeometry(0.035, 0), []);
  const materials = useMemo(
    () => ({
      snow: new MeshBasicMaterial({ color: SNOW, transparent: true, depthWrite: false, toneMapped: false }),
      ring: new MeshBasicMaterial({
        color: DUST,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      materials.snow.dispose();
      materials.ring.dispose();
    },
    [geometry, materials],
  );

  const root = useRef<Group>(null);
  const snow = useRef<InstancedMesh>(null);
  const ring = useRef<Mesh>(null);
  const age = useAge();
  const dummy = useMemo(() => new Object3D(), []);

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    const life = t / BURST_SECONDS;
    if (root.current) root.current.visible = life < 1;
    if (life >= 1) return;

    const mesh = snow.current;
    if (mesh) {
      flakes.forEach((flake, index) => {
        const u = Math.max(0, Math.min(1, (t - flake.delay) / (BURST_SECONDS - flake.delay)));
        const out = 1 - (1 - u) ** 3;
        // Up and out fast, then drifting down as they spread, swirling round her.
        const angle = flake.angle + u * SPIN * Math.PI;
        const height = flake.lift * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) - u * u * flake.lift * 0.6;
        dummy.position.set(Math.cos(angle) * flake.reach * out, 0.2 + height, Math.sin(angle) * flake.reach * out);
        dummy.rotation.set(u * 9 + index, u * 7, 0);
        dummy.scale.setScalar(u <= 0 ? 0 : flake.size * (1 - u ** 3));
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (ring.current) ring.current.scale.setScalar(0.3 + (1 - (1 - Math.min(1, life * 2)) ** 3) * 2.2);
    materials.ring.setValues({ opacity: 0.85 * Math.max(0, 1 - life * 2) });
    materials.snow.setValues({ opacity: 1 - life ** 4 });
  });

  return (
    <group ref={root}>
      <instancedMesh ref={snow} args={[geometry, materials.snow, FLAKES]} frustumCulled={false} />
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.04} material={materials.ring}>
        <ringGeometry args={[0.45, 0.6, 48]} />
      </mesh>
      <Sparkles count={120} scale={[2.6, 2.6, 2.6]} position-y={1.1} size={7} speed={1.4} noise={1.2} color={DUST} />
      <Sparkles count={90} scale={[2.2, 2.8, 2.2]} position-y={1.2} size={4.5} speed={0.8} color={SNOW} />
    </group>
  );
}
