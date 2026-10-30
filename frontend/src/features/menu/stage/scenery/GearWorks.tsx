"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  ExtrudeGeometry,
  MeshStandardMaterial,
  Path,
  Shape,
  SpriteMaterial,
  type Group,
  type Mesh,
  type Sprite,
} from "three";
import { usePropMesh } from "@/features/match/scene/character/props";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { withDressing, type GroundDressing } from "./groundDressing";
import { GROUND_RADIUS } from "./sceneryKit";
import { useCanvasTexture, useNoiseTexture, type CanvasLook, type NoiseLook } from "./textures";

/** Tooth size shared by every gear, so any two of them mesh: radius = teeth × MODULE. */
const MODULE = 0.018;
const TOOTH_DEPTH = 0.03;
const GEAR_THICKNESS = 0.03;
/** Turn rate of the gear under the figure, in radians a second; the rest follow from their teeth. */
const DRIVE_SPEED = 0.16;
/** Gears set in the floor: the drive under the figure and two meshing with it, `angle` round from its +x. */
const FLOOR_GEARS = [
  { teeth: 20, angle: 0, spokes: 6 },
  { teeth: 12, angle: (140 * Math.PI) / 180, spokes: 4 },
  { teeth: 14, angle: (38 * Math.PI) / 180, spokes: 5 },
];
/** Loose cogs dropped on the floor at the sides. */
const LOOSE_COGS = [
  { x: -0.74, z: 0.22, teeth: 7, turn: 0.4, tilt: 0.08 },
  { x: 0.76, z: 0.16, teeth: 9, turn: 1.1, tilt: -0.1 },
  { x: -0.62, z: 0.46, teeth: 5, turn: 2.3, tilt: 0.25 },
];
/** A brass armillary sphere on its stand at his left (a Meshy prop, 2 tall in its export). */
const GLOBE = { x: -0.6, z: -0.2, height: 0.6, turn: 0.6 };
const CLOCK_Z = -0.92;
const CLOCK_Y = 0.98;
const CLOCK_RADIUS = 0.62;
const CLOCK_BAND = 0.12;
/** Its posts reach from the floor to where the ring's lower arc crosses them. */
const POST = CLOCK_Y - 0.2;
const PIPES = [
  { x: -0.78, z: -0.42, height: 0.56, phase: 0 },
  { x: 0.8, z: -0.48, height: 0.4, phase: 2.4 },
];
const PUFFS = 7;
const PUFF_LIFE = 2.2;
const GLOW = new Color("#ffb347").multiplyScalar(1.8);

/**
 * Cronos's stage instead of the rune pedestal: a riveted bronze floor with gears set into it turning in mesh,
 * a great ring of numerals behind whose hands now and then run backwards, cogs, and pipes puffing steam.
 * Origin on the floor.
 */
export function GearWorks() {
  const globe = usePropMesh("cronosGlobe");
  const plates = useCanvasTexture(PLATES);
  const numerals = useCanvasTexture(NUMERALS);
  const wear = useNoiseTexture(WEAR);
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({
        map: plates,
        transparent: true,
        roughness: 0.6,
        metalness: 0.5,
        depthWrite: false,
      }),
      bronze: new MeshStandardMaterial({ map: wear, color: "#c98a46", metalness: 0.85, roughness: 0.38 }),
      brass: new MeshStandardMaterial({ map: wear, color: "#e0b85a", metalness: 0.9, roughness: 0.3 }),
      iron: new MeshStandardMaterial({ color: "#2a2420", metalness: 0.7, roughness: 0.55 }),
      dial: new MeshStandardMaterial({
        map: numerals,
        emissiveMap: numerals,
        emissive: "#ffae42",
        emissiveIntensity: 0.6,
        metalness: 0.6,
        roughness: 0.45,
      }),
      glow: new MeshStandardMaterial({
        color: "#000000",
        emissive: GLOW,
        toneMapped: false,
        transparent: true,
        opacity: 0.6,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    }),
    [plates, numerals, wear],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const gears = useMemo(() => {
    const shapes = new Map<string, ExtrudeGeometry>();
    const gear = (teeth: number, spokes: number) => {
      const key = `${teeth}:${spokes}`;
      if (!shapes.has(key)) shapes.set(key, gearGeometry(teeth, spokes));
      return shapes.get(key)!;
    };
    return { gear, all: shapes };
  }, []);
  useEffect(() => () => gears.all.forEach((geometry) => geometry.dispose()), [gears]);
  const layout = useMemo(() => {
    const [drive] = FLOOR_GEARS;
    return FLOOR_GEARS.map(({ teeth, angle, spokes }, index) => {
      if (index === 0) return { x: 0, z: 0, teeth, spokes, ratio: 1, phase: 0 };
      const distance = (drive.teeth + teeth) * MODULE - TOOTH_DEPTH;
      // Starts with a gap of its own facing a tooth of the drive, so the two never clip.
      const phase = (drive.teeth * angle + teeth * (angle + Math.PI) - Math.PI) / teeth;
      return {
        x: Math.cos(angle) * distance,
        z: -Math.sin(angle) * distance,
        teeth,
        spokes,
        ratio: -drive.teeth / teeth,
        phase,
      };
    });
  }, []);
  const spinning = useRef<(Group | null)[]>([]);

  useFrame(({ clock }) => {
    const turn = clock.elapsedTime * DRIVE_SPEED;
    layout.forEach(({ ratio, phase }, index) => {
      const gear = spinning.current[index];
      if (gear) gear.rotation.y = ratio * turn + phase;
    });
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {layout.map(({ x, z, teeth, spokes }, index) => (
        <group key={index} position={[x, 0, z]}>
          {/* The pit it turns in, dark through its spoke windows. */}
          <mesh material={materials.iron} rotation-x={-Math.PI / 2} position-y={0.002}>
            <circleGeometry args={[teeth * MODULE + 0.012, 40]} />
          </mesh>
          <group ref={(group) => void (spinning.current[index] = group)} position-y={0.012 - GEAR_THICKNESS}>
            <mesh geometry={gears.gear(teeth, spokes)} material={index === 0 ? materials.bronze : materials.brass} />
          </group>
        </group>
      ))}
      {LOOSE_COGS.map(({ x, z, teeth, turn, tilt }) => (
        <group key={`${x}:${z}`} position={[x, 0, z]} rotation={[tilt, turn, 0]} scale={[1, 0.5, 1]}>
          <mesh geometry={gears.gear(teeth, 0)} material={materials.brass} />
        </group>
      ))}
      <ClockRing materials={materials} gear={gears.gear} />
      <mesh
        geometry={globe.geometry}
        material={globe.material}
        scale={GLOBE.height / 2}
        position={[GLOBE.x, GLOBE.height / 2, GLOBE.z]}
        rotation-y={GLOBE.turn}
      />
      {PIPES.map(({ x, z, height }) => (
        <group key={x} position={[x, 0, z]}>
          <mesh material={materials.iron} position-y={0.02}>
            <cylinderGeometry args={[0.06, 0.07, 0.04, 16]} />
          </mesh>
          <mesh material={materials.bronze} position-y={height / 2}>
            <cylinderGeometry args={[0.03, 0.03, height, 14]} />
          </mesh>
          {[0.3, 0.7].map((at) => (
            <mesh key={at} material={materials.brass} position-y={height * at}>
              <cylinderGeometry args={[0.038, 0.038, 0.02, 14]} />
            </mesh>
          ))}
          <mesh material={materials.brass} position-y={height + 0.015}>
            <cylinderGeometry args={[0.042, 0.032, 0.03, 14]} />
          </mesh>
        </group>
      ))}
      <Steam />
    </group>
  );
}

/** The great ring of numerals on two posts, its hands, a glowing rim, and two cogs turning at its foot. */
function ClockRing({
  materials,
  gear,
}: {
  materials: Record<"bronze" | "brass" | "iron" | "dial" | "glow", MeshStandardMaterial>;
  gear: (teeth: number, spokes: number) => ExtrudeGeometry;
}) {
  const minute = useRef<Group>(null);
  const hour = useRef<Group>(null);
  const cogs = useRef<(Group | null)[]>([]);
  const rim = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Mostly sweeps forward; the swell of the sine briefly overtakes it and winds time back.
    const sweep = -t * 0.6 + 3.4 * Math.sin(t * 0.22);
    if (minute.current) minute.current.rotation.z = sweep;
    if (hour.current) hour.current.rotation.z = sweep / 12 + 0.8;
    const speed = -0.6 + 3.4 * 0.22 * Math.cos(t * 0.22);
    // The rim flares while time runs backwards.
    if (rim.current)
      (rim.current.material as MeshStandardMaterial).opacity = 0.35 + 0.4 * Math.min(1, Math.max(0, speed));
    cogs.current.forEach((cog, index) => {
      if (cog) cog.rotation.y = index % 2 ? -(10 / 7) * sweep * 0.5 + Math.PI - Math.PI / 7 : sweep * 0.5;
    });
  });

  const inner = CLOCK_RADIUS - CLOCK_BAND;
  return (
    <group position={[0, CLOCK_Y, CLOCK_Z]}>
      <mesh material={materials.dial}>
        <ringGeometry args={[inner, CLOCK_RADIUS, 72]} />
      </mesh>
      {[CLOCK_RADIUS, inner].map((radius) => (
        <mesh key={radius} material={materials.brass}>
          <torusGeometry args={[radius, 0.014, 8, 72]} />
        </mesh>
      ))}
      <mesh ref={rim} material={materials.glow} position-z={-0.01}>
        <torusGeometry args={[CLOCK_RADIUS + 0.025, 0.012, 6, 72]} />
      </mesh>
      <mesh material={materials.brass} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.035, 0.04, 16]} />
      </mesh>
      <group ref={minute} position-z={0.03}>
        <mesh material={materials.iron} position-y={inner * 0.47}>
          <boxGeometry args={[0.022, inner * 0.94, 0.01]} />
        </mesh>
      </group>
      <group ref={hour} position-z={0.02}>
        <mesh material={materials.iron} position-y={inner * 0.3}>
          <boxGeometry args={[0.034, inner * 0.6, 0.012]} />
        </mesh>
      </group>
      {/* The posts it stands on, reaching down to the floor. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (CLOCK_RADIUS - 0.04), -CLOCK_Y + POST / 2, -0.02]}>
          <mesh material={materials.bronze}>
            <boxGeometry args={[0.05, POST, 0.05]} />
          </mesh>
          <mesh material={materials.iron} position-y={-POST / 2 + 0.02}>
            <boxGeometry args={[0.1, 0.04, 0.1]} />
          </mesh>
        </group>
      ))}
      {[
        { x: 0.34, y: -0.7, teeth: 10 },
        { x: 0.34 + (10 + 7) * MODULE - TOOTH_DEPTH, y: -0.7, teeth: 7 },
      ].map(({ x, y, teeth }, index) => (
        <group key={index} position={[x, y, 0.03]} rotation-x={Math.PI / 2}>
          <group ref={(group) => void (cogs.current[index] = group)}>
            <mesh geometry={gear(teeth, 3)} material={materials.brass} />
          </group>
        </group>
      ))}
    </group>
  );
}

/** Puffs of steam out of the pipes, coming in spurts. */
function Steam() {
  const disc = useSoftDisc();
  const material = useMemo(
    () => new SpriteMaterial({ map: disc, color: "#f2ece4", transparent: true, depthWrite: false }),
    [disc],
  );
  useEffect(() => () => material.dispose(), [material]);
  const puffs = useMemo(
    () =>
      PIPES.flatMap((pipe) =>
        Array.from({ length: PUFFS }, (_, index) => ({
          pipe,
          offset: (index / PUFFS) * PUFF_LIFE,
          material: material.clone(),
        })),
      ),
    [material],
  );
  useEffect(() => () => puffs.forEach((puff) => puff.material.dispose()), [puffs]);
  const sprites = useRef<(Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    puffs.forEach(({ pipe, offset, material: puffMaterial }, index) => {
      const sprite = sprites.current[index];
      if (!sprite) return;
      const age = (t + offset) % PUFF_LIFE;
      const life = age / PUFF_LIFE;
      // Strong when it left the pipe during a spurt, faint between them.
      const born = t - age;
      const spurt = 0.25 + 0.75 * Math.max(0, Math.sin(born * 0.9 + pipe.phase)) ** 2;
      sprite.position.set(
        pipe.x + Math.sin(life * 3 + index) * 0.03 * life,
        pipe.height + 0.03 + life * 0.45,
        pipe.z + life * 0.05,
      );
      sprite.scale.setScalar(0.06 + life * 0.22);
      puffMaterial.opacity = spurt * 0.35 * Math.min(1, life * 8) * (1 - life);
    });
  });

  return (
    <>
      {puffs.map(({ material: puffMaterial }, index) => (
        <sprite key={index} ref={(sprite) => void (sprites.current[index] = sprite)} material={puffMaterial} />
      ))}
    </>
  );
}

/** A flat spur gear lying on its face, its top at y = GEAR_THICKNESS: trapezoid teeth, a hub, spoke windows. */
function gearGeometry(teeth: number, spokes: number): ExtrudeGeometry {
  const outer = teeth * MODULE;
  const root = outer - TOOTH_DEPTH;
  const pitch = (Math.PI * 2) / teeth;
  const shape = new Shape();
  for (let tooth = 0; tooth < teeth; tooth++) {
    const at = tooth * pitch;
    const corners = [
      [root, at - pitch * 0.3],
      [outer, at - pitch * 0.17],
      [outer, at + pitch * 0.17],
      [root, at + pitch * 0.3],
    ];
    corners.forEach(([radius, angle], corner) => {
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (tooth === 0 && corner === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  const hub = new Path();
  hub.absarc(0, 0, Math.max(0.012, outer * 0.12), 0, Math.PI * 2, true);
  shape.holes.push(hub);
  if (spokes > 0) {
    const from = outer * 0.3;
    const to = root * 0.78;
    const spoke = 0.32 / spokes;
    for (let window = 0; window < spokes; window++) {
      const start = (window / spokes) * Math.PI * 2 + spoke;
      const end = ((window + 1) / spokes) * Math.PI * 2 - spoke;
      const hole = new Path();
      hole.absarc(0, 0, to, start, end, false);
      hole.absarc(0, 0, from, end, start, true);
      hole.closePath();
      shape.holes.push(hole);
    }
  }
  const geometry = new ExtrudeGeometry(shape, {
    depth: GEAR_THICKNESS,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 1,
    curveSegments: 10,
  });
  // Laid flat: the shape's plane becomes the floor, its angles turning the same way as rotation.y.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -0.004, 0);
  return geometry;
}

/** Riveted iron plates, scuffed and oiled, fading out towards the rim. */
function drawPlates(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(83);
  const plate = 128;
  context.fillStyle = "#120e0a";
  context.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += plate) {
    for (let x = 0; x < size; x += plate) {
      const shade = 50 + random() * 20;
      context.fillStyle = `rgb(${shade + 14},${shade + 4},${shade - 8})`;
      context.fillRect(x + 3, y + 3, plate - 6, plate - 6);
      context.fillStyle = "rgba(200,150,80,0.55)";
      for (const [rx, ry] of [
        [12, 12],
        [plate - 12, 12],
        [12, plate - 12],
        [plate - 12, plate - 12],
        [plate / 2, 12],
        [plate / 2, plate - 12],
      ]) {
        context.beginPath();
        context.arc(x + rx, y + ry, 3.5, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
  for (let scratch = 0; scratch < 120; scratch++) {
    const x = random() * size;
    const y = random() * size;
    const angle = random() * Math.PI;
    const length = 6 + random() * 30;
    context.strokeStyle = `rgba(190,150,100,${0.08 + random() * 0.15})`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }
  for (let stain = 0; stain < 18; stain++) {
    const x = random() * size;
    const y = random() * size;
    const radius = 14 + random() * 36;
    const oil = context.createRadialGradient(x, y, 0, x, y, radius);
    oil.addColorStop(0, "rgba(10,6,4,0.45)");
    oil.addColorStop(1, "rgba(10,6,4,0)");
    context.fillStyle = oil;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

/** Roman numerals and minute ticks round the band of the dial (the ring's UVs span its outer square). */
function drawNumerals(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  context.fillStyle = "#2a1c10";
  context.fillRect(0, 0, size, size);
  const outer = centre;
  const inner = centre * ((CLOCK_RADIUS - CLOCK_BAND) / CLOCK_RADIUS);
  const numerals = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  context.fillStyle = "#ffd27a";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `bold ${Math.round((outer - inner) * 0.5)}px Georgia, serif`;
  numerals.forEach((numeral, index) => {
    const angle = (index / 12) * Math.PI * 2;
    const radius = (inner + outer) / 2 - (outer - inner) * 0.06;
    context.save();
    context.translate(centre + Math.sin(angle) * radius, centre - Math.cos(angle) * radius);
    context.rotate(angle);
    context.fillText(numeral, 0, 0);
    context.restore();
  });
  context.strokeStyle = "#ffd27a";
  for (let tick = 0; tick < 60; tick++) {
    const angle = (tick / 60) * Math.PI * 2;
    const length = tick % 5 ? (outer - inner) * 0.1 : (outer - inner) * 0.2;
    context.lineWidth = tick % 5 ? 1.5 : 3;
    context.beginPath();
    context.moveTo(centre + Math.sin(angle) * (outer - 3), centre - Math.cos(angle) * (outer - 3));
    context.lineTo(centre + Math.sin(angle) * (outer - 3 - length), centre - Math.cos(angle) * (outer - 3 - length));
    context.stroke();
  }
}

/** A brass walkway riveted across the plates to the clock, bolts dropped about and seams glowing like a furnace. */
const WORKS_GROUND: GroundDressing = {
  wash: { colour: "#f59e0b", alpha: 0.25 },
  path: { kind: "boards", colour: "#8a6a35", edge: "#2b2116", width: [0.17, 0.25], wind: 0 },
  litter: [{ shape: "speck", colours: ["#c8a050", "#6b5636"], count: 70, size: 3 }],
  glow: { colour: "#ffb347", count: 5 },
};
const PLATES: CanvasLook = { size: 512, draw: withDressing(drawPlates, WORKS_GROUND), fadeFrom: 0.5 };
const NUMERALS: CanvasLook = { size: 1024, draw: drawNumerals };
const WEAR: NoiseLook = {
  base: [200, 170, 130],
  dark: [110, 84, 56],
  light: [240, 222, 190],
  fadeOut: false,
};
