/** A flame's teardrop, white and soft-edged, its base at the bottom of the square. */
export function paintFlame(context: CanvasRenderingContext2D, size: number) {
  const gradient = context.createRadialGradient(size / 2, size * 0.68, 0, size / 2, size * 0.6, size * 0.42);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.65)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(size / 2, size * 0.04);
  context.bezierCurveTo(size * 0.62, size * 0.35, size * 0.86, size * 0.55, size * 0.8, size * 0.78);
  context.bezierCurveTo(size * 0.74, size * 0.98, size * 0.26, size * 0.98, size * 0.2, size * 0.78);
  context.bezierCurveTo(size * 0.14, size * 0.55, size * 0.38, size * 0.35, size / 2, size * 0.04);
  context.fill();
}
