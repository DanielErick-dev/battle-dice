"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SpriteMaterial,
  SRGBColorSpace,
  type Group,
  type InstancedMesh,
  type Sprite,
} from "three";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { usePaintedTexture, type Painter } from "./sceneryKit";

const FLOOR_RADIUS = 1;
const CARD: [number, number] = [0.12, 0.17];
type Suit = "hearts" | "spades" | "diamonds" | "clubs";
/** Card faces in drawing order; the last is the deck's back. */
const FACES: { rank: string; suit: Suit | "joker" }[] = [
  { rank: "A", suit: "hearts" },
  { rank: "K", suit: "spades" },
  { rank: "Q", suit: "diamonds" },
  { rank: "7", suit: "clubs" },
  { rank: "", suit: "joker" },
];
const BACK = FACES.length;
/** Lying on the floor; `face` is an index into FACES, or BACK for face down. */
const STREWN = [
  { x: -0.42, z: 0.44, turn: 0.4, face: 0 },
  { x: -0.36, z: 0.5, turn: 0.75, face: BACK },
  { x: 0.46, z: 0.36, turn: -0.5, face: 3 },
  { x: -0.68, z: -0.12, turn: 1.9, face: BACK },
  { x: 0.18, z: -0.58, turn: -1.1, face: 2 },
  { x: 0.72, z: -0.08, turn: 2.4, face: BACK },
];
/** Hanging in the air, turning slowly. */
const FLOATING = [
  { x: -0.64, y: 0.72, z: -0.42, face: 4, speed: 0.5, tilt: 0.25 },
  { x: 0.6, y: 0.98, z: -0.5, face: 0, speed: -0.38, tilt: -0.2 },
  { x: 0.74, y: 0.5, z: 0.06, face: 1, speed: 0.44, tilt: 0.15 },
];
const CHIP_RADIUS = 0.034;
const CHIP_HEIGHT = 0.009;
const CHIP_COLOURS = ["#b3122e", "#18151a", "#e9e4da", "#2b5fb8"];
/** `colour` indexes CHIP_COLOURS. */
const STACKS = [
  { x: -0.56, z: -0.36, colour: 0, count: 8 },
  { x: -0.48, z: -0.44, colour: 1, count: 5 },
  { x: 0.48, z: -0.46, colour: 2, count: 10 },
  { x: 0.57, z: -0.37, colour: 0, count: 4 },
  { x: 0.42, z: 0.48, colour: 3, count: 3 },
  { x: -0.58, z: 0.22, colour: 1, count: 1 },
  { x: 0.3, z: 0.62, colour: 0, count: 1 },
];
const STACKS_BY_COLOUR = CHIP_COLOURS.map((_, index) => STACKS.filter((stack) => stack.colour === index));
const DIE_SIZE = 0.07;
const DICE = [
  { x: 0.3, z: -0.66, turn: 0.5, tumbling: false },
  { x: -0.22, z: 0.64, turn: -0.3, tumbling: false },
  { x: -0.7, z: -0.62, turn: 0, tumbling: true },
];
const BULBS = 15;
const BULB_RING = 0.92;
/** The back arc of the stage's rim the bulbs run along. */
const ARC_START = 0.3;
const ARC_LENGTH = Math.PI - 2 * ARC_START;
const BULB = new Color("#ffd27a").multiplyScalar(2);

/** The Crimson Jester's stage: a harlequin floor, strewn and floating cards, chips, dice and chasing marquee bulbs. */
export function CardTable() {
  const floor = usePaintedTexture(paintHarlequin, 17, 512, 0.3);
  const cards = useCardTextures();
  const pips = useDieFaces();
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: floor, transparent: true, roughness: 0.6, depthWrite: false }),
      cards: cards.map((map) => new MeshStandardMaterial({ map, roughness: 0.5 })),
      die: pips.map((map) => new MeshStandardMaterial({ map, roughness: 0.35 })),
      rim: new MeshStandardMaterial({ color: "#2a0a12", roughness: 0.5, metalness: 0.3 }),
      gold: new MeshStandardMaterial({ color: "#c9a043", roughness: 0.35, metalness: 0.7 }),
      bulb: new MeshBasicMaterial({ color: BULB, toneMapped: false }),
      halo: new SpriteMaterial({
        map: disc,
        color: new Color("#ffb347"),
        opacity: 0.5,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [floor, cards, pips, disc],
  );
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );
  const floating = useRef<(Group | null)[]>([]);
  const tumbler = useRef<Group>(null);
  const halos = useRef<(Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    floating.current.forEach((card, index) => {
      if (!card) return;
      const { y, speed } = FLOATING[index];
      card.rotation.y = t * speed + index * 2;
      card.position.y = y + Math.sin(t * 0.9 + index * 1.7) * 0.035;
    });
    if (tumbler.current) {
      tumbler.current.rotation.set(t * 0.6, t * 0.45, t * 0.3);
      tumbler.current.position.y = 0.42 + Math.sin(t * 1.1) * 0.03;
    }
    // A run of lit bulbs chasing round the arc.
    halos.current.forEach((halo, index) => {
      if (!halo) return;
      const lit = 0.5 + 0.5 * Math.cos(((index / BULBS) * 3 - t * 1.6) * Math.PI * 2);
      halo.scale.setScalar(0.05 + 0.13 * lit * lit);
    });
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[FLOOR_RADIUS, 64]} />
      </mesh>
      {/* A low lacquered rim along the back of the stage, the bulbs on top. */}
      <mesh material={materials.rim} rotation={[-Math.PI / 2, 0, ARC_START]} position-y={0.03}>
        <torusGeometry args={[BULB_RING, 0.03, 8, 48, ARC_LENGTH]} />
      </mesh>
      <mesh material={materials.gold} rotation={[-Math.PI / 2, 0, ARC_START]} position-y={0.058}>
        <torusGeometry args={[BULB_RING, 0.008, 6, 48, ARC_LENGTH]} />
      </mesh>
      {Array.from({ length: BULBS }, (_, index) => {
        const angle = ARC_START + (index / (BULBS - 1)) * ARC_LENGTH;
        const position = [Math.cos(angle) * BULB_RING, 0.075, -Math.sin(angle) * BULB_RING] as const;
        return (
          <group key={index} position={position}>
            <mesh material={materials.bulb}>
              <sphereGeometry args={[0.012, 8, 6]} />
            </mesh>
            <sprite
              ref={(sprite) => {
                halos.current[index] = sprite;
              }}
              material={materials.halo}
            />
          </group>
        );
      })}
      {STREWN.map(({ x, z, turn, face }) => (
        <mesh
          key={`${x}:${z}`}
          material={materials.cards[face]}
          position={[x, 0.003, z]}
          rotation={[-Math.PI / 2, 0, turn]}
        >
          <planeGeometry args={CARD} />
        </mesh>
      ))}
      {FLOATING.map(({ x, y, z, face, tilt }, index) => (
        <group
          key={`${x}:${z}`}
          ref={(group) => {
            floating.current[index] = group;
          }}
          position={[x, y, z]}
        >
          <group rotation-z={tilt}>
            <mesh material={materials.cards[face]} position-z={0.0006}>
              <planeGeometry args={CARD} />
            </mesh>
            <mesh material={materials.cards[BACK]} position-z={-0.0006} rotation-y={Math.PI}>
              <planeGeometry args={CARD} />
            </mesh>
          </group>
        </group>
      ))}
      {CHIP_COLOURS.map((colour, index) => (
        <ChipStacks key={colour} colour={colour} stacks={STACKS_BY_COLOUR[index]} />
      ))}
      {DICE.map(({ x, z, turn, tumbling }) => (
        <group key={`${x}:${z}`} ref={tumbling ? tumbler : undefined} position={[x, DIE_SIZE / 2, z]} rotation-y={turn}>
          <mesh material={materials.die}>
            <boxGeometry args={[DIE_SIZE, DIE_SIZE, DIE_SIZE]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Every chip of one colour, a little askew in its stack, as one instanced mesh. */
function ChipStacks({ colour, stacks }: { colour: string; stacks: { x: number; z: number; count: number }[] }) {
  const side = useChipTexture(colour, "side");
  const face = useChipTexture(colour, "face");
  const geometry = useMemo(() => new CylinderGeometry(CHIP_RADIUS, CHIP_RADIUS, CHIP_HEIGHT, 24), []);
  const materials = useMemo(
    () => [
      new MeshStandardMaterial({ map: side, roughness: 0.45 }),
      new MeshStandardMaterial({ map: face, roughness: 0.45 }),
      new MeshStandardMaterial({ map: face, roughness: 0.45 }),
    ],
    [side, face],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      materials.forEach((material) => material.dispose());
    },
    [geometry, materials],
  );
  const count = stacks.reduce((total, stack) => total + stack.count, 0);
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const random = seededRandom(colour.length * 31 + count);
    const dummy = new Object3D();
    let index = 0;
    for (const { x, z, count: chips } of stacks) {
      for (let level = 0; level < chips; level++) {
        dummy.position.set(x + (random() - 0.5) * 0.008, CHIP_HEIGHT * (level + 0.5), z + (random() - 0.5) * 0.008);
        dummy.rotation.set(0, random() * Math.PI * 2, 0);
        dummy.updateMatrix();
        mesh.current.setMatrixAt(index++, dummy.matrix);
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [colour, count, stacks]);

  return <instancedMesh ref={mesh} args={[geometry, materials, count]} />;
}

/** A chip's rim (white edge spots) or its face (a ring of white dashes round an inlay). */
function useChipTexture(colour: string, part: "side" | "face"): CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = part === "side" ? 256 : 128;
    canvas.height = part === "side" ? 16 : 128;
    const context = canvas.getContext("2d")!;
    context.fillStyle = colour;
    context.fillRect(0, 0, canvas.width, canvas.height);
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
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [colour, part]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** One texture per FACES entry, then the back. */
function useCardTextures(): CanvasTexture[] {
  const textures = useMemo(
    () =>
      [
        ...FACES.map(
          ({ rank, suit }) =>
            () =>
              drawFace(rank, suit),
        ),
        drawBack,
      ].map((draw) => {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 180;
        draw(canvas.getContext("2d")!);
        const result = new CanvasTexture(canvas);
        result.colorSpace = SRGBColorSpace;
        return result;
      }),
    [],
  );
  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);
  return textures;
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

/** Ivory faces with 1 to 6 pips, in BoxGeometry's face order so opposite faces add up to 7. */
function useDieFaces(): CanvasTexture[] {
  const textures = useMemo(
    () =>
      [1, 6, 2, 5, 3, 4].map((pips) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 64;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#f2ead8";
        context.fillRect(0, 0, 64, 64);
        context.fillStyle = pips === 1 ? "#c0142f" : "#1a1416";
        for (const [px, py] of PIP_LAYOUT[pips]) {
          context.beginPath();
          context.arc(32 + px * 18, 32 + py * 18, pips === 1 ? 9 : 6, 0, Math.PI * 2);
          context.fill();
        }
        const result = new CanvasTexture(canvas);
        result.colorSpace = SRGBColorSpace;
        return result;
      }),
    [],
  );
  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);
  return textures;
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
