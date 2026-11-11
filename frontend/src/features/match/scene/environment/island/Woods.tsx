"use client";

import { useEffect, useMemo } from "react";
import { PROP_HEIGHT, usePropMesh, type PropId } from "@/features/characters/core/props";
import { Instances, type Placed } from "../instances";

/** A prop's mesh stood on its base and one unit tall, so an instance's size is its height. */
function useUnitProp(id: PropId) {
  const { geometry, material } = usePropMesh(id);
  const unit = useMemo(() => {
    const copy = geometry.clone();
    copy.computeBoundingBox();
    const box = copy.boundingBox!;
    copy.translate(0, -box.min.y, 0).scale(1 / PROP_HEIGHT, 1 / PROP_HEIGHT, 1 / PROP_HEIGHT);
    return copy;
  }, [geometry]);
  useEffect(() => () => unit.dispose(), [unit]);
  return { geometry: unit, material };
}

/** Pines (PROPS.islandPine) and, here and there, a few pines on a rocky knoll (islandRockyTree). */
export function Woods({ trees, groves }: { trees: readonly Placed[]; groves: readonly Placed[] }) {
  const pine = useUnitProp("islandPine");
  const grove = useUnitProp("islandRockyTree");
  return (
    <group>
      <Instances geometry={pine.geometry} material={pine.material} items={trees} shadows />
      <Instances geometry={grove.geometry} material={grove.material} items={groves} shadows />
    </group>
  );
}
