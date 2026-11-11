import { CENTER, SIZE } from "./canvas";

/** Natural stone tones; each tile picks one, so the trail doesn't read as copies. */
const STONES = ["#77727d", "#6f6a62", "#7d756a", "#686775", "#736b70"];

/** A flagstone of the road: lit from the far left, moss in its cracks and edges, a worn rim. */
export function paintStone(ctx: CanvasRenderingContext2D, random: () => number, rim: string | null) {
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

/** Faint red-hot fissures: the ground of a trap zone, the same unease on every one of its tiles. */
export function paintEmberCracks(ctx: CanvasRenderingContext2D, random: () => number) {
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
export function paintShattered(ctx: CanvasRenderingContext2D, glow: string, random: () => number) {
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
