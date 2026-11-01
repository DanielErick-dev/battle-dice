"use client";

import { MeshBasicMaterial, MeshStandardMaterial } from "three";
import { flaskHeight, FlaskKind } from "./layout";

/** Standing on its origin: a bulb or cone of glass with its liquid inside, the neck stoppered when `cork` is given. */
export function Flask({
  kind,
  size,
  glass,
  liquid,
  cork,
}: {
  kind: FlaskKind;
  size: number;
  glass: MeshStandardMaterial;
  liquid: MeshBasicMaterial;
  cork?: MeshStandardMaterial;
}) {
  const height = flaskHeight({ kind, size });
  if (kind === "tall") {
    return (
      <group>
        <mesh material={liquid} position-y={size * 2}>
          <cylinderGeometry args={[size * 0.82, size * 0.82, size * 4, 12]} />
        </mesh>
        <mesh material={glass} position-y={size * 3}>
          <cylinderGeometry args={[size, size, size * 6, 12]} />
        </mesh>
        {cork && (
          <mesh material={cork} position-y={size * 6.3}>
            <cylinderGeometry args={[size * 0.9, size * 0.75, size * 1.2, 10]} />
          </mesh>
        )}
      </group>
    );
  }
  const neckRadius = size * 0.3;
  const body = kind === "round" ? size * 2 : size * 1.6;
  return (
    <group>
      {kind === "round" ? (
        <>
          {/* The lower part of the bulb, open at the top, capped by the liquid's surface. */}
          <mesh material={liquid} position-y={size}>
            <sphereGeometry args={[size * 0.88, 16, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55]} />
          </mesh>
          <mesh material={liquid} position-y={size * (1 + 0.88 * Math.cos(Math.PI * 0.45))} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[size * 0.88 * Math.sin(Math.PI * 0.45), 16]} />
          </mesh>
          <mesh material={glass} position-y={size}>
            <sphereGeometry args={[size, 18, 12]} />
          </mesh>
        </>
      ) : (
        <>
          <mesh material={liquid} position-y={size * 0.35}>
            <cylinderGeometry args={[size * 0.64, size * 0.92, size * 0.7, 14]} />
          </mesh>
          <mesh material={glass} position-y={size * 0.8}>
            <cylinderGeometry args={[neckRadius, size, body, 16]} />
          </mesh>
        </>
      )}
      <mesh material={glass} position-y={(body + height) / 2}>
        <cylinderGeometry args={[neckRadius, neckRadius * 1.1, height - body, 10]} />
      </mesh>
      {cork && (
        <mesh material={cork} position-y={height + size * 0.15}>
          <cylinderGeometry args={[neckRadius * 1.05, neckRadius * 0.85, size * 0.4, 10]} />
        </mesh>
      )}
    </group>
  );
}
