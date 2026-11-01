import type { MeshBasicMaterial } from "three";
import { TILE_SIZE } from "../../boardLayout";

/** A target's sights on the tile: a ring with four ticks pointing in, lying flat. */
export function Sight({ material }: { material: MeshBasicMaterial }) {
  return (
    <group rotation-x={-Math.PI / 2}>
      <mesh material={material}>
        <ringGeometry args={[TILE_SIZE * 0.42, TILE_SIZE * 0.47, 48]} />
      </mesh>
      {[0, 1, 2, 3].map((quarter) => (
        <mesh
          key={quarter}
          material={material}
          rotation-z={(quarter * Math.PI) / 2}
          position={[
            Math.cos((quarter * Math.PI) / 2) * TILE_SIZE * 0.36,
            Math.sin((quarter * Math.PI) / 2) * TILE_SIZE * 0.36,
            0,
          ]}
        >
          <planeGeometry args={[TILE_SIZE * 0.16, 0.06]} />
        </mesh>
      ))}
    </group>
  );
}
