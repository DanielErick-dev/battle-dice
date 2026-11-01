import { useEffect, useMemo } from "react";
import { CanvasTexture } from "three";
import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { paintTexture, type CanvasLook, type Painter } from "../kit/textures";
import { FACES, Suit } from "./layout";

/** A chip's rim (white edge spots) or its face (a ring of white dashes round an inlay). */
export function useChipTexture(colour: string, part: "side" | "face"): CanvasTexture {
  const texture = useMemo(() => {
    const [width, height] = part === "side" ? [256, 16] : [128, 128];
    const draw: Painter = (context) => {
      context.fillStyle = colour;
      context.fillRect(0, 0, width, height);
      const stripe = colour === "#e9e4da" ? "#b3122e" : "#f4efe6";
      context.fillStyle = stripe;
      if (part === "side") {
        for (let spot = 0; spot < 8; spot++) context.fillRect(spot * 32 + 8, 0, 14, 16);
      } else {
        context.strokeStyle = stripe;
        context.lineWidth = 12;
        for (let dash = 0; dash < 8; dash++) {
          const angle = (dash / 8) * Math.PI * 2;
          context.beginPath();
          context.arc(64, 64, 52, angle, angle + 0.35);
          context.stroke();
        }
        context.lineWidth = 2;
        context.beginPath();
        context.arc(64, 64, 34, 0, Math.PI * 2);
        context.stroke();
      }
    };
    return paintTexture({ size: width, height, draw });
  }, [colour, part]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function drawFace(rank: string, suit: Suit | "joker") {
  return (context: CanvasRenderingContext2D) => {
    context.fillStyle = "#f6f0e2";
    context.fillRect(0, 0, 128, 180);
    context.strokeStyle = "#c9b98f";
    context.lineWidth = 3;
    context.strokeRect(6, 6, 116, 168);
    if (suit === "joker") {
      context.fillStyle = "#b3122e";
      context.font = "bold 20px serif";
      context.textAlign = "center";
      "JOKER".split("").forEach((letter, index) => context.fillText(letter, 22, 32 + index * 20));
      drawStar(context, 72, 96, 34);
      return;
    }
    const red = suit === "hearts" || suit === "diamonds";
    context.fillStyle = red ? "#c0142f" : "#141114";
    context.font = "bold 26px serif";
    context.textAlign = "center";
    context.fillText(rank, 22, 36);
    drawSuit(context, suit, 22, 52, 8);
    context.save();
    context.translate(128, 180);
    context.rotate(Math.PI);
    context.fillText(rank, 22, 36);
    drawSuit(context, suit, 22, 52, 8);
    context.restore();
    drawSuit(context, suit, 64, 92, 26);
  };
}

/** Crimson, a gold border and a lattice of diamonds: the Jester's deck. */
function drawBack(context: CanvasRenderingContext2D) {
  context.fillStyle = "#7d0a1f";
  context.fillRect(0, 0, 128, 180);
  context.strokeStyle = "rgba(201,160,67,0.55)";
  context.lineWidth = 1.5;
  for (let line = -180; line < 180; line += 16) {
    context.beginPath();
    context.moveTo(line, 0);
    context.lineTo(line + 180, 180);
    context.moveTo(line + 180, 0);
    context.lineTo(line, 180);
    context.stroke();
  }
  context.strokeStyle = "#c9a043";
  context.lineWidth = 5;
  context.strokeRect(8, 8, 112, 164);
  context.fillStyle = "#14090c";
  drawSuit(context, "diamonds", 64, 90, 30);
  context.fillStyle = "#c9a043";
  drawSuit(context, "diamonds", 64, 90, 18);
}

/** One texture per FACES entry, then the back. */
export const CARD_LOOKS: CanvasLook[] = [...FACES.map(({ rank, suit }) => drawFace(rank, suit)), drawBack].map(
  (draw) => ({
    size: 128,
    height: 180,
    draw,
  }),
);

/** A suit centred on (x, y), `size` its half-height, in the current fill. */
function drawSuit(context: CanvasRenderingContext2D, suit: Suit, x: number, y: number, size: number) {
  context.beginPath();
  if (suit === "diamonds") {
    context.moveTo(x, y - size);
    context.lineTo(x + size * 0.72, y);
    context.lineTo(x, y + size);
    context.lineTo(x - size * 0.72, y);
  } else if (suit === "hearts" || suit === "spades") {
    // A heart, flipped upside down for a spade.
    const flip = suit === "spades" ? -1 : 1;
    context.moveTo(x, y + size * flip);
    context.bezierCurveTo(
      x - size * 1.4,
      y - size * 0.1 * flip,
      x - size * 0.6,
      y - size * 1.1 * flip,
      x,
      y - size * 0.45 * flip,
    );
    context.bezierCurveTo(
      x + size * 0.6,
      y - size * 1.1 * flip,
      x + size * 1.4,
      y - size * 0.1 * flip,
      x,
      y + size * flip,
    );
  } else {
    for (const [dx, dy] of [
      [0, -0.45],
      [-0.5, 0.15],
      [0.5, 0.15],
    ]) {
      context.moveTo(x + dx * size + size * 0.45, y + dy * size);
      context.arc(x + dx * size, y + dy * size, size * 0.45, 0, Math.PI * 2);
    }
  }
  context.fill();
  if (suit === "spades" || suit === "clubs") {
    context.beginPath();
    context.moveTo(x, y + size * 0.1);
    context.lineTo(x + size * 0.4, y + size * 1.35);
    context.lineTo(x - size * 0.4, y + size * 1.35);
    context.fill();
  }
}

function drawStar(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.beginPath();
  for (let point = 0; point < 10; point++) {
    const angle = -Math.PI / 2 + (point / 10) * Math.PI * 2;
    const reach = point % 2 ? radius * 0.42 : radius;
    context.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
  }
  context.fill();
}

const PIP_LAYOUT: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

/** Ivory faces with 1 to 6 pips, in BoxGeometry's face order so opposite faces add up to 7. */
export const DIE_LOOKS: CanvasLook[] = [1, 6, 2, 5, 3, 4].map((pips) => ({
  size: 64,
  draw: (context) => {
    context.fillStyle = "#f2ead8";
    context.fillRect(0, 0, 64, 64);
    context.fillStyle = pips === 1 ? "#c0142f" : "#1a1416";
    for (const [px, py] of PIP_LAYOUT[pips]) {
      context.beginPath();
      context.arc(32 + px * 18, 32 + py * 18, pips === 1 ? 9 : 6, 0, Math.PI * 2);
      context.fill();
    }
  },
}));

/** Crimson and black diamonds edged in gold, scuffed, fading out towards the rim. */
const paintHarlequin: Painter = (context, size, random) => {
  context.fillStyle = "#0c080a";
  context.fillRect(0, 0, size, size);
  context.save();
  context.translate(size / 2, size / 2);
  context.rotate(Math.PI / 4);
  const cell = 52;
  const reach = size;
  for (let row = -reach; row < reach; row += cell) {
    for (let column = -reach; column < reach; column += cell) {
      const crimson = (Math.round(row / cell) + Math.round(column / cell)) % 2 === 0;
      const shade = 0.85 + random() * 0.25;
      context.fillStyle = crimson
        ? `rgb(${Math.round(128 * shade)},${Math.round(14 * shade)},${Math.round(34 * shade)})`
        : `rgb(${Math.round(22 * shade)},${Math.round(16 * shade)},${Math.round(20 * shade)})`;
      context.fillRect(column, row, cell, cell);
    }
  }
  context.strokeStyle = "rgba(201,160,67,0.6)";
  context.lineWidth = 2;
  for (let line = -reach; line < reach; line += cell) {
    context.beginPath();
    context.moveTo(line, -reach);
    context.lineTo(line, reach);
    context.moveTo(-reach, line);
    context.lineTo(reach, line);
    context.stroke();
  }
  context.restore();
  for (let scuff = 0; scuff < 2600; scuff++) {
    context.fillStyle = random() < 0.6 ? "rgba(0,0,0,0.3)" : "rgba(255,230,200,0.08)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
};

/** A red casino carpet down the middle, dropped cards and chips. */
const CASINO_GROUND: GroundDressing = {
  wash: { colour: "#dc2626", alpha: 0.25 },
  path: { kind: "runner", colour: "#6e0d1c", edge: "#e8c46a", width: [0.22, 0.22] },
  litter: [
    { shape: "speck", colours: ["rgba(245,240,228,0.95)"], count: 26, size: 9 },
    { shape: "coin", colours: ["#b3122e", "#1a1416", "#e9e4da"], count: 30, size: 5 },
  ],
};

export const paintCasinoFloor = withDressing(paintHarlequin, CASINO_GROUND);
