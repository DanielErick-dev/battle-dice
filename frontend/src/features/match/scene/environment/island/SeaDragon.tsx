"use client";

import { useFrame } from "@react-three/fiber";
import { type Ref, useEffect, useMemo, useRef } from "react";
import { DoubleSide, type Group, type Mesh, type MeshBasicMaterial, Vector3 } from "three";
import { useFittedProp } from "@/features/characters/core/props";
import { seededRandom } from "@/game/domain/core/random";
import { shoreline } from "./coast";
import { riverX, WATER_LEVEL, type IslandShape } from "./terrain";

/**
 * Out of sight it waits deep under the (opaque) sea rather than turning invisible: an invisible mesh isn't compiled
 * up front, and compiling it the moment it first leaps stalls a frame.
 */
const HIDDEN_Y = -60;
/** The Meshy model's head points along -x: turned round so it leads along +x, the way the code moves it. */
const HEAD_TURN = Math.PI;
/** How long the dragon is nose to tail, and how far and high one leap carries it. */
const LENGTH = 5;
const LEAP = { distance: 9, height: 3, seconds: 2.6 };
/** Seconds under water between two leaps (at least, plus up to the spread). */
const UNDER = { least: 7, spread: 7 };
/** How far out from the waterline it leaps: clear of the beach and the anchored boats' line. */
const OFFSHORE = 9;
/** How deep under the surface a leap starts and ends, so it breaks the water nose first. */
const DIVE = 1.2;
/** A splash ring's life in seconds and how wide it grows. */
const SPLASH = { seconds: 1.1, radius: 2.4 };

interface Leap {
  startedAt: number;
  x: number;
  z: number;
  /** Which way along the shore it leaps (unit length). */
  dx: number;
  dz: number;
}

/** The Meshy sea dragon (not rigged), living off the island's shore: now and then it leaps out in an arc. */
export function SeaDragon({ shape }: { shape: IslandShape }) {
  const model = useFittedProp("seaDragon");
  const body = useRef<Group>(null);
  const firstRing = useRef<Mesh>(null);
  const secondRing = useRef<Mesh>(null);
  // Out at sea off the front and the sides (where the camera sees), each leap running along the shore.
  const reaches = useMemo(
    () =>
      shoreline(shape, 48)
        .filter(({ angle }) => Math.sin(angle) > -0.3)
        .map(({ x, z, angle }) => {
          const [ox, oz] = [Math.cos(angle), Math.sin(angle)];
          return { x: x + ox * OFFSHORE, z: z + oz * OFFSHORE, dx: -oz, dz: ox };
        }),
    [shape],
  );
  const random = useMemo(() => seededRandom(57), []);
  const leap = useRef<Leap | null>(null);
  // The first leap comes soon, so it's seen early in a match.
  const nextAt = useRef(4);
  const splashes = useRef<{ at: number; x: number; z: number }[]>([]);
  const direction = useMemo(() => new Vector3(), []);
  useEffect(() => {
    body.current?.position.set(0, HIDDEN_Y, 0);
  }, []);

  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    const group = body.current;
    if (!group) return;
    if (!leap.current && now >= nextAt.current && reaches.length > 0) {
      const way = random() < 0.5 ? 1 : -1;
      const start = reaches[Math.floor(random() * reaches.length)]!;
      leap.current = { startedAt: now, x: start.x, z: start.z, dx: start.dx * way, dz: start.dz * way };
    }
    const current = leap.current;
    if (current) {
      const t = (now - current.startedAt) / LEAP.seconds;
      if (t >= 1) {
        leap.current = null;
        nextAt.current = now + UNDER.least + random() * UNDER.spread;
        group.position.y = HIDDEN_Y;
      } else {
        const at = (share: number) => {
          const along = (share - 0.5) * LEAP.distance;
          const y = WATER_LEVEL - DIVE + (LEAP.height + DIVE) * Math.sin(Math.PI * share);
          return [current.x + current.dx * along, y, current.z + current.dz * along] as const;
        };
        const [x, y, z] = at(t);
        const [ax, ay, az] = at(Math.min(1, t + 0.02));
        direction.set(ax - x, ay - y, az - z).normalize();
        group.position.set(x, y, z);
        // Its head leads along +x (see HEAD_TURN): turned to the way it travels, pitched along the arc.
        group.rotation.set(0, Math.atan2(-direction.z, direction.x), Math.asin(direction.y), "YZX");
        // Breaking the surface on the way up and back down: a splash each time.
        const surfaced = y > WATER_LEVEL;
        const wasUp = group.userData.surfaced === true;
        if (surfaced !== wasUp) splashes.current = [...splashes.current.slice(-1), { at: now, x, z }];
        group.userData.surfaced = surfaced;
      }
    }
    [firstRing.current, secondRing.current].forEach((mesh, index) => {
      const splash = splashes.current[index];
      if (!mesh) return;
      const age = splash ? (now - splash.at) / SPLASH.seconds : 1;
      if (!splash || age >= 1) {
        (mesh.material as MeshBasicMaterial).opacity = 0;
        return;
      }
      mesh.position.set(splash.x, WATER_LEVEL + 0.04, splash.z);
      mesh.scale.setScalar(0.3 + age * SPLASH.radius);
      (mesh.material as MeshBasicMaterial).opacity = 0.7 * (1 - age);
    });
  });

  const scale = LENGTH / model.size[0];
  return (
    <group>
      <group ref={body}>
        {/* Fitted standing on its base: lowered by half its height so it turns about its middle. */}
        <mesh
          geometry={model.geometry}
          material={model.material}
          scale={scale}
          position-y={-scale / 2}
          rotation-y={HEAD_TURN}
          castShadow
        />
      </group>
      <SplashRing ref={firstRing} />
      <SplashRing ref={secondRing} />
    </group>
  );
}

function SplashRing({ ref }: { ref: Ref<Mesh> }) {
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position-y={HIDDEN_Y}>
      <ringGeometry args={[0.8, 1, 40]} />
      <meshBasicMaterial color="#cfe8f0" transparent opacity={0} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}

/** The river dragon's length, how fast it swims and how low it rides (its middle under the surface). */
const SWIMMER = { length: 3.6, speed: 3.2, ride: 0.45 };
/** Seconds hidden between two swims (at least, plus up to the spread). */
const SWIM_PAUSE = { least: 10, spread: 10 };
/** Over this many units at each end of a swim it rises from, and sinks back into, the deep. */
const SURFACING = 6;

/**
 * The same dragon swimming the island's stream now and then, its back out of the water: it rises at one end,
 * winds down (or up) the whole stream under the bridges and sinks at the other.
 */
export function RiverDragon({ shape }: { shape: IslandShape }) {
  const model = useFittedProp("seaDragon");
  const body = useRef<Group>(null);
  const random = useMemo(() => seededRandom(91), []);
  const swim = useRef<{ startedAt: number; down: boolean } | null>(null);
  const nextAt = useRef(9);
  const scale = SWIMMER.length / model.size[0];
  const [fromZ, toZ] = [shape.backZ - 2, shape.centerZ + shape.halfDepth * 0.95];
  const reach = toZ - fromZ;

  useFrame(({ clock }) => {
    const group = body.current;
    if (!group) return;
    const now = clock.elapsedTime;
    if (!swim.current && now >= nextAt.current) swim.current = { startedAt: now, down: random() < 0.6 };
    const current = swim.current;
    if (!current) return;
    const travelled = (now - current.startedAt) * SWIMMER.speed;
    if (travelled >= reach) {
      swim.current = null;
      nextAt.current = now + SWIM_PAUSE.least + random() * SWIM_PAUSE.spread;
      group.position.y = HIDDEN_Y;
      return;
    }
    const way = current.down ? 1 : -1;
    const z = current.down ? fromZ + travelled : toZ - travelled;
    const x = riverX(shape, z);
    const ahead = riverX(shape, z + way * 0.5);
    const surfaced = Math.min(1, travelled / SURFACING, (reach - travelled) / SURFACING);
    const wave = now * 3 + z * 0.6;
    group.position.set(x, WATER_LEVEL - scale * SWIMMER.ride - (1 - surfaced) * scale + Math.sin(wave) * 0.08, z);
    // Head along +x, turned down the stream, rolling up and down over the swell and swaying side to side.
    const heading = Math.atan2(-(way * 0.5), ahead - x);
    group.rotation.set(0, heading + Math.sin(wave * 0.7) * 0.15, Math.cos(wave) * 0.12, "YZX");
  });

  return (
    <group ref={body} position-y={HIDDEN_Y}>
      <mesh
        geometry={model.geometry}
        material={model.material}
        scale={scale}
        position-y={-scale / 2}
        rotation-y={HEAD_TURN}
        castShadow
      />
    </group>
  );
}
