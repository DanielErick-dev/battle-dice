"use client";

import { useFittedProp } from "@/features/characters/core/props";
import { LANDMARKS, type LandmarkSpot } from "./landmarks";

/** The landmarks of the characters in the match, each on its own spot (see planLandmarks). */
export function Landmarks({ spots }: { spots: readonly LandmarkSpot[] }) {
  return spots.map((spot) => <Landmark key={spot.character} spot={spot} />);
}

function Landmark({ spot }: { spot: LandmarkSpot }) {
  const { prop, height } = LANDMARKS[spot.character];
  const model = useFittedProp(prop);
  return (
    <mesh
      geometry={model.geometry}
      material={model.material}
      position={[spot.x, spot.y - 0.05, spot.z]}
      rotation-y={spot.turn}
      scale={height}
      castShadow
      receiveShadow
    />
  );
}
