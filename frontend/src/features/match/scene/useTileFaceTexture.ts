import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { seededRandom } from "@/game/domain/core/random";
import type { TileTheme } from "./tileTheme";

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

const CENTER = SIZE / 2;
/** The engraved rune's reach from the middle. */
const RUNE = 120;
/** Natural stone tones; each tile picks one, so the trail doesn't read as copies. */
const STONES = ["#77727d", "#6f6a62", "#7d756a", "#686775", "#736b70"];

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

/** A flagstone of the road: lit from the far left, moss in its cracks and edges, a worn rim. */
function paintStone(ctx: CanvasRenderingContext2D, random: () => number, rim: string | null) {
  ctx.save();
  ctx.fillStyle = STONES[Math.floor(random() * STONES.length)];
  ctx.fillRect(0, 0, SIZE, SIZE);
  const light = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  light.addColorStop(0, "rgba(255,255,255,0.14)");
  light.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 1400; i++) {
    const shade = random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${0.03 + random() * 0.07})`;
    const size = 1 + random() * 4;
    ctx.fillRect(random() * SIZE, random() * SIZE, size, size);
  }
  // Moss creeping in from the edges, where feet don't wear it off.
  for (let clump = 0; clump < 9; clump++) {
    const side = Math.floor(random() * 4);
    const along = random() * SIZE;
    const [x, y] = [
      [along, 8],
      [SIZE - 8, along],
      [along, SIZE - 8],
      [8, along],
    ][side];
    const r = 26 + random() * 46;
    const moss = ctx.createRadialGradient(x, y, 0, x, y, r);
    moss.addColorStop(0, "rgba(74,112,60,0.7)");
    moss.addColorStop(1, "rgba(74,112,60,0)");
    ctx.fillStyle = moss;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.lineCap = "round";
  for (let crack = 0; crack < 2; crack++) {
    let [x, y] = [random() * SIZE, random() < 0.5 ? 0 : SIZE];
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let segment = 0; segment < 4; segment++) {
      x += (random() - 0.5) * 80;
      y += (CENTER - y) * 0.3 + (random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // The worn rim, darker towards the joints; a thin glowing line inside it on slabs with a power.
  const edge = ctx.createRadialGradient(CENTER, CENTER, CENTER * 0.6, CENTER, CENTER, CENTER * 1.25);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, SIZE, SIZE);
  if (rim) {
    ctx.shadowColor = rim;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = rim;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(46, 46, SIZE - 92, SIZE - 92, 40);
    ctx.stroke();
  }
  ctx.restore();
}

/** Cut into the stone: a dark groove a little offset, then the rune's glowing line in it. */
function engrave(ctx: CanvasRenderingContext2D, color: string, strength: number, trace: () => void) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.translate(3, 4);
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 20;
  trace();
  ctx.translate(-3, -4);
  ctx.globalAlpha = strength;
  ctx.shadowColor = color;
  ctx.shadowBlur = 26;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 13;
  trace();
  ctx.restore();
}

/** Strokes (and fills, for pips) the tile's rune in the current style. */
function runePath(ctx: CanvasRenderingContext2D, { theme, arrowAngle }: TileFace) {
  const dot = (x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const line = (points: [number, number][], closed = false) => {
    ctx.beginPath();
    points.forEach(([x, y], index) =>
      index === 0 ? ctx.moveTo(CENTER + x, CENTER + y) : ctx.lineTo(CENTER + x, CENTER + y),
    );
    if (closed) ctx.closePath();
    ctx.stroke();
  };
  const chevrons = (count: number, size: number) => {
    ctx.save();
    ctx.translate(CENTER, CENTER);
    ctx.rotate(arrowAngle ?? 0);
    for (let index = 0; index < count; index++) {
      const x = (index - (count - 1) / 2) * size * 0.9;
      ctx.beginPath();
      ctx.moveTo(x - size * 0.4, -size * 0.7);
      ctx.lineTo(x + size * 0.4, 0);
      ctx.lineTo(x - size * 0.4, size * 0.7);
      ctx.stroke();
    }
    ctx.restore();
  };
  switch (theme.kind) {
    case "regular":
    case "trapZone":
    case "destroyed":
      if (arrowAngle !== null) chevrons(1, 70);
      return;
    case "advance":
      chevrons(3, 80);
      return;
    case "start":
      // A banner on its pole.
      line([
        [-60, 110],
        [-60, -110],
      ]);
      line(
        [
          [-60, -110],
          [80, -70],
          [-60, -20],
        ],
        true,
      );
      return;
    case "finish":
      starPath(ctx, 5, RUNE, RUNE * 0.45);
      return;
    case "portal":
      for (let arm = 0; arm < 3; arm++) {
        ctx.beginPath();
        for (let t = 0; t <= 1; t += 0.02) {
          const angle = arm * ((Math.PI * 2) / 3) + t * Math.PI * 2.2;
          const radius = 12 + t * RUNE;
          const [x, y] = [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius];
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      return;
    case "trap":
      // Three spikes over a jagged line.
      line([
        [-110, 70],
        [-75, -60],
        [-40, 70],
        [0, -100],
        [40, 70],
        [75, -60],
        [110, 70],
      ]);
      return;
    case "extraTurn":
      ctx.beginPath();
      ctx.roundRect(CENTER - 95, CENTER - 95, 190, 190, 30);
      ctx.stroke();
      for (const [x, y] of [
        [-48, -48],
        [48, -48],
        [0, 0],
        [-48, 48],
        [48, 48],
      ])
        dot(CENTER + x, CENTER + y, 16);
      return;
    case "skipTurn":
      line(
        [
          [-75, -110],
          [75, -110],
          [-75, 110],
          [75, 110],
        ],
        true,
      );
      return;
    case "card":
      for (const [angle, dx] of [
        [-0.25, -38],
        [0.2, 42],
      ]) {
        ctx.save();
        ctx.translate(CENTER + dx, CENTER);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.roundRect(-60, -90, 120, 180, 16);
        ctx.stroke();
        ctx.restore();
      }
      return;
    case "curse":
      // An evil eye.
      ctx.beginPath();
      ctx.moveTo(CENTER - 125, CENTER);
      ctx.quadraticCurveTo(CENTER, CENTER - 120, CENTER + 125, CENTER);
      ctx.quadraticCurveTo(CENTER, CENTER + 120, CENTER - 125, CENTER);
      ctx.stroke();
      line([
        [0, -42],
        [0, 42],
      ]);
      return;
    case "blessing":
      if (theme.label === "ENERGIA")
        line(
          [
            [25, -120],
            [-55, 15],
            [10, 15],
            [-25, 120],
            [55, -15],
            [-10, -15],
          ],
          true,
        );
      else if (theme.label === "HABILIDADE") starPath(ctx, 4, RUNE, RUNE * 0.3);
      else {
        dot(CENTER, CENTER, 42);
        for (let ray = 0; ray < 8; ray++) {
          const angle = (ray / 8) * Math.PI * 2;
          line([
            [Math.cos(angle) * 70, Math.sin(angle) * 70],
            [Math.cos(angle) * RUNE, Math.sin(angle) * RUNE],
          ]);
        }
      }
      return;
  }
}

function starPath(ctx: CanvasRenderingContext2D, points: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let index = 0; index <= points * 2; index++) {
    const angle = (index / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const radius = index % 2 === 0 ? outer : inner;
    const [x, y] = [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius];
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

/** The tile's number, small, carved near the slab's left edge (the way runs left to right on the face). */
function paintNumber(ctx: CanvasRenderingContext2D, text: string, accent: string) {
  const [cx, cy, radius] = [CENTER, 74, 40];
  ctx.save();
  ctx.fillStyle = "rgba(10,10,18,0.78)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${text.length > 2 ? 34 : 42}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + 2, radius * 1.7);
  ctx.restore();
}

/** Faint red-hot fissures: the ground of a trap zone, the same unease on every one of its tiles. */
function paintEmberCracks(ctx: CanvasRenderingContext2D, random: () => number) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "#ff3b1f";
  ctx.shadowBlur = 14;
  for (let crack = 0; crack < 4; crack++) {
    let x = SIZE * (0.15 + random() * 0.7);
    let y = SIZE * (0.15 + random() * 0.7);
    ctx.strokeStyle = `rgba(255, ${70 + Math.floor(random() * 50)}, 30, ${0.35 + random() * 0.2})`;
    ctx.lineWidth = 2 + random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let segment = 0; segment < 6; segment++) {
      x += (random() - 0.5) * 110;
      y += (random() - 0.5) * 110;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A smashed slab: chunks broken out of it and deep cracks with a faint glow in them. */
function paintShattered(ctx: CanvasRenderingContext2D, glow: string, random: () => number) {
  ctx.save();
  // Holes where chunks broke away.
  for (let hole = 0; hole < 5; hole++) {
    const cx = SIZE * (0.15 + random() * 0.7);
    const cy = SIZE * (0.15 + random() * 0.7);
    const radius = 28 + random() * 40;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.beginPath();
    for (let corner = 0; corner < 7; corner++) {
      const angle = (corner / 7) * Math.PI * 2;
      const reach = radius * (0.55 + random() * 0.6);
      const x = cx + Math.cos(angle) * reach;
      const y = cy + Math.sin(angle) * reach;
      if (corner === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Cracks running out from the middle, where the blades went in.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = glow;
  ctx.shadowBlur = 16;
  for (let arm = 0; arm < 8; arm++) {
    let angle = (arm / 8) * Math.PI * 2 + random() * 0.5;
    let x = SIZE / 2;
    let y = SIZE / 2;
    ctx.strokeStyle = glow;
    ctx.globalAlpha = 0.55 + random() * 0.3;
    ctx.lineWidth = 3 + random() * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let segment = 0; segment < 7; segment++) {
      angle += (random() - 0.5) * 0.8;
      x += Math.cos(angle) * (22 + random() * 18);
      y += Math.sin(angle) * (22 + random() * 18);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}
