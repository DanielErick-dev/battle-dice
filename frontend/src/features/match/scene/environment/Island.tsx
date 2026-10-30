"use client";

import { QuadraticBezierLine } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  SpriteMaterial,
  type Sprite,
  Color,
  ConeGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from "three";
import { seededRandom } from "@/game/domain/random";
import type { Vec3 } from "../boardLayout";
import { PROP_HEIGHT, usePropMesh, type PropId } from "../character/props";
import { useSoftDisc } from "../character/softDisc";
import { planCoast } from "./coast";
import { paintDirtRoad, TrailRoad } from "./road";
import { Instances, type Placed } from "./instances";
import { KitPieces } from "./kits";
import { KIT_SCALE, planSettlements, type Settlements } from "./settlements";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  groundAt,
  islandShape,
  noise,
  RIVER_HALF_WIDTH,
  riverDistance,
  trailDistance,
  TRAIL_EARTH,
  TRAIL_GROUND,
  type Cover,
  type IslandShape,
} from "./islandTerrain";

/** Ground cover colours, a grim night: muddy, cold and desaturated; each vertex varies one a little. */
const COVER_COLORS: Record<Cover, string> = {
  earth: "#4a3d31",
  grass: "#2b3a2f",
  meadow: "#34432f",
  paving: "#57565d",
  sand: "#6d6556",
  bank: "#3a3129",
  rock: "#35343d",
  snow: "#9ba4ae",
};
/** Cools and darkens the cartoon kits' bright colours (blue roofs, green bushes) into the night. */
const TOWN_TINT = "#868894";
const COUNTRY_TINT = "#7a8279";
/** Ground cells per world unit: enough for the hills, low-poly on purpose (flat shading). */
const CELLS_PER_UNIT = 1.6;
/** A lantern by the trail every this many tiles. */
const LANTERN_EVERY = 9;

/**
 * The island the trail winds across on a grim night: low-poly hills of dark grass, trodden mud under the
 * tiles, a grey shore running into the sea, snowy mountains behind where the trail begins and a stream the
 * trail crosses on wooden bridges; tall pines where they hide no tile (Meshy models), bushes, boulders and
 * grass tufts in between, and lanterns along the way.
 */
export function Island({ trail }: { trail: readonly Vec3[] }) {
  const shape = useMemo(() => islandShape(trail), [trail]);
  const ground = useIslandGround(shape);
  const town = useMemo(() => planSettlements(shape, trail), [shape, trail]);
  const scatter = useMemo(() => scatterProps(shape, trail, town.blockers), [shape, trail, town]);
  const coast = useMemo(() => planCoast(shape, trail, town, scatter), [shape, trail, town, scatter]);
  const townItems = useMemo(
    () => town.placements.map((placement) => ({ ...placement, scale: placement.scale * KIT_SCALE })),
    [town],
  );
  const lanterns = useMemo(() => lanternSpots(trail, shape), [trail, shape]);
  const bridges = useMemo(() => bridgeSpans(trail, shape), [trail, shape]);

  return (
    <group>
      <mesh geometry={ground.geometry} material={ground.material} receiveShadow />
      <TrailRoad trail={trail} heightAt={(x, z) => groundAt(shape, x, z).height} paint={paintDirtRoad} />
      <Woods trees={scatter.trees} groves={scatter.groves} />
      <KitPieces kit="kaykit" items={townItems} tint={TOWN_TINT} />
      <KitPieces kit="kenney" items={coast.pieces} tint={COUNTRY_TINT} />
      <ChimneySmoke chimneys={town.chimneys} />
      <GrassTufts tufts={scatter.tufts} />
      <Bridges spans={bridges} />
      {lanterns.map(([x, y, z], index) => (
        <Lantern key={index} position={[x, y, z]} />
      ))}
    </group>
  );
}

function useIslandGround(shape: IslandShape) {
  const result = useMemo(() => {
    const width = shape.halfWidth * 2.3;
    const depth = shape.halfDepth * 2.3;
    const grid = new PlaneGeometry(width, depth, Math.ceil(width * CELLS_PER_UNIT), Math.ceil(depth * CELLS_PER_UNIT));
    grid.rotateX(-Math.PI / 2);
    grid.translate(0, 0, shape.centerZ);
    // Heights on the shared corners first (a quarter of the work), then split into flat faces.
    const corners = grid.getAttribute("position");
    for (let index = 0; index < corners.count; index++) {
      corners.setY(index, groundAt(shape, corners.getX(index), corners.getZ(index)).height);
    }
    const geometry = grid.toNonIndexed();
    grid.dispose();
    const position = geometry.getAttribute("position");
    const colors = new Float32Array(position.count * 3);
    const color = new Color();
    // Per face: flat-shaded, one cover and colour for its three corners, picked at its middle.
    for (let face = 0; face < position.count; face += 3) {
      let [cx, cz] = [0, 0];
      for (let corner = 0; corner < 3; corner++) {
        cx += position.getX(face + corner) / 3;
        cz += position.getZ(face + corner) / 3;
      }
      const { cover } = groundAt(shape, cx, cz);
      color.set(COVER_COLORS[cover]).multiplyScalar(0.86 + noise(cx * 2.3, cz * 2.3) * 0.2);
      for (let corner = 0; corner < 3; corner++) color.toArray(colors, (face + corner) * 3);
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
    return { geometry, material };
  }, [shape]);
  useEffect(
    () => () => {
      result.geometry.dispose();
      result.material.dispose();
    },
    [result],
  );
  return result;
}

/** Big pines, at most: each a heavy model, so the woods stay light. */
const MAX_PINES = 90;
/** How far behind it (towards the far side) a tree of height h hides the ground, with the camera up at 45°. */
const SHADE_REACH = 1.15;

/**
 * Pines and rocky knolls full size, only where no tile hides behind them (the camera looks from the
 * front); bushes in their place between the rows; boulders and tufts. The same every time for a board.
 */
function scatterProps(shape: IslandShape, trail: readonly Vec3[], blockers: Settlements["blockers"]) {
  const random = seededRandom(31);
  const trees: Placed[] = [];
  const groves: Placed[] = [];
  const bushes: Placed[] = [];
  const rocks: Placed[] = [];
  const tufts: Placed[] = [];
  const area = shape.halfWidth * shape.halfDepth * 4;
  const spot = () => {
    const x = (random() * 2 - 1) * shape.halfWidth;
    const z = shape.centerZ + (random() * 2 - 1) * shape.halfDepth;
    const { height, cover } = groundAt(shape, x, z);
    const clear = Math.min(
      trailDistance(shape, x, z) - TRAIL_EARTH,
      riverDistance(shape, x, z) - RIVER_HALF_WIDTH - 0.8,
      // Off the houses, walls and fields.
      ...blockers.map((blocker) => Math.hypot(blocker.x - x, blocker.z - z) - blocker.radius),
    );
    return { x, z, height, cover, clear };
  };
  const placed = (x: number, y: number, z: number, size: number): Placed => ({
    x,
    y,
    z,
    size,
    turn: random() * Math.PI * 2,
    tilt: 0,
  });
  // A tile hides behind a tree when it lies a little behind it and not far to either side.
  const hidesTiles = (x: number, z: number, height: number, spread: number) =>
    trail.some(([tx, , tz]) => tz < z + 1 && z - tz < height * SHADE_REACH && Math.abs(tx - x) < spread + 1.4);

  for (let attempt = Math.round(area * 0.6); attempt > 0; attempt--) {
    const { x, z, height, cover, clear } = spot();
    if (clear < 0.6 || cover === "sand" || cover === "snow" || cover === "earth" || cover === "bank") continue;
    const roll = random();
    const item = placed(x, height - 0.05, z, 0.7 + random() * 0.7);
    if (cover === "rock") {
      if (roll < 0.25) rocks.push({ ...item, size: item.size * 1.6 });
      continue;
    }
    if (roll < 0.55) {
      const tall = 5.5 + random() * 3;
      const grove = roll < 0.06;
      const size = grove ? tall * 0.75 : tall;
      // Its crown spreads about a third of its height each way.
      const spread = size * (grove ? 0.5 : 0.35);
      if (clear > spread && !hidesTiles(x, z, size, spread) && (grove || trees.length < MAX_PINES)) {
        (grove ? groves : trees).push({ ...item, size });
      } else if (clear > 0.8) bushes.push({ ...item, size: 0.5 + random() * 0.5 });
    } else if (roll < 0.63) rocks.push({ ...item, tilt: random() * 0.6 });
  }
  // Grass in tufts everywhere green, right up to the trail's edge.
  for (let attempt = Math.min(5000, Math.round(area * 2.2)); attempt > 0; attempt--) {
    const { x, z, height, cover, clear } = spot();
    if (clear < -0.25 || (cover !== "grass" && cover !== "meadow")) continue;
    tufts.push(placed(x, height, z, 0.6 + random() * 0.8));
  }
  return { trees, groves, bushes, rocks, tufts };
}

/** Beside the trail every LANTERN_EVERY tiles, on alternate sides; none over the stream. */
function lanternSpots(trail: readonly Vec3[], shape: IslandShape): Vec3[] {
  const spots: Vec3[] = [];
  for (let index = 4; index < trail.length - 1; index += LANTERN_EVERY) {
    const [x, , z] = trail[index];
    const [nx, , nz] = trail[index + 1];
    const [dx, dz] = [nx - x, nz - z];
    const length = Math.hypot(dx, dz) || 1;
    const side = index % 2 === 0 ? 1 : -1;
    const spot: Vec3 = [x - (dz / length) * 2 * side, TRAIL_GROUND, z + (dx / length) * 2 * side];
    if (riverDistance(shape, spot[0], spot[2]) > RIVER_HALF_WIDTH + 1) spots.push(spot);
  }
  return spots;
}

/** One stretch of the trail over the stream: the tiles' centres it runs between. */
interface BridgeSpan {
  from: Vec3;
  to: Vec3;
}

/** Every step of the trail that crosses the stream, and the ones onto and off it. */
function bridgeSpans(trail: readonly Vec3[], shape: IslandShape): BridgeSpan[] {
  return trail.slice(1).flatMap((to, index) => {
    const from = trail[index];
    const middle = riverDistance(shape, (from[0] + to[0]) / 2, (from[2] + to[2]) / 2);
    return middle < RIVER_HALF_WIDTH + 1.3 ? [{ from, to }] : [];
  });
}

/** A prop's mesh stood on its base and one unit tall, so an instance's size is its height. */
function useUnitProp(id: PropId) {
  const { geometry, material } = usePropMesh(id);
  const unit = useMemo(() => {
    const copy = geometry.clone();
    copy.computeBoundingBox();
    const box = copy.boundingBox!;
    copy.translate(0, -box.min.y, 0).scale(1 / PROP_HEIGHT, 1 / PROP_HEIGHT, 1 / PROP_HEIGHT);
    return copy;
  }, [geometry]);
  useEffect(() => () => unit.dispose(), [unit]);
  return { geometry: unit, material };
}

/** Pines (PROPS.islandPine) and, here and there, a few pines on a rocky knoll (islandRockyTree). */
function Woods({ trees, groves }: { trees: readonly Placed[]; groves: readonly Placed[] }) {
  const pine = useUnitProp("islandPine");
  const grove = useUnitProp("islandRockyTree");
  return (
    <group>
      <Instances geometry={pine.geometry} material={pine.material} items={trees} shadows />
      <Instances geometry={grove.geometry} material={grove.material} items={groves} shadows />
    </group>
  );
}

const postGeometry = new CylinderGeometry(0.04, 0.06, 1.3, 6).translate(0, 0.65, 0);
const lampGeometry = new SphereGeometry(0.13, 12, 8);
const postMaterial = new MeshStandardMaterial({ color: "#2b2333", roughness: 0.7, metalness: 0.4 });
const lampMaterial = new MeshStandardMaterial({
  color: "#fff1c1",
  emissive: new Color("#fbbf24").multiplyScalar(2.2),
  toneMapped: false,
});

/** A post with a glowing lamp: no light of its own, only glow through the bloom. */
function Lantern({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh geometry={postGeometry} material={postMaterial} castShadow />
      <mesh geometry={lampGeometry} material={lampMaterial} position-y={1.38} />
    </group>
  );
}

/** Three blades leaning apart, merged into one tuft. */
const tuftGeometry = mergeGeometries(
  [-0.35, 0, 0.35].map((lean, index) =>
    new ConeGeometry(0.035, 0.32, 4)
      .translate(0, 0.16, 0)
      .rotateZ(lean)
      .rotateY(index * 2.1),
  ),
);
const tuftMaterial = new MeshStandardMaterial({ color: "#2f4232", roughness: 0.9, flatShading: true });

function GrassTufts({ tufts }: { tufts: readonly Placed[] }) {
  return <Instances geometry={tuftGeometry} material={tuftMaterial} items={tufts} />;
}

/** Top of a bridge's deck: under the stones' feet (see TileMesh), so they rest on the planks. */
const DECK_TOP = -0.16;
const PLANKS_PER_STEP = 5;
const plankGeometry = new BoxGeometry(2.1, 0.08, 0.36);
const woodMaterial = new MeshStandardMaterial({ color: "#4a3626", roughness: 0.85, flatShading: true });
const bridgePostGeometry = new CylinderGeometry(0.07, 0.08, 1.2, 6);
const ropeMaterial = new MeshStandardMaterial({ color: "#7a6c58", roughness: 0.9 });

/** Wooden planks under the stones where the trail crosses the stream, posts on each side and a rope rail between. */
function Bridges({ spans }: { spans: readonly BridgeSpan[] }) {
  const { planks, posts, ropes } = useMemo(() => {
    const planks: Placed[] = [];
    const posts: Placed[] = [];
    const ropes: { from: Vec3; to: Vec3 }[] = [];
    spans.forEach(({ from, to }, index) => {
      const [dx, dz] = [to[0] - from[0], to[2] - from[2]];
      const length = Math.hypot(dx, dz) || 1;
      // Planks lie across the way: their long side square to the step.
      const turn = Math.atan2(dx, dz);
      for (let plank = 0; plank < PLANKS_PER_STEP; plank++) {
        const t = (plank + 0.5) / PLANKS_PER_STEP;
        planks.push({
          x: from[0] + dx * t,
          y: DECK_TOP - 0.04 + (plank % 2) * 0.012,
          z: from[2] + dz * t,
          size: 1,
          turn,
          tilt: 0,
        });
      }
      for (const side of [-1, 1]) {
        const offset = (point: Vec3): Vec3 => [
          point[0] + (dz / length) * 1.05 * side,
          DECK_TOP,
          point[2] - (dx / length) * 1.05 * side,
        ];
        const [a, b] = [offset(from), offset(to)];
        if (index === 0) posts.push({ x: a[0], y: DECK_TOP, z: a[2], size: 1, turn: 0, tilt: 0 });
        posts.push({ x: b[0], y: DECK_TOP, z: b[2], size: 1, turn: 0, tilt: 0 });
        ropes.push({ from: [a[0], DECK_TOP + 0.5, a[2]], to: [b[0], DECK_TOP + 0.5, b[2]] });
      }
    });
    return { planks, posts, ropes };
  }, [spans]);
  return (
    <group>
      <Instances geometry={plankGeometry} material={woodMaterial} items={planks} shadows />
      <Instances geometry={bridgePostGeometry} material={woodMaterial} items={posts} shadows />
      {ropes.map(({ from, to }, index) => (
        <QuadraticBezierLine
          key={index}
          start={from}
          end={to}
          mid={[(from[0] + to[0]) / 2, from[1] - 0.18, (from[2] + to[2]) / 2]}
          color={ropeMaterial.color}
          lineWidth={2}
        />
      ))}
    </group>
  );
}

const SMOKE_PUFFS = 4;
const SMOKE_RISE = 2.2;
const SMOKE_SECONDS = 4;

/** Dark, thin smoke rising from every chimney (and the wasteland's fires), swelling and thinning as it goes. */
export function ChimneySmoke({ chimneys }: { chimneys: readonly Vec3[] }) {
  const disc = useSoftDisc();
  // One material per puff: each fades on its own.
  const materials = useMemo(
    () =>
      Array.from(
        { length: chimneys.length * SMOKE_PUFFS },
        () => new SpriteMaterial({ map: disc, color: "#4a4850", transparent: true, depthWrite: false, opacity: 0 }),
      ),
    [disc, chimneys.length],
  );
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  const puffs = useRef<(Sprite | null)[]>([]);
  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    puffs.current.forEach((puff, index) => {
      const chimney = chimneys[Math.floor(index / SMOKE_PUFFS)];
      if (!puff || !chimney) return;
      const t = (now / SMOKE_SECONDS + (index % SMOKE_PUFFS) / SMOKE_PUFFS + index * 0.137) % 1;
      puff.position.set(chimney[0] + Math.sin(t * 3 + index) * 0.25 + t * 0.5, chimney[1] + t * SMOKE_RISE, chimney[2]);
      puff.scale.setScalar(0.35 + t * 1.1);
      materials[index].opacity = 0.3 * Math.sin(t * Math.PI);
    });
  });
  return (
    <group>
      {materials.map((material, index) => (
        <sprite
          key={index}
          ref={(sprite) => {
            puffs.current[index] = sprite;
          }}
          material={material}
        />
      ))}
    </group>
  );
}
