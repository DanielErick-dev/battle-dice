import { CENTER, RUNE, type TileFace } from "./canvas";

/** Strokes (and fills, for pips) the tile's rune in the current style. */
export function runePath(ctx: CanvasRenderingContext2D, { theme, arrowAngle }: TileFace) {
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
      ] as const)
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
      ] as const) {
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
