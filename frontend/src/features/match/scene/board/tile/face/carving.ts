import { CENTER, FONT } from "./canvas";

/** Cut into the stone: a dark groove a little offset, then the rune's glowing line in it. */
export function engrave(ctx: CanvasRenderingContext2D, color: string, strength: number, trace: () => void) {
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

/** The tile's number, small, carved near the slab's left edge (the way runs left to right on the face). */
export function paintNumber(ctx: CanvasRenderingContext2D, text: string, accent: string) {
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
