import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { useDisposal } from "../kit/dispose";
import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { drawParchment, pageStrokes } from "../kit/matchAssets";
import { speckle } from "../kit/painting";
import type { Painter } from "../kit/textures";

/** Staggered slabs with dark joints and flecks, fading out towards the rim. */
const paintFlagstones: Painter = (context, size, random) => {
  context.fillStyle = "#16120f";
  context.fillRect(0, 0, size, size);
  const row = 74;
  for (let y = 0; y < size; y += row) {
    const offset = (y / row) % 2 ? row * 0.6 : 0;
    for (let x = -offset; x < size;) {
      const width = row * (0.9 + random() * 0.9);
      const shade = 38 + random() * 22;
      context.fillStyle = `rgb(${shade + 4},${shade},${shade - 4})`;
      context.fillRect(x + 3, y + 3, width - 6, row - 6);
      x += width;
    }
  }
  speckle(context, size, random, {
    count: 3200,
    odds: 0.5,
    colours: ["rgba(10,8,6,0.35)", "rgba(90,84,74,0.25)"],
    spread: 2,
  });
};

/** A crimson carpet with a gold trim between the desks, ink blots and torn pages. */
const SCRIPTORIUM_GROUND: GroundDressing = {
  wash: { colour: "#b91c1c", alpha: 0.25 },
  patches: { colours: ["rgba(10,6,20,0.55)"], count: 10, radius: [8, 22] },
  path: { kind: "runner", colour: "#5a1018", edge: "#b08a3a", width: [0.22, 0.22] },
  litter: [{ shape: "shard", colours: ["rgba(230,215,180,0.9)"], count: 30, size: 7 }],
};
export const paintScriptoriumFloor = withDressing(paintFlagstones, SCRIPTORIUM_GROUND);

/** The scribe's written pages (the match's parchment), three hands to strew about. */
export function useStrewnPages(): CanvasTexture[] {
  const pages = useMemo(
    () =>
      [211, 223, 239].map((seed) => {
        const page = new CanvasTexture(drawParchment(128, 176, seed, pageStrokes(seed)));
        page.colorSpace = SRGBColorSpace;
        return page;
      }),
    [],
  );
  useDisposal(pages);
  return pages;
}
