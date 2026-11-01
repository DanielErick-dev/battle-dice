"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  DoubleSide,
  MeshStandardMaterial,
  PlaneGeometry,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector3,
  type Mesh,
} from "three";

/** Prayer flags strung from a pole on his left to the bell frame, in their five colours. */
const FLAG_LINE = { from: new Vector3(-0.78, 0.98, -0.3), to: new Vector3(0.36, 0.86, -0.72), sag: 0.12 };

const FLAG_COLOURS = ["#2563eb", "#f8fafc", "#dc2626", "#16a34a", "#facc15"];

const FLAGS = 10;

/** A sagging cord of small flags in the five colours, each fluttering on its own. */
export function PrayerFlags({ rope, wood }: { rope: MeshStandardMaterial; wood: MeshStandardMaterial }) {
  const { cord, flag, flags } = useMemo(() => {
    const middle = FLAG_LINE.from.clone().lerp(FLAG_LINE.to, 0.5);
    middle.y -= FLAG_LINE.sag * 2;
    const curve = new QuadraticBezierCurve3(FLAG_LINE.from, middle, FLAG_LINE.to);
    const cord = new TubeGeometry(curve, 24, 0.0025, 4, false);
    const flag = new PlaneGeometry(0.06, 0.075, 2, 1);
    // Hung from its top edge.
    flag.translate(0, -0.0375, 0);
    const along = FLAG_LINE.to.clone().sub(FLAG_LINE.from);
    const heading = Math.atan2(-along.z, along.x);
    const flags = Array.from({ length: FLAGS }, (_, index) => ({
      at: curve.getPoint((index + 0.75) / (FLAGS + 0.5)),
      colour: FLAG_COLOURS[index % FLAG_COLOURS.length],
      heading,
    }));
    return { cord, flag, flags };
  }, []);
  useEffect(
    () => () => {
      cord.dispose();
      flag.dispose();
    },
    [cord, flag],
  );
  const pieces = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    pieces.current.forEach((piece, index) => {
      if (!piece) return;
      piece.rotation.x = -0.25 - 0.2 * Math.sin(t * 2.2 + index * 0.9) - 0.08 * Math.sin(t * 5.3 + index);
      piece.rotation.y = 0.12 * Math.sin(t * 1.7 + index * 1.3);
    });
  });

  return (
    <>
      <mesh geometry={cord} material={rope} />
      <mesh material={wood} position={[FLAG_LINE.from.x, FLAG_LINE.from.y / 2, FLAG_LINE.from.z]}>
        <cylinderGeometry args={[0.012, 0.016, FLAG_LINE.from.y, 6]} />
      </mesh>
      {flags.map(({ at, colour, heading }, index) => (
        <group key={index} position={at} rotation-y={heading}>
          <mesh geometry={flag} ref={(mesh) => void (pieces.current[index] = mesh)}>
            <meshStandardMaterial color={colour} roughness={0.9} side={DoubleSide} />
          </mesh>
        </group>
      ))}
    </>
  );
}
