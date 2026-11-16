"use client";

import { RoundedBox, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, type Group } from "three";
import { useFittedProp } from "@/features/characters/core/props";
import { TILE_HEIGHT } from "@/features/shared/board/boardLayout";

const CHEST_WIDTH = 1.35;
/** Above this share of its height a triangle belongs to the lid. */
const LID_SPLIT = 0.62;
const OPEN_ANGLE = -1.9;
/** Centred on the tile (the user's call, to try it out). */
const CORNER: [number, number] = [0, 0];

/** Splits a prop's triangles into body and lid by height (the export is one mesh). */
function splitLid(geometry: BufferGeometry, cut: number): { body: BufferGeometry; lid: BufferGeometry } {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const parts = { body: [] as number[], lid: [] as number[] };
  const position = flat.getAttribute("position");
  for (let triangle = 0; triangle < position.count / 3; triangle++) {
    const y = (position.getY(triangle * 3) + position.getY(triangle * 3 + 1) + position.getY(triangle * 3 + 2)) / 3;
    (y > cut ? parts.lid : parts.body).push(triangle);
  }
  const pick = (triangles: number[]) => {
    const part = new BufferGeometry();
    for (const [name, attribute] of Object.entries(flat.attributes)) {
      const size = attribute.itemSize;
      const data = new Float32Array(triangles.length * 3 * size);
      triangles.forEach((triangle, index) => {
        for (let corner = 0; corner < 3; corner++)
          for (let k = 0; k < size; k++)
            data[(index * 3 + corner) * size + k] = attribute.array[(triangle * 3 + corner) * size + k] ?? 0;
      });
      part.setAttribute(name, new BufferAttribute(data, size));
    }
    return part;
  };
  flat.dispose();
  return { body: pick(parts.body), lid: pick(parts.lid) };
}

/** A gem chest (Meshy) on a card tile: its lid swings open and a card rises out when someone stops there. */
export function CardChest({ color, open, heading }: { color: string; open: boolean; heading: number }) {
  const chest = useFittedProp("cardChest");
  const [, , depth] = chest.size;
  const scale = CHEST_WIDTH / chest.size[0];
  const { body, lid } = useMemo(() => splitLid(chest.geometry, LID_SPLIT), [chest.geometry]);
  useEffect(
    () => () => {
      body.dispose();
      lid.dispose();
    },
    [body, lid],
  );
  const hinge = useRef<Group>(null);
  const card = useRef<Group>(null);
  const opening = useRef(0);
  useFrame(({ clock }, delta) => {
    opening.current += ((open ? 1 : 0) - opening.current) * Math.min(1, delta * (open ? 6 : 3));
    if (hinge.current) hinge.current.rotation.x = OPEN_ANGLE * opening.current;
    if (card.current) {
      card.current.visible = opening.current > 0.05;
      card.current.position.y = 0.5 + opening.current * 1.2 + Math.sin(clock.elapsedTime * 2) * 0.04;
      card.current.rotation.y += delta * 1.4;
    }
  });
  const hingeZ = -depth / 2;
  return (
    <group position={[CORNER[0], TILE_HEIGHT / 2, CORNER[1]]} rotation-y={-heading}>
      <group scale={scale}>
        <mesh geometry={body} material={chest.material} castShadow />
        <group ref={hinge} position={[0, LID_SPLIT, hingeZ]}>
          <mesh geometry={lid} material={chest.material} position={[0, -LID_SPLIT, -hingeZ]} castShadow />
        </group>
      </group>
      <group ref={card}>
        <RoundedBox args={[0.42, 0.6, 0.02]} radius={0.03} smoothness={2}>
          <meshStandardMaterial color="#fdf2f8" emissive={color} emissiveIntensity={1.6} />
        </RoundedBox>
      </group>
      <Sparkles count={10} scale={[0.8, 0.8, 0.8]} position-y={0.45} size={2.5} speed={0.6} color={color} />
    </group>
  );
}
