import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { type Painter } from "../kit/textures";

/** Square slate tiles in two shades, worn grout, and the odd green stain. */
const paintTiles: Painter = (context, size, random) => {
  context.fillStyle = "#0e1412";
  context.fillRect(0, 0, size, size);
  const tile = size / 8;
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      const light = (row + column) % 2 === 0;
      const shade = (light ? 62 : 34) + random() * 10;
      context.fillStyle = `rgb(${shade - 6},${shade + 4},${shade})`;
      context.fillRect(column * tile + 2, row * tile + 2, tile - 4, tile - 4);
    }
  }
  for (let fleck = 0; fleck < 3000; fleck++) {
    context.fillStyle = random() < 0.5 ? "rgba(6,10,8,0.35)" : "rgba(120,140,130,0.18)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  for (let stain = 0; stain < 7; stain++) {
    const x = random() * size;
    const y = random() * size;
    const radius = 10 + random() * 28;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(30,140,90,0.35)");
    gradient.addColorStop(1, "rgba(30,140,90,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
};

/** A transmutation circle in chalk on a transparent canvas: rings, triangle, square and glyphs between the rings. */
export const paintChalkCircle: Painter = (context, size, random) => {
  const centre = size / 2;
  const outer = size * 0.46;
  const inner = size * 0.4;
  // Each line drawn a few times, a little off, so it reads as chalk rather than ink.
  const chalk = (path: () => void, width = 3) => {
    for (let pass = 0; pass < 3; pass++) {
      context.save();
      context.translate((random() - 0.5) * 2, (random() - 0.5) * 2);
      context.strokeStyle = `rgba(240,255,245,${0.3 + random() * 0.2})`;
      context.lineWidth = width;
      context.beginPath();
      path();
      context.stroke();
      context.restore();
    }
  };
  const polygon = (sides: number, radius: number, start: number) => () => {
    for (let corner = 0; corner <= sides; corner++) {
      const angle = start + (corner / sides) * Math.PI * 2;
      context.lineTo(centre + Math.cos(angle) * radius, centre + Math.sin(angle) * radius);
    }
  };
  chalk(() => context.arc(centre, centre, outer, 0, Math.PI * 2), 4);
  chalk(() => context.arc(centre, centre, inner, 0, Math.PI * 2));
  chalk(polygon(3, inner, -Math.PI / 2));
  chalk(polygon(3, inner, Math.PI / 2));
  chalk(polygon(4, inner * 0.5, Math.PI / 4));
  chalk(() => context.arc(centre, centre, inner * 0.5, 0, Math.PI * 2));
  for (let corner = 0; corner < 6; corner++) {
    const angle = -Math.PI / 2 + (corner / 6) * Math.PI * 2;
    chalk(() =>
      context.arc(centre + Math.cos(angle) * inner, centre + Math.sin(angle) * inner, size * 0.025, 0, Math.PI * 2),
    );
  }
  for (let glyph = 0; glyph < 30; glyph++) {
    const angle = (glyph / 30) * Math.PI * 2 + 0.05;
    const radius = (outer + inner) / 2;
    const x = centre + Math.cos(angle) * radius;
    const y = centre + Math.sin(angle) * radius;
    const tilts = Array.from({ length: 1 + Math.floor(random() * 3) }, () => angle + random() * Math.PI);
    chalk(() => {
      for (const tilt of tilts) {
        context.moveTo(x - Math.cos(tilt) * 7, y - Math.sin(tilt) * 7);
        context.lineTo(x + Math.cos(tilt) * 7, y + Math.sin(tilt) * 7);
      }
    }, 2);
  }
};

/** A green runner trimmed in gold down the lab, spilled potions and broken glass. */
const LAB_GROUND: GroundDressing = {
  wash: { colour: "#10b981", alpha: 0.3 },
  patches: { colours: ["rgba(40,220,140,0.28)", "rgba(120,60,200,0.2)"], count: 14, radius: [16, 40] },
  path: { kind: "runner", colour: "#0f3d2e", edge: "#d4af37", width: [0.2, 0.2] },
  litter: [{ shape: "shard", colours: ["rgba(170,255,220,0.8)", "rgba(120,220,255,0.7)"], count: 70, size: 4 }],
};

export const paintLabFloor = withDressing(paintTiles, LAB_GROUND);
