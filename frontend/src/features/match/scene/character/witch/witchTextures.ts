import type { CanvasTexture } from "three";
import { beamTexture } from "../shared/beamTexture";
import { useCanvasTexture } from "../shared/canvas";
import { radialDisc } from "../shared/softDisc";

const lightColumn = () =>
  beamTexture({
    midStop: 0.5,
    midAlpha: 0.45,
    streakEvery: 8,
    streakWidth: () => 3,
    streakAlpha: 0.25,
    streakAlphaStep: 0.1,
  });
const mote = () => radialDisc(64, 0.35, 0.5);

/** Vertical fade for the levitation's beams: bright at the bottom, gone at the top, softly streaked. */
export function useLightColumnTexture(): CanvasTexture {
  return useCanvasTexture(lightColumn);
}

/** A soft round dot, so points read as glowing embers rather than squares. */
export function useMoteTexture(): CanvasTexture {
  return useCanvasTexture(mote);
}
