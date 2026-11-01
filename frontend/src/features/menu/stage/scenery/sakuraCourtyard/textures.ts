import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { type NoiseLook, type Painter } from "../kit/textures";

/** Pale pavers in staggered rows, mossy joints, the odd fallen petal; tinted by the dusk. */
const paintPaving: Painter = (context, size, random) => {
  context.fillStyle = "#2a2b26";
  context.fillRect(0, 0, size, size);
  const row = 84;
  for (let y = 0; y < size; y += row) {
    const offset = (y / row) % 2 ? row * 0.5 : 0;
    for (let x = -offset; x < size;) {
      const width = row * (0.8 + random() * 0.7);
      const shade = 92 + random() * 26;
      context.fillStyle = `rgb(${shade + 8},${shade},${shade + 2})`;
      context.fillRect(x + 3, y + 3, width - 6, row - 6);
      x += width;
    }
  }
  for (let fleck = 0; fleck < 3000; fleck++) {
    context.fillStyle = random() < 0.55 ? "rgba(40,36,38,0.3)" : "rgba(220,210,214,0.18)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  for (let tuft = 0; tuft < 90; tuft++) {
    const y = Math.floor(random() * (size / row)) * row + (random() < 0.5 ? 0 : row - 3);
    context.fillStyle = `rgba(70,96,52,${0.4 + random() * 0.3})`;
    context.fillRect(random() * size, y - 1, 4 + random() * 10, 4);
  }
  for (let petal = 0; petal < 120; petal++) {
    context.fillStyle = random() < 0.5 ? "rgba(249,168,212,0.9)" : "rgba(255,214,230,0.85)";
    context.beginPath();
    context.ellipse(
      random() * size,
      random() * size,
      2.5 + random() * 2,
      1.5 + random(),
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
};

/** A ruled exercise-book page with a margin and lines of tidy notes. */
export const paintNotebookPage: Painter = (context, size, random) => {
  context.fillStyle = "#f6f2e8";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "rgba(110,150,210,0.55)";
  context.lineWidth = 1;
  for (let line = 14; line < size; line += 9) {
    context.beginPath();
    context.moveTo(0, line);
    context.lineTo(size, line);
    context.stroke();
  }
  context.strokeStyle = "rgba(230,110,140,0.7)";
  context.beginPath();
  context.moveTo(18, 0);
  context.lineTo(18, size);
  context.stroke();
  context.strokeStyle = "rgba(40,40,70,0.75)";
  for (let line = 14; line < size - 10; line += 9) {
    let x = 22;
    const end = 60 + random() * 62;
    context.beginPath();
    while (x < end) {
      const word = 6 + random() * 14;
      context.moveTo(x, line - 2);
      for (let step = 0; step < word; step += 2) context.lineTo(x + step, line - 2 - random() * 4);
      x += word + 4;
    }
    context.stroke();
  }
};

export const BARK: NoiseLook = { base: [58, 42, 40], dark: [26, 18, 18], light: [96, 78, 74], fadeOut: false };

export const STONE: NoiseLook = { base: [96, 94, 90], dark: [52, 50, 48], light: [138, 134, 126], fadeOut: false };

/** A stepping-stone path across the courtyard, petals piling up under the cherry tree (back left). */
const COURTYARD_GROUND: GroundDressing = {
  wash: { colour: "#f9a8d4", alpha: 0.25 },
  path: { kind: "slabs", colour: "#8e8577", edge: "#4d463d", width: [0.15, 0.24], wind: 0.04 },
  litter: [
    { shape: "petal", colours: ["#f9a8d4", "#fbcfe8", "#f472b6"], count: 260, size: 4, pile: [0, 0.5, 0, 0.55] },
  ],
};

export const paintCourtyardFloor = withDressing(paintPaving, COURTYARD_GROUND);
