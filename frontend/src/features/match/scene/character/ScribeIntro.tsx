"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointsMaterial,
  Quaternion,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Object3D,
} from "three";
import { seededRandom } from "@/game/domain/random";
import type { IntroSealBeats } from "../../characters";
import { useAge } from "../useAge";
import { BLOOD_INK, createWriting, drawParchment, drawStrokes, pageStrokes, ring, type Stroke } from "./parchment";
import { useSoftDisc } from "./softDisc";
import { findBone, placeInWorld } from "./worldPlacement";

/** Sizes in units of his height: the page he writes on, each scroll's sheet, the circle on the floor. */
const PAGE_WIDTH = 0.24;
const PAGE_HEIGHT = 0.32;
const SHEET_WIDTH = 0.17;
const SHEET_HEIGHT = 0.25;
const CIRCLE_SIZE = 1.05;
const ROD_RADIUS = 0.007;
/** Where the four scrolls hang round him: angle from his front (radians), radius and height. */
const SCROLLS = [-1.95, -0.95, 0.95, 1.95].map((angle, index) => ({
  angle,
  radius: 0.5,
  height: 0.62 + (index % 2) * 0.1,
}));
/** Seconds the page takes to unroll before he writes, and to burn once it splits into scrolls. */
const PAGE_UNROLL_SECONDS = 0.6;
const PAGE_BURN_SECONDS = 0.6;
/** Seconds the circle on the floor keeps writing itself after the page is done. */
const CIRCLE_EXTRA_SECONDS = 0.9;
/** Seconds the scrolls take to fly out of the page, to unroll, and to burn away. */
const FLY_SECONDS = 0.8;
const UNROLL_SECONDS = 0.7;
const BURN_SECONDS = 1.2;
/** Ink sparks shed by the pen as he writes: how many live at once, and for how long. */
const SPARKS = 140;
const SPARK_LIFE = 1.6;
/** Embers each scroll sheds as it burns. */
const EMBERS = 36;
/** The glow of fresh blood in his writing: on the page, the scrolls, the floor and the sparks. */
const BLOOD_GLOW = new Color("#ff2418").multiplyScalar(1.7);

const scratch = {
  tip: new Vector3(),
  point: new Vector3(),
  target: new Vector3(),
  position: new Vector3(),
  facing: new Quaternion(),
  local: new Vector3(),
};
const UP = new Vector3(0, 1, 0);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - (1 - x) ** 3;

/**
 * The Flesh Scribe's intro. A page of parchment unrolls in the air before his hand and, as he
 * writes, runes of blood appear on it, glowing, ink sparking and dripping off the pen; meanwhile
 * a ritual circle of blood writes itself on the floor round him. When he throws his arms up the
 * circle flares and the page tears into four scrolls (his four seals) that fly out round him,
 * unrolling: aged parchment between dark wooden rods with brass ends, written in dried blood
 * whose runes smoulder red, each closed with a wax seal. As his arms come down they
 * burn away from the edges in, shedding embers, and the circle fades. Placed in world space round
 * him; mounted fresh with every intro.
 */
export function ScribeIntro({
  figure,
  size,
  beats,
  active,
}: {
  figure: Object3D;
  size: number;
  beats: IntroSealBeats;
  active: RefObject<boolean>;
}) {
  const root = useRef<Group>(null);
  const page = useRef<Group>(null);
  const pageSheet = useRef<Group>(null);
  const pageLowerRod = useRef<Group>(null);
  const circle = useRef<Group>(null);
  const scrolls = useRef<(Group | null)[]>([]);
  const lowerRods = useRef<(Group | null)[]>([]);
  const sheets = useRef<(Group | null)[]>([]);
  const fingertip = useMemo(() => findBone(figure, "RightHandMiddle4") ?? findBone(figure, "RightHand"), [figure]);
  const hips = useMemo(() => findBone(figure, "Hips"), [figure]);
  const glow = BLOOD_GLOW;

  const pageWriting = useWriting(PAGE_STROKES, 192, 256, 4.5);
  const circleWriting = useWriting(CIRCLE_STROKES, 512, 512, 5);
  const blankPage = useParchment(192, 256, 77);
  const pages = usePages();
  const burnMask = useBurnMask();
  const disc = useSoftDisc();
  const sheetGeometry = useMemo(() => curledSheet(SHEET_WIDTH, SHEET_HEIGHT), []);
  const pageGeometry = useMemo(() => curledSheet(PAGE_WIDTH, PAGE_HEIGHT), []);
  useEffect(
    () => () => [sheetGeometry, pageGeometry].forEach((geometry) => geometry.dispose()),
    [sheetGeometry, pageGeometry],
  );

  const materials = useMemo(() => {
    const parchment = (map: CanvasTexture) =>
      // A tiny alphaTest from the start, so raising it as the sheets burn never recompiles them.
      new MeshStandardMaterial({ map, alphaMap: burnMask, alphaTest: 0.001, roughness: 0.92, side: DoubleSide });
    const ink = (map: CanvasTexture) =>
      new MeshBasicMaterial({
        map,
        alphaMap: burnMask,
        alphaTest: 0.001,
        color: BLOOD_INK,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      });
    const glowing = (map: CanvasTexture) =>
      new MeshBasicMaterial({
        map,
        alphaMap: burnMask,
        alphaTest: 0.001,
        color: glow,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        side: DoubleSide,
      });
    return {
      page: parchment(blankPage),
      pageInk: ink(pageWriting.texture),
      pageGlow: glowing(pageWriting.texture),
      circleInk: new MeshBasicMaterial({
        map: circleWriting.texture,
        color: BLOOD_INK,
        transparent: true,
        depthWrite: false,
      }),
      circleGlow: new MeshBasicMaterial({
        map: circleWriting.texture,
        color: glow,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      parchment: pages.map(({ parchment: map }) => parchment(map)),
      runes: pages.map(({ runes }) => glowing(runes)),
      wood: new MeshStandardMaterial({ color: "#2e1b10", roughness: 0.55 }),
      brass: new MeshStandardMaterial({ color: "#8a6a2c", metalness: 0.85, roughness: 0.35 }),
      wax: new MeshStandardMaterial({ color: "#5c0b10", roughness: 0.28, metalness: 0.1 }),
      sparks: new PointsMaterial({
        map: disc,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    };
  }, [pageWriting.texture, circleWriting.texture, blankPage, pages, burnMask, disc, glow]);
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );

  const sparks = useSparks();
  const embers = useEmbers();
  const age = useAge();
  /** Where the page hangs (world space, its top edge) and which way it faces, fixed as it appears. */
  const anchor = useRef<{ top: Vector3; facing: Quaternion } | null>(null);
  const lastSpark = useRef(0);

  useFrame(({ clock }) => {
    const group = root.current;
    if (!group || !fingertip || !hips) return;
    const t = age(clock.elapsedTime);
    const parentScale = group.getWorldScale(scratch.local).x || 1;
    const floorY = group.getWorldPosition(scratch.local).y;
    const presence = active.current ? 1 : 0;
    const pageIn = easeOut(clamp01((t - beats.writeSeconds + PAGE_UNROLL_SECONDS) / PAGE_UNROLL_SECONDS));
    const written = clamp01((t - beats.writeSeconds) / (beats.writtenSeconds - beats.writeSeconds));
    const flare = clamp01((t - beats.raiseSeconds) / 0.35);
    const pageBurn = clamp01((t - beats.raiseSeconds - 0.1) / PAGE_BURN_SECONDS);
    const burn = Math.max(clamp01((t - beats.releaseSeconds) / BURN_SECONDS), 1 - presence);

    hips.getWorldPosition(scratch.point);
    fingertip.getWorldPosition(scratch.tip);
    if (t >= beats.writeSeconds - PAGE_UNROLL_SECONDS && !anchor.current) {
      // Facing the way he faces, out beside his writing hand (so it doesn't hide him), a little in
      // front of his fingertip and hanging so the finger writes about its middle.
      figure.getWorldQuaternion(scratch.facing);
      const forward = new Vector3(0, 0, 1).applyQuaternion(scratch.facing).setY(0).normalize();
      const across = new Vector3().crossVectors(UP, forward);
      const side = Math.sign(across.dot(scratch.tip.clone().sub(scratch.point))) || 1;
      anchor.current = {
        top: scratch.tip
          .clone()
          .addScaledVector(forward, 0.08 * size)
          .addScaledVector(across, side * PAGE_WIDTH * 0.15 * size)
          .setY(scratch.tip.y + PAGE_HEIGHT * 0.35 * size),
        facing: new Quaternion().setFromAxisAngle(UP, Math.atan2(forward.x, forward.z)),
      };
    }

    // The page unrolls in the air, is written on, flares as he throws his arms up, and burns.
    pageWriting.drawUpTo(written);
    if (page.current && anchor.current) {
      page.current.visible = pageIn > 0 && pageBurn < 1;
      placeInWorld(page.current, group, anchor.current.top, size, anchor.current.facing);
      if (pageSheet.current) pageSheet.current.scale.y = Math.max(0.001, pageIn);
      if (pageLowerRod.current) pageLowerRod.current.position.y = -PAGE_HEIGHT * pageIn;
      const cut = 0.001 + pageBurn * 0.999;
      materials.page.setValues({ alphaTest: cut });
      materials.pageInk.setValues({ alphaTest: cut });
      materials.pageGlow.setValues({ alphaTest: cut, opacity: (0.6 + 0.25 * Math.sin(t * 7)) * (1 + flare * 2) });

      // Ink sparks off the pen, where the writing has got to.
      if (written > 0 && written < 1 && t - lastSpark.current > 1 / 70) {
        lastSpark.current = t;
        const [u, v] = pageWriting.penAt(written);
        page.current.updateWorldMatrix(true, false);
        page.current.localToWorld(scratch.position.set((u - 0.5) * PAGE_WIDTH, -v * PAGE_HEIGHT, 0.01));
        sparks.emit(group.worldToLocal(scratch.position), t, size / parentScale);
      }
    }
    sparks.update(t, glow);
    // Points are sized in world units, whatever their parent's scale.
    materials.sparks.setValues({ size: 0.012 * size });

    // The circle writes itself on the floor, flares as his arms go up, and fades with the scrolls.
    circleWriting.drawUpTo(
      clamp01((t - beats.writeSeconds) / (beats.writtenSeconds + CIRCLE_EXTRA_SECONDS - beats.writeSeconds)),
    );
    if (circle.current) {
      placeInWorld(
        circle.current,
        group,
        scratch.position.set(scratch.point.x, floorY + 0.004 * size, scratch.point.z),
        size,
      );
    }
    const circleFade = 1 - burn;
    const surge = flare * (1 - clamp01((t - beats.raiseSeconds - 0.35) / 0.8));
    materials.circleInk.setValues({ opacity: 0.85 * circleFade });
    materials.circleGlow.setValues({ opacity: (0.35 + 0.15 * Math.sin(t * 2.5) + surge * 1.5) * circleFade });

    // The scrolls fly out of the page to hang round him, unroll, then burn away.
    SCROLLS.forEach(({ angle, radius, height }, index) => {
      const scroll = scrolls.current[index];
      if (!scroll || !anchor.current) return;
      const start = beats.raiseSeconds + index * 0.08;
      const fly = easeOut(clamp01((t - start) / FLY_SECONDS));
      const unroll = easeOut(clamp01((t - start - 0.3) / UNROLL_SECONDS));
      scroll.visible = t >= start && burn < 1;
      const at = angle + Math.sin(t * 0.8 + index * 1.7) * 0.06;
      scratch.target.set(
        scratch.point.x + Math.sin(at) * radius * size,
        floorY + (height + Math.sin(t * 1.4 + index) * 0.015) * size,
        scratch.point.z + Math.cos(at) * radius * size,
      );
      const position = scratch.position
        .copy(anchor.current.top)
        .setY(anchor.current.top.y - PAGE_HEIGHT * 0.5 * size)
        .lerp(scratch.target, fly);
      // Facing out from him, turned halfway towards the front so the writing reads.
      scratch.facing.setFromAxisAngle(UP, at * 0.5);
      placeInWorld(scroll, group, position, size, scratch.facing);
      scroll.rotateZ(Math.sin(t * 1.1 + index) * 0.05);

      const sheet = sheets.current[index];
      if (sheet) sheet.scale.y = Math.max(0.001, unroll);
      const lower = lowerRods.current[index];
      if (lower) lower.position.y = -SHEET_HEIGHT * unroll;

      materials.parchment[index].setValues({ alphaTest: 0.001 + burn * 0.999 });
      materials.runes[index].setValues({
        alphaTest: 0.001 + burn * 0.999,
        opacity: unroll * (0.55 + 0.3 * Math.sin(t * 3 + index * 2)),
      });
      embers.update(index, burn, t);
    });
  });

  return (
    <group ref={root}>
      <group ref={circle}>
        <mesh material={materials.circleInk} rotation-x={-Math.PI / 2} renderOrder={1}>
          <planeGeometry args={[CIRCLE_SIZE, CIRCLE_SIZE]} />
        </mesh>
        <mesh material={materials.circleGlow} rotation-x={-Math.PI / 2} position-y={0.002} renderOrder={2}>
          <planeGeometry args={[CIRCLE_SIZE, CIRCLE_SIZE]} />
        </mesh>
      </group>
      <group ref={page} visible={false}>
        <Rod width={PAGE_WIDTH} wood={materials.wood} brass={materials.brass} />
        <group ref={pageSheet}>
          <mesh geometry={pageGeometry} material={materials.page} />
          <mesh geometry={pageGeometry} material={materials.pageInk} position-z={0.002} />
          <mesh geometry={pageGeometry} material={materials.pageGlow} position-z={0.003} />
        </group>
        <group ref={pageLowerRod}>
          <Rod width={PAGE_WIDTH} wood={materials.wood} brass={materials.brass} />
        </group>
      </group>
      <points geometry={sparks.geometry} material={materials.sparks} frustumCulled={false} />
      {SCROLLS.map((_, index) => (
        <group
          key={index}
          ref={(group) => {
            scrolls.current[index] = group;
          }}
          visible={false}
        >
          <Rod width={SHEET_WIDTH} wood={materials.wood} brass={materials.brass} />
          <group
            ref={(group) => {
              sheets.current[index] = group;
            }}
          >
            <mesh geometry={sheetGeometry} material={materials.parchment[index]} />
            {/* The runes' glow, a hair in front of the parchment. */}
            <mesh geometry={sheetGeometry} material={materials.runes[index]} position-z={0.002} />
          </group>
          <group
            ref={(group) => {
              lowerRods.current[index] = group;
            }}
          >
            <Rod width={SHEET_WIDTH} wood={materials.wood} brass={materials.brass} />
            {/* The wax seal hanging off the lower rod. */}
            <mesh material={materials.wax} position={[0, -0.022, 0.006]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.017, 0.019, 0.006, 20]} />
            </mesh>
          </group>
          <points geometry={embers.geometries[index]} material={materials.sparks} frustumCulled={false} />
        </group>
      ))}
    </group>
  );
}

/** The writing on the page in the air. */
const PAGE_STROKES = pageStrokes(61);
/**
 * The ritual circle on the floor (on a 1×1 square): a double ring, a seven-pointed star, four
 * small rings for his four seals with a mark in each, and runes between the rings.
 */
const CIRCLE_STROKES: Stroke[] = (() => {
  const random = seededRandom(43);
  const strokes: Stroke[] = [ring(0.5, 0.5, 0.47), ring(0.5, 0.5, 0.42)];
  strokes.push(
    Array.from({ length: 8 }, (_, index): [number, number] => {
      const angle = ((index * 3) / 7) * Math.PI * 2 - Math.PI / 2;
      return [0.5 + Math.cos(angle) * 0.4, 0.5 + Math.sin(angle) * 0.4];
    }),
  );
  strokes.push(ring(0.5, 0.5, 0.2, 0.2, 32));
  for (let seal = 0; seal < 4; seal++) {
    const angle = (seal / 4) * Math.PI * 2 + Math.PI / 4;
    const [x, y] = [0.5 + Math.cos(angle) * 0.31, 0.5 + Math.sin(angle) * 0.31];
    strokes.push(ring(x, y, 0.045, 0.045, 20), [
      [x - 0.025, y],
      [x + 0.025, y],
    ]);
  }
  for (let rune = 0; rune < 28; rune++) {
    const angle = (rune / 28) * Math.PI * 2;
    const [x, y] = [0.5 + Math.cos(angle) * 0.445, 0.5 + Math.sin(angle) * 0.445];
    strokes.push(
      Array.from({ length: 3 }, (): [number, number] => [x + (random() - 0.5) * 0.02, y + (random() - 0.5) * 0.02]),
    );
  }
  return strokes;
})();

/** Writing that appears as it's written (see createWriting). */
function useWriting(strokes: Stroke[], width: number, height: number, lineWidth: number) {
  const writing = useMemo(() => createWriting(strokes, width, height, lineWidth), [strokes, width, height, lineWidth]);
  useEffect(() => () => writing.texture.dispose(), [writing]);
  return writing;
}

/** A blank sheet of aged parchment. */
function useParchment(width: number, height: number, seed: number): CanvasTexture {
  const texture = useMemo(() => {
    const result = new CanvasTexture(drawParchment(width, height, seed));
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [width, height, seed]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** The four scrolls' pages, each with its own writing, and apart a mask of its runes for their glow. */
function usePages() {
  const pages = useMemo(
    () =>
      SCROLLS.map((_, index) => {
        const strokes = pageStrokes(101 + index * 17);
        const parchment = new CanvasTexture(drawParchment(192, 282, 101 + index * 17, strokes));
        parchment.colorSpace = SRGBColorSpace;
        const mask = document.createElement("canvas");
        mask.width = 192;
        mask.height = 282;
        const context = mask.getContext("2d")!;
        context.shadowColor = "white";
        context.shadowBlur = 4;
        drawStrokes(context, strokes, "white", 2.2);
        return { parchment, runes: new CanvasTexture(mask) };
      }),
    [],
  );
  useEffect(
    () => () =>
      pages.forEach(({ parchment, runes }) => {
        parchment.dispose();
        runes.dispose();
      }),
    [pages],
  );
  return pages;
}

/** A wooden roller across the top or bottom of a sheet, with brass knobs at its ends. */
function Rod({ width, wood, brass }: { width: number; wood: MeshStandardMaterial; brass: MeshStandardMaterial }) {
  const length = width * 1.12;
  return (
    <group rotation-z={Math.PI / 2}>
      <mesh material={wood}>
        <cylinderGeometry args={[ROD_RADIUS, ROD_RADIUS, length, 12]} />
      </mesh>
      {[1, -1].map((end) => (
        <mesh key={end} material={brass} position-y={(end * length) / 2}>
          <sphereGeometry args={[ROD_RADIUS * 1.6, 12, 8]} />
        </mesh>
      ))}
    </group>
  );
}

/** A sheet hanging down from its top edge (at the origin), curling a little back at the sides. */
function curledSheet(width: number, height: number): PlaneGeometry {
  const geometry = new PlaneGeometry(width, height, 12, 6);
  geometry.translate(0, -height / 2, 0);
  const position = geometry.getAttribute("position");
  for (let index = 0; index < position.count; index++) {
    const across = position.getX(index) / (width / 2);
    const down = -position.getY(index) / height;
    position.setZ(index, -0.018 * across * across + 0.006 * Math.sin(down * Math.PI * 2));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * What burns first: cloudy noise, lowest at the edges, so as the alpha test rises the sheet is
 * eaten from its edges inwards in ragged holes.
 */
function useBurnMask(): CanvasTexture {
  const texture = useMemo(() => {
    const width = 96;
    const height = 140;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "rgb(150,150,150)";
    context.fillRect(0, 0, width, height);
    const random = seededRandom(5);
    for (let blot = 0; blot < 70; blot++) {
      const x = random() * width;
      const y = random() * height;
      const radius = 6 + random() * 22;
      const light = random() < 0.5;
      const cloud = context.createRadialGradient(x, y, 0, x, y, radius);
      cloud.addColorStop(0, light ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)");
      cloud.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = cloud;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    // Edges lowest.
    const image = context.getImageData(0, 0, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const edge = Math.min(x, width - 1 - x, y, height - 1 - y) / 26;
        const offset = (y * width + x) * 4;
        const value = (image.data[offset] / 255) * (0.35 + 0.65 * Math.min(1, edge));
        image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = Math.min(250, value * 255);
      }
    }
    context.putImageData(image, 0, 0);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** The ink sparks: a ring of points shed at the fingertip, drifting and fading, some dripping. */
function useSparks() {
  const sparks = useMemo(() => createSparks(), []);
  useEffect(() => () => sparks.geometry.dispose(), [sparks]);
  return sparks;
}

function createSparks() {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(SPARKS * 3);
  const colours = new Float32Array(SPARKS * 3);
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colours, 3));
  const sparks = Array.from({ length: SPARKS }, () => ({
    origin: new Vector3(),
    velocity: new Vector3(),
    born: -Infinity,
    drips: false,
    unit: 1,
  }));
  const random = seededRandom(3);
  let next = 0;
  const emit = (at: Vector3, t: number, unit: number) => {
    const spark = sparks[next];
    next = (next + 1) % SPARKS;
    spark.origin.copy(at);
    spark.born = t;
    spark.drips = random() < 0.35;
    spark.unit = unit;
    spark.velocity.set((random() - 0.5) * 0.06, spark.drips ? -0.02 : 0.05 * random(), (random() - 0.5) * 0.06);
    spark.velocity.multiplyScalar(unit);
  };
  const update = (t: number, glow: Color) => {
    sparks.forEach((spark, index) => {
      const age = t - spark.born;
      const life = Math.max(0, 1 - age / SPARK_LIFE);
      // Drips fall like blood: slowly at first, a share of his height per second squared.
      const fall = spark.drips ? -0.5 * 0.25 * age * age * spark.unit : 0;
      positions[index * 3] = spark.origin.x + spark.velocity.x * age;
      positions[index * 3 + 1] = spark.origin.y + spark.velocity.y * age + fall;
      positions[index * 3 + 2] = spark.origin.z + spark.velocity.z * age;
      const brightness = life * life;
      colours[index * 3] = glow.r * brightness;
      colours[index * 3 + 1] = glow.g * brightness;
      colours[index * 3 + 2] = glow.b * brightness;
    });
    geometry.getAttribute("position").needsUpdate = true;
    geometry.getAttribute("color").needsUpdate = true;
  };
  return { geometry, emit, update };
}

/** Embers rising off each scroll as it burns, scattered over its sheet. */
function useEmbers() {
  const state = useMemo(() => {
    const random = seededRandom(9);
    const ember = new Color("#ff7a2a").multiplyScalar(2.2);
    const scrolls = SCROLLS.map(() => {
      const geometry = new BufferGeometry();
      const seeds = Array.from({ length: EMBERS }, () => ({
        x: (random() - 0.5) * SHEET_WIDTH,
        y: -random() * SHEET_HEIGHT,
        delay: random() * 0.7,
        rise: 0.08 + random() * 0.12,
        drift: (random() - 0.5) * 0.05,
      }));
      geometry.setAttribute("position", new BufferAttribute(new Float32Array(EMBERS * 3), 3));
      geometry.setAttribute("color", new BufferAttribute(new Float32Array(EMBERS * 3), 3));
      return { geometry, seeds };
    });
    const update = (index: number, burn: number, t: number) => {
      const { geometry, seeds } = scrolls[index];
      const positions = geometry.getAttribute("position") as BufferAttribute;
      const colours = geometry.getAttribute("color") as BufferAttribute;
      seeds.forEach((seed, point) => {
        const local = clamp01((burn * BURN_SECONDS - seed.delay) / 0.6);
        const on = local > 0 && local < 1 ? Math.sin(local * Math.PI) * (0.7 + 0.3 * Math.sin(t * 20 + point)) : 0;
        positions.setXYZ(point, seed.x + seed.drift * local, seed.y + seed.rise * local, 0.01);
        colours.setXYZ(point, ember.r * on, ember.g * on, ember.b * on);
      });
      positions.needsUpdate = true;
      colours.needsUpdate = true;
    };
    return { geometries: scrolls.map(({ geometry }) => geometry), update };
  }, []);
  useEffect(() => () => state.geometries.forEach((geometry) => geometry.dispose()), [state]);
  return state;
}
