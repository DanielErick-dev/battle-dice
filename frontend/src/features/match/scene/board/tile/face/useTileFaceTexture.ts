import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { SIZE, type TileFace } from "./canvas";
import { engrave, paintNumber } from "./carving";
import { runePath } from "./rune";
import { paintEmberCracks, paintShattered, paintStone } from "./stone";

export type { TileFace } from "./canvas";

/** Paints a road slab's face (see TileMesh), laid along the way, into a texture so it lives in the 3D scene. */
export function useTileFaceTexture({ tileId, theme, accent, arrowAngle, resolution }: TileFace): CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(resolution / SIZE, resolution / SIZE);
      paintFace(ctx, { tileId, theme, accent, arrowAngle, resolution });
    }

    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.anisotropy = 8;
    return result;
  }, [tileId, theme, accent, arrowAngle, resolution]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function paintFace(ctx: CanvasRenderingContext2D, face: TileFace): void {
  const { theme } = face;
  const random = seededRandom(face.tileId * 7919);
  const glow = theme.kind === "regular" ? face.accent : theme.glow;

  paintStone(ctx, random, theme.kind === "regular" ? null : theme.glow);
  if (theme.kind === "trapZone") paintEmberCracks(ctx, random);
  if (theme.kind === "destroyed") paintShattered(ctx, theme.glow, random);
  engrave(ctx, glow, theme.kind === "regular" ? 0.55 : 1, () => runePath(ctx, face));
  paintNumber(ctx, theme.badge ?? String(face.tileId), glow);
}
