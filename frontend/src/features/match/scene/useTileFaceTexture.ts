import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { seededRandom } from "./random";
import type { TileKind, TileTheme } from "./tileTheme";

/** Logical drawing size; the canvas itself may be smaller (see TileFace.resolution). */
const SIZE = 512;
const FONT = "system-ui, sans-serif";

export interface TileFace {
  tileId: number;
  theme: TileTheme;
  /** Path colour at this tile, used for the medallion ring and the arrows. */
  accent: string;
  /** Direction to the next tile in canvas space (0 = right, π/2 = down), or null on the last tile. */
  arrowAngle: number | null;
  /** Texture size in pixels. Big boards use less to keep GPU memory in check. */
  resolution: number;
}

/** Paints the tile face (stone, number, arrows, label) into a texture so it lives in the 3D scene. */
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

/** Tiles that show the path arrows; the others carry their own icon. */
const ARROW_KINDS: ReadonlySet<TileKind> = new Set(["regular", "start", "advance"]);

function paintFace(ctx: CanvasRenderingContext2D, face: TileFace): void {
  const { theme } = face;
  const random = seededRandom(face.tileId * 7919);

  paintStone(ctx, theme.top, random);
  if (theme.kind === "start" || theme.kind === "finish") paintCheckerBand(ctx);
  if (theme.kind === "portal") paintSpiral(ctx, theme.glow);
  if (theme.kind === "trap") paintHazardBorder(ctx, theme.glow);
  if (theme.kind === "advance") paintSpeedLines(ctx, theme.glow, face.arrowAngle ?? 0);
  if (theme.kind === "extraTurn") paintDieIcon(ctx, theme.glow);
  if (theme.kind === "skipTurn") paintPauseIcon(ctx, theme.glow);
  paintBevel(ctx);

  if (face.arrowAngle !== null && ARROW_KINDS.has(theme.kind)) {
    paintArrows(ctx, face.arrowAngle, theme.kind === "regular" ? face.accent : theme.glow);
  }
  paintMedallion(ctx, face.tileId, theme.kind === "regular" ? face.accent : theme.glow);
  if (theme.label) paintLabel(ctx, theme);
}

/** Stone slab: soft light gradient, speckles and a couple of hairline cracks. */
function paintStone(ctx: CanvasRenderingContext2D, color: string, random: () => number) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const light = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  light.addColorStop(0, "rgba(255,255,255,0.10)");
  light.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, SIZE, SIZE);

  for (let i = 0; i < 900; i++) {
    const shade = random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${0.03 + random() * 0.06})`;
    const size = 1 + random() * 3.5;
    ctx.fillRect(random() * SIZE, random() * SIZE, size, size);
  }

  ctx.lineCap = "round";
  for (let crack = 0; crack < 2; crack++) {
    let x = random() * SIZE;
    let y = random() * SIZE;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let segment = 0; segment < 5; segment++) {
      x += (random() - 0.5) * 90;
      y += (random() - 0.5) * 90;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** Fake chamfer: bright top/left edges, dark bottom/right, plus an engraved inner frame. */
function paintBevel(ctx: CanvasRenderingContext2D) {
  const edge = 18;
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(SIZE, 0);
  ctx.lineTo(SIZE - edge, edge);
  ctx.lineTo(edge, edge);
  ctx.lineTo(edge, SIZE - edge);
  ctx.lineTo(0, SIZE);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.moveTo(SIZE, SIZE);
  ctx.lineTo(0, SIZE);
  ctx.lineTo(edge, SIZE - edge);
  ctx.lineTo(SIZE - edge, SIZE - edge);
  ctx.lineTo(SIZE - edge, edge);
  ctx.lineTo(SIZE, 0);
  ctx.fill();

  const inset = 38;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.strokeRect(inset, inset, SIZE - inset * 2, SIZE - inset * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.strokeRect(inset + 3, inset + 3, SIZE - inset * 2, SIZE - inset * 2);
}

/** Number inside a round medallion ringed with the tile's accent colour. */
function paintMedallion(ctx: CanvasRenderingContext2D, tileId: number, accent: string) {
  const cx = 118;
  const cy = 118;
  const radius = 66;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "#0b0c14";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 8;
  ctx.strokeStyle = accent;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${tileId >= 10 ? 62 : 72}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(tileId), cx, cy + 4);
}

/** Two chevrons pointing to the next tile, so the zig-zag path reads at a glance. */
function paintArrows(ctx: CanvasRenderingContext2D, angle: number, color: string) {
  ctx.save();
  ctx.translate(SIZE * 0.6, SIZE * 0.6);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  [-34, 30].forEach((x, i) => {
    ctx.globalAlpha = i === 0 ? 0.3 : 0.55;
    ctx.beginPath();
    ctx.moveTo(x - 26, -44);
    ctx.lineTo(x + 20, 0);
    ctx.lineTo(x - 26, 44);
    ctx.stroke();
  });
  ctx.restore();
}

/** Streaks along the direction of travel. */
function paintSpeedLines(ctx: CanvasRenderingContext2D, color: string, angle: number) {
  ctx.save();
  ctx.translate(SIZE / 2, SIZE / 2);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  const streaks: [number, number, number][] = [
    [-150, -120, 110],
    [-60, -40, 160],
    [30, -150, 90],
    [110, -90, 140],
    [160, -200, 80],
  ];
  for (const [y, x, length] of streaks) {
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Faint die face (five pips) behind the label. */
function paintDieIcon(ctx: CanvasRenderingContext2D, color: string) {
  const size = 200;
  const x = SIZE / 2 - size / 2 + 60;
  const y = SIZE / 2 - size / 2 - 30;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 36);
  ctx.stroke();
  ctx.fillStyle = color;
  for (const [px, py] of [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]]) {
    ctx.beginPath();
    ctx.arc(x + px * size, y + py * size, 17, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Faint pause symbol behind the label. */
function paintPauseIcon(ctx: CanvasRenderingContext2D, color: string) {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(SIZE / 2 - 20, 110, 60, 190, 18);
  ctx.roundRect(SIZE / 2 + 80, 110, 60, 190, 18);
  ctx.fill();
  ctx.restore();
}

function paintCheckerBand(ctx: CanvasRenderingContext2D) {
  const cell = 32;
  const top = SIZE - 190;
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < SIZE / cell; column++) {
      ctx.fillStyle = (row + column) % 2 === 0 ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.28)";
      ctx.fillRect(column * cell, top + row * cell, cell, cell);
    }
  }
}

function paintSpiral(ctx: CanvasRenderingContext2D, color: string) {
  const center = SIZE / 2;
  const glow = ctx.createRadialGradient(center, center, 10, center, center, SIZE * 0.5);
  glow.addColorStop(0, `${color}88`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  for (let arm = 0; arm < 3; arm++) {
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let t = 0; t < 1; t += 0.02) {
      const angle = arm * ((Math.PI * 2) / 3) + t * Math.PI * 2.4;
      const radius = 18 + t * 190;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Diagonal danger stripes around the edge. */
function paintHazardBorder(ctx: CanvasRenderingContext2D, color: string) {
  const band = 34;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, SIZE, SIZE);
  ctx.rect(band, band, SIZE - band * 2, SIZE - band * 2);
  ctx.clip("evenodd");
  ctx.fillStyle = "#12060a";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = color;
  ctx.lineWidth = 16;
  ctx.globalAlpha = 0.8;
  for (let offset = -SIZE; offset < SIZE * 2; offset += 44) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + SIZE, SIZE);
    ctx.stroke();
  }
  ctx.restore();
}

function paintLabel(ctx: CanvasRenderingContext2D, theme: TileTheme) {
  const bottom = theme.caption ? SIZE - 110 : SIZE - 70;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.save();
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 italic 60px ${FONT}`;
  ctx.fillText(theme.label, SIZE / 2, bottom);
  ctx.restore();

  if (theme.caption) {
    ctx.fillStyle = theme.glow;
    ctx.font = `800 38px ${FONT}`;
    ctx.fillText(theme.caption, SIZE / 2, bottom + 52);
  }
}
