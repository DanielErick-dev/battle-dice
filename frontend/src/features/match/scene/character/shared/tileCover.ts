import { useMemo } from "react";
import type { BufferGeometry } from "three";
import { slabBody, type SlabOutline } from "../../slab";
import { useDisposable } from "./disposal";

/** The snow cover: a slab a little thicker than a lifted tile rises, so nothing of the tile shows. */
export const COVER_HEIGHT = 0.12;
export const COVER_Y = COVER_HEIGHT / 2 - 0.02;
/** How far a cover reaches past its slab's edge, so nothing of the slab shows. */
export const COVER_GROW = 0.06;

/** A cover in the shape of the slab under it, a little bigger: from y = 0 up to COVER_HEIGHT. */
export function useCoverGeometry(outline: SlabOutline): BufferGeometry {
  const key = outline.map(([x, z]) => `${x.toFixed(3)},${z.toFixed(3)}`).join(";");
  // The key stands for the outline.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useDisposable(useMemo(() => slabBody(outline, COVER_HEIGHT, 0.04, COVER_GROW), [key]));
}
