/** Logs lost/restored WebGL contexts: the canvas blanks for a moment, kept to track down screen blinks. */
export function watchContext(canvas: HTMLCanvasElement): void {
  canvas.addEventListener("webglcontextlost", () =>
    console.warn(`[battle-dice] contexto WebGL perdido ${new Date().toLocaleTimeString()}`),
  );
  canvas.addEventListener("webglcontextrestored", () =>
    console.warn(`[battle-dice] contexto WebGL restaurado ${new Date().toLocaleTimeString()}`),
  );
}
