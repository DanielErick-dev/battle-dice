import { type CanvasLook } from "@/features/shared/three/canvasTexture";

/** The outer ring of the reticle: a dashed circle, a solid one and ticks at the quarters. */
function drawReticleRing(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 4;
  context.setLineDash([size * 0.06, size * 0.035]);
  context.beginPath();
  context.arc(centre, centre, centre * 0.92, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  context.lineWidth = 2;
  context.beginPath();
  context.arc(centre, centre, centre * 0.78, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 5;
  for (let tick = 0; tick < 4; tick++) {
    const angle = (tick / 4) * Math.PI * 2;
    context.beginPath();
    context.moveTo(centre + Math.cos(angle) * centre * 0.62, centre + Math.sin(angle) * centre * 0.62);
    context.lineTo(centre + Math.cos(angle) * centre * 0.86, centre + Math.sin(angle) * centre * 0.86);
    context.stroke();
  }
}

/** Four corner brackets closing on a centre diamond. */
function drawReticleBrackets(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  const reach = size * 0.42;
  const arm = size * 0.16;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 6;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    const x = centre + sx * reach;
    const y = centre + sy * reach;
    context.beginPath();
    context.moveTo(x - sx * arm, y);
    context.lineTo(x, y);
    context.lineTo(x, y - sy * arm);
    context.stroke();
  }
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(centre, centre - 10);
  context.lineTo(centre + 10, centre);
  context.lineTo(centre, centre + 10);
  context.lineTo(centre - 10, centre);
  context.closePath();
  context.fill();
}

export const RETICLE_RING: CanvasLook = { size: 256, draw: drawReticleRing };

export const RETICLE_BRACKETS: CanvasLook = { size: 256, draw: drawReticleBrackets };
