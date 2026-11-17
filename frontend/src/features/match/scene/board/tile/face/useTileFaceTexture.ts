import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { SIZE, type TileFace } from "./canvas";
import { engrave, paintNumber } from "./carving";
import { runePath } from "./rune";
import { paintEmberCracks, paintShattered, paintStone } from "./stone";

/** Paints a road slab's face (see TileMesh), laid along the way, into a texture so it lives in the 3D scene. */
export function useTileFaceTexture({
  tileId,
  theme,
  accent,
  arrowAngle,
  resolution,
  bare,
  runeless,
  numberless,
}: TileFace): CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(resolution / SIZE, resolution / SIZE);
      paintFace(ctx, { tileId, theme, accent, arrowAngle, resolution, bare, runeless, numberless });
    }

    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.anisotropy = 8;
    return result;
  }, [tileId, theme, accent, arrowAngle, resolution, bare, runeless, numberless]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function paintFace(ctx: CanvasRenderingContext2D, face: TileFace): void {
  const { theme } = face;
  const random = seededRandom(face.tileId * 7919);
  const glow = theme.kind === "regular" ? face.accent : theme.glow;

  // Floated over a modelled slab there's no stone to crack: only the rune (if any) and the number.
  if (!face.bare) {
    paintStone(ctx, random, theme.kind === "regular" ? null : theme.glow);
    if (theme.kind === "trapZone") paintEmberCracks(ctx, random);
    if (theme.kind === "destroyed") paintShattered(ctx, theme.glow, random);
  }
  if (!face.runeless) engrave(ctx, glow, theme.kind === "regular" ? 0.55 : 1, () => runePath(ctx, face));
  if (!face.numberless) paintNumber(ctx, theme.badge ?? String(face.tileId), glow, face.bare);
}
