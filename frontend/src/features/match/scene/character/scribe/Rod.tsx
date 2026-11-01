import type { MeshStandardMaterial } from "three";
import { ROD_RADIUS } from "./introLayout";

export /** A wooden roller across the top or bottom of a sheet, with brass knobs at its ends. */
function Rod({ width, wood, brass }: { width: number; wood: MeshStandardMaterial; brass: MeshStandardMaterial }) {
  const length = width * 1.12;
  return (
    <group rotation-z={Math.PI / 2}>
      <mesh material={wood}>
        <cylinderGeometry args={[ROD_RADIUS, ROD_RADIUS, length, 12]} />
      </mesh>
      {[1, -1].map((end) => (
        <mesh key={end} material={brass} position-y={(end * length) / 2}>
          <sphereGeometry args={[ROD_RADIUS * 1.6, 12, 8]} />
        </mesh>
      ))}
    </group>
  );
}
