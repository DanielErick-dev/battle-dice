"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Box3, Quaternion, Vector3, type Bone, type Group, type Object3D } from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { PROPS } from "@/features/characters/core/props";
import { seededRandom } from "@/game/domain/core/random";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { figurePositions } from "../../token/figureTrack";
import { groundAt, trailNearest, type IslandShape } from "./terrain";

/** World size: a bat's wingspan, a crow's height (a figure is about 1.7). */
const BAT_SPAN = 0.95;
const CROW_HEIGHT = 0.42;
const BAT_COUNT = 5;
/** One crow every this many trail points, sat this far off the road's middle. */
const CROW_EVERY = 22;
const CROW_SIDE = 2.9;

/**
 * The Meshy rigs' bones, read from their bind poses (both models face +z, y up). The bat has real wings: shoulder,
 * elbow, then three fingers off the wrist. The sat crow's wings are skinned to its back: it looks round, pecks,
 * flicks its tail and hops, and a second crow model with rigged wings does the flying.
 */
const BAT = { shoulders: ["Bone_023", "Bone_027"], elbows: ["Bone_022", "Bone_026"], tail: "Bone_016" };
const CROW = { chest: "Bone_002", neck: "Bone_022", head: "Bone_020", beak: "Bone_052", tail: "Bone_017" };
/** The flying crow (a second model, wings spread): shoulders and elbows of each wing. */
const CROW_FLIGHT = { shoulders: ["Bone_018", "Bone_022"], elbows: ["Bone_017", "Bone_021"] };

useGLTF.preload(PROPS.islandBat);
useGLTF.preload(PROPS.islandCrow);
useGLTF.preload(PROPS.islandCrowFlight);

const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);
const turn = new Quaternion();

/** A bone bent about an axis of the model's own frame, whatever its rig's local axes are. */
interface Joint {
  bone: Bone;
  rest: Quaternion;
  /** The parent's rest orientation in the model's frame, and its inverse. */
  parent: Quaternion;
  parentInverse: Quaternion;
}

function joint(root: Object3D, name: string): Joint | null {
  const bone = root.getObjectByName(name) as Bone | undefined;
  if (!bone?.parent) return null;
  root.updateMatrixWorld(true);
  const rootInverse = root.getWorldQuaternion(new Quaternion()).invert();
  const parent = rootInverse.multiply(bone.parent.getWorldQuaternion(new Quaternion()));
  return { bone, rest: bone.quaternion.clone(), parent, parentInverse: parent.clone().invert() };
}

/** Sets the joint to its rest pose turned by `angle` about the model-frame `axis`. */
function bend(target: Joint | null, axis: Vector3, angle: number): void {
  if (!target) return;
  turn.setFromAxisAngle(axis, angle);
  target.bone.quaternion.copy(target.parentInverse).multiply(turn).multiply(target.parent).multiply(target.rest);
}

/** A clone of a rigged prop with its own skeleton, scaled so `measure` of its bounds comes to `size`. */
function useRigged(url: string, size: number, measure: "x" | "y", count: number, shadows: boolean): Object3D[] {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    scene.updateMatrixWorld(true);
    const extent = new Box3().setFromObject(scene).getSize(new Vector3())[measure] || 1;
    return Array.from({ length: count }, () => {
      const copy = cloneSkinned(scene);
      copy.scale.multiplyScalar(size / extent);
      copy.traverse((node) => {
        // Skinned meshes are bounded by their bind pose: a raised wing would get culled at the screen's edge.
        node.frustumCulled = false;
        node.castShadow = shadows;
      });
      return copy;
    });
  }, [scene, size, measure, count, shadows]);
}

/** Bats circling over the mountains behind the trail's start, wings beating, never touching the ground. */
export function Bats({ shape }: { shape: IslandShape }) {
  const bats = useRigged(PROPS.islandBat, BAT_SPAN, "x", BAT_COUNT, false);
  const holders = useRef<(Group | null)[]>([]);
  const rigs = useMemo(
    () =>
      bats.map((bat, index) => {
        const random = seededRandom(7_331 + index);
        return {
          shoulders: BAT.shoulders.map((name) => joint(bat, name)),
          elbows: BAT.elbows.map((name) => joint(bat, name)),
          tail: joint(bat, BAT.tail),
          centre: new Vector3((random() * 2 - 1) * shape.halfWidth * 0.6, 0, shape.backZ - 5 - random() * 6),
          radius: 3 + random() * 5,
          height: 4 + random() * 4,
          speed: (0.35 + random() * 0.3) * (random() < 0.5 ? -1 : 1),
          phase: random() * Math.PI * 2,
          beat: 7 + random() * 3,
        };
      }),
    [bats, shape],
  );
  const ahead = useMemo(() => new Vector3(), []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    rigs.forEach((rig, index) => {
      const holder = holders.current[index];
      if (!holder) return;
      // An uneven loop: the radius and height breathe so no two passes trace the same line.
      const at = (t: number, out: Vector3) => {
        const angle = rig.phase + t * rig.speed;
        const radius = rig.radius * (1 + Math.sin(t * 0.7 + rig.phase) * 0.25);
        return out.set(
          rig.centre.x + Math.cos(angle) * radius,
          rig.height + Math.sin(t * 1.3 + rig.phase) * 0.8,
          rig.centre.z + Math.sin(angle) * radius,
        );
      };
      at(time, holder.position);
      at(time + 0.1, ahead);
      holder.lookAt(ahead);
      // Banked into the turn.
      holder.rotateZ(-Math.sign(rig.speed) * 0.35);
      // Down fast, up slower: the wings rest raised in the model, so the beat swings them down from there.
      const cycle = (time * rig.beat + rig.phase) % 1;
      const down =
        cycle < 0.4 ? Math.sin((cycle / 0.4) * Math.PI * 0.5) : Math.cos(((cycle - 0.4) / 0.6) * Math.PI * 0.5);
      const sweep = down * 1.5;
      bend(rig.shoulders[0] ?? null, Z, sweep);
      bend(rig.shoulders[1] ?? null, Z, -sweep);
      // The forearm folds in on the way up.
      bend(rig.elbows[0] ?? null, Z, -(1 - down) * 0.35);
      bend(rig.elbows[1] ?? null, Z, (1 - down) * 0.35);
      bend(rig.tail, X, Math.sin(time * 3 + rig.phase) * 0.15);
    });
  });

  return (
    <>
      {bats.map((bat, index) => (
        <group key={index} ref={(node) => void (holders.current[index] = node)}>
          {/* The model faces +z, the way lookAt turns an object's +z. */}
          <primitive object={bat} />
        </group>
      ))}
    </>
  );
}

type CrowAct = "look" | "peck" | "caw" | "hop" | "still";
const CROW_ACTS: readonly CrowAct[] = ["look", "peck", "look", "still", "peck", "caw", "look", "hop", "still"];
const ACT_SECONDS: Readonly<Record<CrowAct, number>> = { look: 1.6, peck: 1.1, caw: 0.9, hop: 0.6, still: 1.8 };

/** Where the crows sit: by the road every CROW_EVERY trail points, alternating sides, on open ground. */
export function crowSpots(shape: IslandShape, trail: readonly Vec3[]): CrowSpot[] {
  const spots: CrowSpot[] = [];
  for (let index = CROW_EVERY / 2; index < trail.length - 1; index += CROW_EVERY) {
    const [x0, , z0] = trail[index]!;
    const [x1, , z1] = trail[index + 1]!;
    const length = Math.hypot(x1 - x0, z1 - z0) || 1;
    const side = spots.length % 2 ? 1 : -1;
    const [x, z] = [x0 + ((z1 - z0) / length) * CROW_SIDE * side, z0 - ((x1 - x0) / length) * CROW_SIDE * side];
    const { height, cover } = groundAt(shape, x, z);
    if (cover === "sand" || cover === "bank" || trailNearest(shape, x, z).distance < CROW_SIDE * 0.7) continue;
    // Facing the road, to watch whoever comes by.
    spots.push({ x, y: height, z, yaw: Math.atan2(x0 - x, z0 - z) });
  }
  return spots;
}

type CrowSpot = { x: number; y: number; z: number; yaw: number };
/** A crow's flight: sat, taking off away from whoever came near, gone off out of sight, or coming back to land. */
type Flight = { phase: "sat" | "leaving" | "away" | "returning"; since: number; to: Vector3 };

/** Someone this close sends a crow off; it only comes back once nobody is this close to its spot. */
const STARTLE_RADIUS = 2.6;
const CLEAR_RADIUS = 3.6;
const LEAVE_SECONDS = 2.6;
const AWAY_SECONDS = 9;
const RETURN_SECONDS = 3.4;
/** Where it flies off to: this far out from its spot, and this high. */
const FLIGHT_REACH = 14;
const FLIGHT_HEIGHT = 6;
/** The flying crow's wingspan, matched to the sat one's height. */
const CROW_SPAN = 0.95;
/**
 * Models not in use are hidden (SceneWarmup compiles hidden ones at load, so the first flight doesn't stall).
 * They can't be left to the camera's culling: skinned, they're drawn whatever the camera sees (see useRigged).
 */

/** Crows sat by the road going through their little round; one takes off as a figure comes near and lands back later. */
export function Crows({ spots }: { spots: readonly CrowSpot[] }) {
  const sat = useRigged(PROPS.islandCrow, CROW_HEIGHT, "y", spots.length, true);
  const flying = useRigged(PROPS.islandCrowFlight, CROW_SPAN, "x", spots.length, true);
  const satHolders = useRef<(Group | null)[]>([]);
  const flyHolders = useRef<(Group | null)[]>([]);
  const rigs = useMemo(
    () =>
      sat.map((crow, index) => ({
        chest: joint(crow, CROW.chest),
        neck: joint(crow, CROW.neck),
        head: joint(crow, CROW.head),
        beak: joint(crow, CROW.beak),
        tail: joint(crow, CROW.tail),
        shoulders: CROW_FLIGHT.shoulders.map((name) => joint(flying[index]!, name)),
        elbows: CROW_FLIGHT.elbows.map((name) => joint(flying[index]!, name)),
        offset: index * 2.3,
        look: (index % 3) - 1,
        flight: { phase: "sat", since: 0, to: new Vector3() } as Flight,
      })),
    [sat, flying],
  );
  const ahead = useMemo(() => new Vector3(), []);
  const from = useMemo(() => new Vector3(), []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    rigs.forEach((rig, index) => {
      const satHolder = satHolders.current[index];
      const flyHolder = flyHolders.current[index];
      const spot = spots[index];
      if (!satHolder || !flyHolder || !spot) return;
      const flight = rig.flight;
      const elapsed = time - flight.since;
      const nearest = nearestFigure(spot);

      if (flight.phase === "sat" && nearest.distance < STARTLE_RADIUS) {
        // Away from whoever came, a little to one side, out and up.
        const away = Math.atan2(spot.x - nearest.x, spot.z - nearest.z) + Math.sin(rig.offset) * 0.6;
        flight.to.set(
          spot.x + Math.sin(away) * FLIGHT_REACH,
          spot.y + FLIGHT_HEIGHT,
          spot.z + Math.cos(away) * FLIGHT_REACH,
        );
        Object.assign(flight, { phase: "leaving", since: time });
      } else if (flight.phase === "leaving" && elapsed > LEAVE_SECONDS) {
        Object.assign(flight, { phase: "away", since: time });
      } else if (flight.phase === "away" && elapsed > AWAY_SECONDS && nearest.distance > CLEAR_RADIUS) {
        Object.assign(flight, { phase: "returning", since: time });
      } else if (flight.phase === "returning" && elapsed > RETURN_SECONDS) {
        Object.assign(flight, { phase: "sat", since: time });
      }

      satHolder.visible = flight.phase === "sat";
      flyHolder.visible = flight.phase === "leaving" || flight.phase === "returning";
      if (flight.phase === "sat") {
        perch(rig, satHolder, spot, time);
        return;
      }
      if (flight.phase === "away") return;
      // Leaving it climbs steeply at first; coming back it glides down and flares onto its spot.
      const leaving = flight.phase === "leaving";
      const t = Math.min(1, (time - flight.since) / (leaving ? LEAVE_SECONDS : RETURN_SECONDS));
      const along = (u: number, out: Vector3) => {
        const k = leaving ? u * u : 1 - (1 - u) * (1 - u);
        from.set(spot.x, spot.y, spot.z);
        const [start, end] = leaving ? [from, flight.to] : [flight.to, from];
        out.lerpVectors(start, end, k);
        // A climb that lifts early (off the ground fast) whichever way it flies.
        const lift = leaving ? Math.sqrt(u) : 1 - (1 - u) ** 0.5;
        out.y = start.y + (end.y - start.y) * lift;
        return out;
      };
      along(t, flyHolder.position);
      along(Math.min(1, t + 0.05), ahead);
      if (ahead.distanceToSquared(flyHolder.position) > 1e-6) flyHolder.lookAt(ahead);
      // Hard beats lifting off, slower ones gliding in, wings held out over the last stretch.
      const beat = leaving ? 6 : 3.5;
      const strength = leaving ? 1 : t > 0.75 ? 0.25 : 0.7;
      const down = 0.5 + Math.sin(time * beat * Math.PI * 2 + rig.offset) * 0.5;
      const sweep = down * 1.1 * strength;
      bend(rig.shoulders[0] ?? null, Z, sweep);
      bend(rig.shoulders[1] ?? null, Z, -sweep);
      bend(rig.elbows[0] ?? null, Z, -(1 - down) * 0.3 * strength);
      bend(rig.elbows[1] ?? null, Z, (1 - down) * 0.3 * strength);
    });
  });

  return (
    <>
      {sat.map((crow, index) => (
        <group key={`sat${index}`} ref={(node) => void (satHolders.current[index] = node)}>
          <primitive object={crow} />
        </group>
      ))}
      {flying.map((crow, index) => (
        <group key={`fly${index}`} ref={(node) => void (flyHolders.current[index] = node)} visible={false}>
          <primitive object={crow} />
        </group>
      ))}
    </>
  );
}

/** The figure nearest a spot on the ground, and how far. */
function nearestFigure(spot: CrowSpot): { x: number; z: number; distance: number } {
  let best = { x: 0, z: 0, distance: Infinity };
  for (const position of figurePositions.values()) {
    const distance = Math.hypot(position.x - spot.x, position.z - spot.z);
    if (distance < best.distance) best = { x: position.x, z: position.z, distance };
  }
  return best;
}

type PerchRig = {
  chest: Joint | null;
  neck: Joint | null;
  head: Joint | null;
  beak: Joint | null;
  tail: Joint | null;
  offset: number;
  look: number;
};

/** A sat crow's round: a fixed loop of acts per crow, offset so they never move in step. */
function perch(rig: PerchRig, holder: Group, spot: CrowSpot, time: number): void {
  const round = CROW_ACTS.reduce((sum, act) => sum + ACT_SECONDS[act], 0);
  let clockInRound = (time + rig.offset) % round;
  let act: CrowAct = "still";
  for (const candidate of CROW_ACTS) {
    if (clockInRound < ACT_SECONDS[candidate]) {
      act = candidate;
      break;
    }
    clockInRound -= ACT_SECONDS[candidate];
  }
  const t = clockInRound / ACT_SECONDS[act];
  const swell = Math.sin(t * Math.PI);
  const step = Math.floor((time + rig.offset) / round);

  bend(rig.head, Y, act === "look" ? Math.sin(t * Math.PI * 2) * 0.9 * (rig.look || 1) : 0);
  bend(rig.neck, X, act === "peck" ? Math.abs(Math.sin(t * Math.PI * 2)) * 0.9 : act === "caw" ? -swell * 0.35 : 0);
  bend(rig.chest, X, act === "peck" ? swell * 0.25 : 0);
  bend(rig.beak, X, act === "caw" ? Math.abs(Math.sin(t * Math.PI * 3)) * 0.35 : 0);
  bend(rig.tail, X, Math.sin(time * 1.7 + rig.offset) * 0.08 + (act === "hop" ? -swell * 0.3 : 0));

  // Each round's hop turns it a little; it stays on its spot.
  const yaw = spot.yaw + Math.sin(step * 1.9 + rig.offset) * 0.6 + (act === "hop" ? (t - 1) * 0.4 : 0);
  holder.position.set(spot.x, spot.y + (act === "hop" ? swell * 0.12 : 0), spot.z);
  holder.rotation.set(0, yaw, 0);
}
