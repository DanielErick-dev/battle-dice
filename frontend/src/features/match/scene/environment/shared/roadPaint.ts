/** Erases towards the canvas's left and right edges (opaque between `inner`), so a road melts into the ground. */
export function fadeSides(
  context: CanvasRenderingContext2D,
  size: number,
  height: number,
  inner: readonly [number, number] = [0.16, 0.84],
) {
  context.globalCompositeOperation = "destination-in";
  const fade = context.createLinearGradient(0, 0, size, 0);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(inner[0], "rgba(0,0,0,1)");
  fade.addColorStop(inner[1], "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = fade;
  context.fillRect(0, 0, size, height);
  context.globalCompositeOperation = "source-over";
}
