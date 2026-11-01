"use client";

import { useEffect, useMemo } from "react";
import { Color, DoubleSide } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { grassTuft, scatterAround } from "../kit/geometry";

const TUFTS = 12;

/** Teal grass poking through the snow, frosted white at the tips. */
export function FrostTufts() {
  const { variants, tufts } = useMemo(() => {
    const random = seededRandom(97);
    const root = new Color("#2c6b66");
    const tip = new Color("#e6fbff");
    const variants = [0, 1].map(() => grassTuft(random, 7, 0.1, root, tip));
    const tufts = scatterAround(random, TUFTS, 0.3, 0.9).map(([x, z], index) => ({
      x,
      z,
      variant: index % variants.length,
      size: 0.7 + random() * 0.6,
      turn: random() * Math.PI * 2,
    }));
    return { variants, tufts };
  }, []);
  useEffect(() => () => variants.forEach((variant) => variant.dispose()), [variants]);

  return (
    <>
      {tufts.map(({ x, z, variant, size, turn }, index) => (
        <mesh key={index} geometry={variants[variant]} position={[x, 0, z]} rotation-y={turn} scale={size}>
          <meshStandardMaterial vertexColors side={DoubleSide} roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}
