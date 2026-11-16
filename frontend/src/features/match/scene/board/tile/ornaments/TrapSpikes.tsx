"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { ConeGeometry, CylinderGeometry, Matrix4, MeshStandardMaterial, type Group, type InstancedMesh } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { TILE_HEIGHT, TILE_SIZE } from "@/features/shared/board/boardLayout";

/** A grid of spikes across the slab, jittered so it doesn't read as a pattern. */
const ROWS = 5;
const SPAN = TILE_SIZE * 0.72;
/** Spike height at rest (always visible) and how far they shoot up when someone steps in. */
const SPIKE_HEIGHT = 0.32;
const SPRUNG_SCALE = 2.4;
const GROW_RATE = 16;
const SETTLE_RATE = 3;

/** A trap tile's bed of iron spikes with bloodied tips: they shoot up when someone steps in. */
export function TrapSpikes({ sprung, heading }: { sprung: boolean; heading: number }) {
  const bed = useRef<Group>(null);
  const shafts = useRef<InstancedMesh>(null);
  const tips = useRef<InstancedMesh>(null);
  const plates = useRef<InstancedMesh>(null);
  const parts = useMemo(
    () => ({
      shaft: new ConeGeometry(0.055, SPIKE_HEIGHT, 6).translate(0, SPIKE_HEIGHT / 2, 0),
      tip: new ConeGeometry(0.024, SPIKE_HEIGHT * 0.3, 6).translate(0, SPIKE_HEIGHT * 0.85, 0),
      plate: new CylinderGeometry(0.075, 0.085, 0.03, 6).translate(0, 0.015, 0),
      iron: new MeshStandardMaterial({ color: "#4b5563", metalness: 0.8, roughness: 0.35 }),
      blood: new MeshStandardMaterial({
        color: "#b91c1c",
        emissive: "#7f1d1d",
        emissiveIntensity: 0.8,
        roughness: 0.4,
      }),
    }),
    [],
  );
  useEffect(
    () => () =>
      Object.values(parts).forEach((part) => {
        part.dispose();
      }),
    [parts],
  );
  const spots = useMemo(() => {
    const random = seededRandom(31);
    const step = SPAN / (ROWS - 1);
    return Array.from({ length: ROWS * ROWS }, (_, index) => {
      const x = -SPAN / 2 + (index % ROWS) * step + (random() - 0.5) * step * 0.4;
      const z = -SPAN / 2 + Math.floor(index / ROWS) * step + (random() - 0.5) * step * 0.4;
      return { x, z, scale: 0.8 + random() * 0.45 };
    });
  }, []);
  useEffect(() => {
    const matrix = new Matrix4();
    spots.forEach(({ x, z, scale }, index) => {
      matrix.makeScale(scale, scale, scale).setPosition(x, 0, z);
      shafts.current?.setMatrixAt(index, matrix);
      tips.current?.setMatrixAt(index, matrix);
      matrix.makeTranslation(x, 0, z);
      plates.current?.setMatrixAt(index, matrix);
    });
    if (shafts.current) shafts.current.instanceMatrix.needsUpdate = true;
    if (tips.current) tips.current.instanceMatrix.needsUpdate = true;
    if (plates.current) plates.current.instanceMatrix.needsUpdate = true;
  }, [spots]);

  const lift = useRef(1);
  useFrame((_, delta) => {
    const target = sprung ? SPRUNG_SCALE : 1;
    const rate = sprung ? GROW_RATE : SETTLE_RATE;
    lift.current += (target - lift.current) * Math.min(1, delta * rate);
    if (bed.current) bed.current.scale.y = lift.current;
  });
  return (
    <group position-y={TILE_HEIGHT / 2} rotation-y={-heading}>
      <group ref={bed}>
        <instancedMesh ref={shafts} args={[parts.shaft, parts.iron, spots.length]} castShadow />
        <instancedMesh ref={tips} args={[parts.tip, parts.blood, spots.length]} />
      </group>
      <instancedMesh ref={plates} args={[parts.plate, parts.iron, spots.length]} />
    </group>
  );
}
