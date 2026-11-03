"use client";

import { usePropMesh } from "../kit/matchAssets";

/** Meshy exports come out ±1 on their longest side; the garden's soil lies at this height in those units (measured). */
const SOIL = -0.232;
/** Wide enough for him to stand in the middle with the beds and the fence round him. */
const HALF_WIDTH = 1.3;
/** Its front faces -z in the export: turned round so the bucket, flask and sack face the camera as in Meshy's preview. */
const TURN = Math.PI;

/** Vinicius's stage: a fenced vegetable plot (a Meshy model), his ground to hoe. Origin on the floor. */
export function FarmPlot() {
  const garden = usePropMesh("viniciusGarden");
  return (
    <mesh
      geometry={garden.geometry}
      material={garden.material}
      scale={HALF_WIDTH}
      position-y={-SOIL * HALF_WIDTH}
      rotation-y={TURN}
      receiveShadow
    />
  );
}
