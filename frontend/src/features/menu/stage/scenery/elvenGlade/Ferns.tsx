"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BufferAttribute, DoubleSide, PlaneGeometry, type Group } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useCanvasTexture } from "../kit/textures";
import { paintFrond } from "./textures";

const FERNS = [
  { x: -0.68, z: -0.48, size: 1 },
  { x: -0.78, z: 0.1, size: 0.75 },
  { x: 0.32, z: -0.9, size: 0.9 },
  { x: 0.8, z: -0.08, size: 0.7 },
];

const FRONDS = 7;

export function Ferns() {
  const texture = useCanvasTexture({ size: 128, height: 384, draw: paintFrond, seed: 61 });
  const geometry = useMemo(() => {
    const result = new PlaneGeometry(0.1, 0.34, 1, 8);
    result.translate(0, 0.17, 0);
    // Arched: the frond curls over further the farther out it reaches.
    const position = result.getAttribute("position") as BufferAttribute;
    for (let index = 0; index < position.count; index++) {
      const along = position.getY(index) / 0.34;
      position.setZ(index, along * along * 0.12);
    }
    result.computeVertexNormals();
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const ferns = useRef<(Group | null)[]>([]);
  const fronds = useMemo(() => {
    const random = seededRandom(59);
    return FERNS.map(() =>
      Array.from({ length: FRONDS }, (_, index) => ({
        turn: (index / FRONDS) * Math.PI * 2 + random() * 0.5,
        tilt: 0.45 + random() * 0.5,
        size: 0.75 + random() * 0.4,
      })),
    );
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ferns.current.forEach((fern, index) => {
      if (!fern) return;
      fern.rotation.z = 0.04 * Math.sin(t * 0.9 + index * 1.7);
      fern.rotation.x = 0.03 * Math.sin(t * 0.7 + index);
    });
  });

  return (
    <>
      {FERNS.map(({ x, z, size }, fern) => (
        <group
          key={`${x}:${z}`}
          ref={(group) => {
            ferns.current[fern] = group;
          }}
          position={[x, 0, z]}
          scale={size}
        >
          {fronds[fern].map(({ turn, tilt, size: frond }, index) => (
            <group key={index} rotation-y={turn}>
              <mesh geometry={geometry} rotation-x={tilt} scale={frond}>
                <meshStandardMaterial map={texture} alphaTest={0.4} side={DoubleSide} roughness={0.9} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </>
  );
}
