"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  SpriteMaterial,
  type Group,
  type Mesh,
  type Sprite,
} from "three";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { withDressing, type GroundDressing } from "./kit/groundDressing";
import { useCanvasTexture, type CanvasLook } from "./kit/textures";

const FLOOR_RADIUS = 1.4;
/** Across-corners radius of a floor hex, in canvas pixels. */
const HEX = 26;
const PAD_RADIUS = 0.46;
const PAD_HEIGHT = 0.035;
const HAZARD_WIDTH = 0.06;
const SEAM = new Color("#5fd8ff");
const LOCKED = new Color("#ff4b5c");
const TARGET = new Color("#7fe6ff");
/** The reticle on the floor ahead of him; a lock-on cycle of `RETICLE_CYCLE` seconds, locked for the last second. */
const RETICLE_Z = 0.64;
const RETICLE_RADIUS = 0.2;
const RETICLE_CYCLE = 4;
const CRATES = [
  { x: -0.64, z: -0.56, size: 0.24, turn: 0.35, y: 0 },
  { x: -0.38, z: -0.78, size: 0.18, turn: -0.2, y: 0 },
  { x: -0.62, z: -0.58, size: 0.15, turn: 0.9, y: 0.24 },
];
const PYLONS = [-0.22, 0.22];
const BEACONS = [
  { x: -0.62, y: 0.4, z: -0.58, phase: 0 },
  { x: 0.68, y: 0.56, z: -0.72, phase: 1.3 },
  { x: -0.22, y: 0.74, z: -0.9, phase: 0.6 },
  { x: 0.22, y: 0.74, z: -0.9, phase: 2.1 },
];

const SEAM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SEAM_FRAGMENT = /* glsl */ `
  uniform sampler2D uSeams;
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float seam = texture2D(uSeams, vUv).r;
    float radius = length(vUv * 2.0 - 1.0);
    // A ring of light running outwards through the seams, every few seconds.
    float wave = fract(uTime * 0.3) * 1.15;
    float scan = exp(-pow((radius - wave) / 0.07, 2.0));
    float rim = 1.0 - smoothstep(0.5, 0.95, radius);
    float glow = seam * (0.16 + 1.5 * scan) * rim;
    gl_FragColor = vec4(uColor * glow, glow);
    #include <colorspace_fragment>
  }
`;

/**
 * Unidade Alva's stage instead of the rune pedestal: a launch pad ringed in hazard stripes on a hex-plated deck
 * whose seams pulse with a scan, crates and a terminal behind, beacons, and a target reticle locking on ahead.
 * Origin on the floor.
 */
export function HangarBay() {
  const deck = useCanvasTexture(DECK);
  const seams = useCanvasTexture(SEAMS);
  const pad = useCanvasTexture(PAD);
  const hazard = useCanvasTexture(HAZARD);
  const crate = useCanvasTexture(CRATE);
  const screen = useCanvasTexture(SCREEN);
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      deck: new MeshStandardMaterial({
        map: deck,
        transparent: true,
        roughness: 0.45,
        metalness: 0.6,
        depthWrite: false,
      }),
      seams: new ShaderMaterial({
        uniforms: { uSeams: { value: seams }, uTime: { value: 0 }, uColor: { value: SEAM } },
        vertexShader: SEAM_VERTEX,
        fragmentShader: SEAM_FRAGMENT,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      pad: new MeshStandardMaterial({ map: pad, roughness: 0.35, metalness: 0.75 }),
      padSide: new MeshStandardMaterial({ color: "#3a4250", roughness: 0.4, metalness: 0.8 }),
      hazard: new MeshStandardMaterial({ map: hazard, roughness: 0.6, metalness: 0.2 }),
      crate: new MeshStandardMaterial({ map: crate, roughness: 0.55, metalness: 0.5 }),
      steel: new MeshStandardMaterial({ color: "#8a94a3", roughness: 0.35, metalness: 0.85 }),
      dark: new MeshStandardMaterial({ color: "#1c222c", roughness: 0.5, metalness: 0.6 }),
      screen: new MeshBasicMaterial({ map: screen, color: "#9be8ff", toneMapped: false }),
      strip: new MeshBasicMaterial({ color: SEAM.clone().multiplyScalar(1.6), transparent: true, toneMapped: false }),
      beacon: new SpriteMaterial({
        map: disc,
        color: LOCKED.clone().multiplyScalar(2),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [deck, seams, pad, hazard, crate, screen, disc],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const beacons = useRef<(Sprite | null)[]>([]);
  const scan = useRef<Mesh>(null);
  const strips = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (scan.current) (scan.current.material as ShaderMaterial).uniforms.uTime.value = t;
    screen.offset.setY((t * 0.08) % 1);
    strips.current.forEach((strip) => {
      if (strip) (strip.material as MeshBasicMaterial).opacity = 0.55 + 0.35 * Math.sin(t * 2.2);
    });
    beacons.current.forEach((beacon, index) => {
      if (!beacon) return;
      const on = Math.sin(t * 2.6 + BEACONS[index].phase) > 0.55 ? 1 : 0.15;
      beacon.scale.setScalar(0.07 * on + 0.02);
    });
  });

  return (
    <group>
      <mesh material={materials.deck} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[FLOOR_RADIUS, 64]} />
      </mesh>
      <mesh ref={scan} material={materials.seams} rotation-x={-Math.PI / 2} position-y={0.003} renderOrder={1}>
        <circleGeometry args={[FLOOR_RADIUS, 64]} />
      </mesh>
      {/* Top flush with the floor the figure stands on, its side standing proud of the deck below. */}
      <mesh material={[materials.padSide, materials.pad, materials.padSide]} position-y={-PAD_HEIGHT / 2 + 0.004}>
        <cylinderGeometry args={[PAD_RADIUS, PAD_RADIUS + 0.015, PAD_HEIGHT, 64]} />
      </mesh>
      <mesh material={materials.hazard} rotation-x={-Math.PI / 2} position-y={0.004}>
        <ringGeometry args={[PAD_RADIUS + 0.02, PAD_RADIUS + 0.02 + HAZARD_WIDTH, 96]} />
      </mesh>
      <Reticle />
      {CRATES.map(({ x, z, size, turn, y }) => (
        <mesh key={`${x}:${z}:${y}`} material={materials.crate} position={[x, y + size / 2, z]} rotation-y={turn}>
          <boxGeometry args={[size, size, size]} />
        </mesh>
      ))}
      <group position={[0.62, 0, -0.62]} rotation-y={-0.5}>
        <mesh material={materials.dark} position-y={0.2}>
          <boxGeometry args={[0.18, 0.4, 0.14]} />
        </mesh>
        <mesh material={materials.steel} position-y={0.41}>
          <boxGeometry args={[0.24, 0.03, 0.18]} />
        </mesh>
        <group position={[0, 0.44, 0.02]} rotation-x={-0.6}>
          <mesh material={materials.dark}>
            <boxGeometry args={[0.24, 0.16, 0.015]} />
          </mesh>
          <mesh material={materials.screen} position-z={0.009}>
            <planeGeometry args={[0.21, 0.13]} />
          </mesh>
        </group>
      </group>
      {PYLONS.map((x) => (
        <group key={x} position={[x, 0, -0.9]}>
          <mesh material={materials.steel} position-y={0.36}>
            <boxGeometry args={[0.05, 0.72, 0.05]} />
          </mesh>
          <mesh
            ref={(mesh) => void (strips.current[PYLONS.indexOf(x)] = mesh)}
            material={materials.strip}
            position={[0, 0.36, 0.027]}
          >
            <planeGeometry args={[0.012, 0.6]} />
          </mesh>
          <mesh material={materials.dark} position-y={0.02}>
            <boxGeometry args={[0.1, 0.04, 0.1]} />
          </mesh>
        </group>
      ))}
      {BEACONS.map(({ x, y, z }, index) => (
        <sprite
          key={index}
          ref={(sprite) => void (beacons.current[index] = sprite)}
          material={materials.beacon}
          position={[x, y, z]}
        />
      ))}
    </group>
  );
}

/** A hologram reticle on the floor: its outer ring turning, brackets closing in, then flashing red when locked. */
function Reticle() {
  const ring = useCanvasTexture(RETICLE_RING);
  const brackets = useCanvasTexture(RETICLE_BRACKETS);
  const materials = useMemo(
    () =>
      [ring, brackets].map(
        (map) =>
          new MeshBasicMaterial({
            map,
            color: TARGET,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [ring, brackets],
  );
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const cycle = (t % RETICLE_CYCLE) / (RETICLE_CYCLE - 1);
    const locked = cycle >= 1;
    if (outer.current) outer.current.rotation.z = t * 0.5;
    if (inner.current) {
      inner.current.rotation.z = locked ? Math.PI / 4 : -t * 1.2;
      inner.current.scale.setScalar(locked ? 0.82 : 1.5 - 0.68 * cycle ** 2);
    }
    const blink = locked && Math.sin(t * 30) > 0;
    materials.forEach((material) => {
      material.color.copy(locked ? LOCKED : TARGET).multiplyScalar(blink ? 2.2 : 1.3);
    });
  });

  return (
    <group position={[0, 0.006, RETICLE_Z]} rotation-x={-Math.PI / 2}>
      <group ref={outer}>
        <mesh material={materials[0]} renderOrder={2}>
          <planeGeometry args={[RETICLE_RADIUS * 2, RETICLE_RADIUS * 2]} />
        </mesh>
      </group>
      <group ref={inner}>
        <mesh material={materials[1]} renderOrder={2}>
          <planeGeometry args={[RETICLE_RADIUS * 1.2, RETICLE_RADIUS * 1.2]} />
        </mesh>
      </group>
    </group>
  );
}

/** Calls `trace` with the corners of every hex of a flat-topped grid covering the canvas. */
function eachHex(size: number, trace: (corners: [number, number][], index: number) => void) {
  const across = HEX * 1.5;
  const down = HEX * Math.sqrt(3);
  let index = 0;
  for (let column = -1; column * across < size + HEX; column++) {
    for (let row = -1; row * down < size + HEX; row++) {
      const cx = column * across;
      const cy = row * down + (column % 2 ? down / 2 : 0);
      const corners = Array.from({ length: 6 }, (_, corner): [number, number] => {
        const angle = (corner / 6) * Math.PI * 2;
        return [cx + Math.cos(angle) * HEX, cy + Math.sin(angle) * HEX];
      });
      trace(corners, index++);
    }
  }
}

function hexPath(context: CanvasRenderingContext2D, corners: [number, number][]) {
  context.beginPath();
  corners.forEach(([x, y], corner) => (corner ? context.lineTo(x, y) : context.moveTo(x, y)));
  context.closePath();
}

/** Gunmetal hex plates, each its own shade with a lit upper edge, a bolt and scuffs. */
function drawDeck(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(97);
  context.fillStyle = "#0b0e12";
  context.fillRect(0, 0, size, size);
  eachHex(size, (corners) => {
    const shade = 48 + random() * 22;
    hexPath(context, corners);
    context.fillStyle = `rgb(${shade - 4},${shade + 2},${shade + 10})`;
    context.fill();
    context.strokeStyle = "rgba(170,186,206,0.35)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(...corners[3]);
    [4, 5, 0].forEach((corner) => context.lineTo(...corners[corner]));
    context.stroke();
    const [x, y] = corners.reduce(([sx, sy], [px, py]) => [sx + px / 6, sy + py / 6], [0, 0]);
    if (random() < 0.4) {
      context.fillStyle = "rgba(20,24,30,0.8)";
      context.beginPath();
      context.arc(x, y, 2.5, 0, Math.PI * 2);
      context.fill();
    }
  });
  for (let fleck = 0; fleck < 2400; fleck++) {
    context.fillStyle = random() < 0.5 ? "rgba(8,10,14,0.3)" : "rgba(150,166,186,0.15)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1);
  }
}

/** Just the joints between the deck's hexes, white on black, for the scan shader. */
function drawSeams(context: CanvasRenderingContext2D, size: number) {
  context.fillStyle = "#000000";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 2.5;
  eachHex(size, (corners) => {
    hexPath(context, corners);
    context.stroke();
  });
}

/** The pad's face: brushed steel, alignment rings and the unit's mark. */
function drawPad(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(101);
  const centre = size / 2;
  context.fillStyle = "#5c6574";
  context.fillRect(0, 0, size, size);
  for (let stroke = 0; stroke < 260; stroke++) {
    const radius = random() * centre;
    context.strokeStyle = `rgba(${random() < 0.5 ? "30,36,44" : "190,200,214"},0.12)`;
    context.beginPath();
    context.arc(centre, centre, radius, random() * 6, random() * 6 + 1.5);
    context.stroke();
  }
  context.strokeStyle = "rgba(220,232,245,0.7)";
  [0.92, 0.86, 0.4].forEach((share, index) => {
    context.lineWidth = index === 1 ? 2 : 5;
    context.beginPath();
    context.arc(centre, centre, centre * share, 0, Math.PI * 2);
    context.stroke();
  });
  context.lineWidth = 6;
  for (let tick = 0; tick < 4; tick++) {
    const angle = (tick / 4) * Math.PI * 2 + Math.PI / 4;
    context.beginPath();
    context.moveTo(centre + Math.cos(angle) * centre * 0.55, centre + Math.sin(angle) * centre * 0.55);
    context.lineTo(centre + Math.cos(angle) * centre * 0.8, centre + Math.sin(angle) * centre * 0.8);
    context.stroke();
  }
  context.fillStyle = "rgba(230,240,250,0.75)";
  context.font = `bold ${Math.round(size * 0.06)}px monospace`;
  context.textAlign = "center";
  context.fillText("ALVA-01", centre, centre + centre * 0.72);
}

/** Yellow and black wedges, slanted, so the ring reads as hazard tape all the way round. */
function drawHazard(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  const wedges = 64;
  context.fillStyle = "#15130e";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#f2c230";
  for (let wedge = 0; wedge < wedges; wedge += 2) {
    const from = (wedge / wedges) * Math.PI * 2;
    const to = ((wedge + 1) / wedges) * Math.PI * 2;
    const slant = (0.8 / wedges) * Math.PI * 2;
    const inner = centre * 0.8;
    context.beginPath();
    context.moveTo(centre + Math.cos(from) * inner, centre + Math.sin(from) * inner);
    context.lineTo(centre + Math.cos(from + slant) * centre, centre + Math.sin(from + slant) * centre);
    context.lineTo(centre + Math.cos(to + slant) * centre, centre + Math.sin(to + slant) * centre);
    context.lineTo(centre + Math.cos(to) * inner, centre + Math.sin(to) * inner);
    context.closePath();
    context.fill();
  }
}

/** A steel crate face: frame, cross braces, a stencilled number and hazard corners. */
function drawCrate(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(107);
  context.fillStyle = "#c9ced6";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#3a4250";
  const frame = size * 0.08;
  context.fillRect(0, 0, size, frame);
  context.fillRect(0, size - frame, size, frame);
  context.fillRect(0, 0, frame, size);
  context.fillRect(size - frame, 0, frame, size);
  context.strokeStyle = "rgba(58,66,80,0.6)";
  context.lineWidth = size * 0.03;
  context.beginPath();
  context.moveTo(frame, frame);
  context.lineTo(size - frame, size - frame);
  context.stroke();
  context.fillStyle = "#e0a91f";
  for (const [x, y] of [
    [frame, frame],
    [size - frame * 3, size - frame * 3],
  ]) {
    context.fillRect(x, y, frame * 2, frame * 2);
  }
  context.fillStyle = "rgba(30,34,42,0.85)";
  context.font = `bold ${Math.round(size * 0.22)}px monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("07", size * 0.62, size * 0.38);
  for (let fleck = 0; fleck < 500; fleck++) {
    context.fillStyle = random() < 0.5 ? "rgba(40,44,52,0.2)" : "rgba(255,255,255,0.2)";
    context.fillRect(random() * size, random() * size, 1 + random() * 3, 1);
  }
}

/** Rows of telemetry bars and a target box, tiling vertically so it can scroll. */
function drawScreen(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(109);
  context.fillStyle = "#04121c";
  context.fillRect(0, 0, size, size);
  const row = size / 16;
  for (let line = 0; line < 16; line++) {
    context.fillStyle = `rgba(120,230,255,${0.4 + random() * 0.5})`;
    let x = row * 0.5;
    while (x < size * (0.4 + random() * 0.55)) {
      const width = row * (0.5 + random() * 2.5);
      context.fillRect(x, line * row + row * 0.3, width, row * 0.4);
      x += width + row * 0.4;
    }
  }
  context.strokeStyle = "rgba(255,90,100,0.9)";
  context.lineWidth = 3;
  context.strokeRect(size * 0.68, size * 0.2, size * 0.22, size * 0.22);
}

/** The outer ring of the reticle: a dashed circle, a solid one and ticks at the quarters. */
function drawReticleRing(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 4;
  context.setLineDash([size * 0.06, size * 0.035]);
  context.beginPath();
  context.arc(centre, centre, centre * 0.92, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  context.lineWidth = 2;
  context.beginPath();
  context.arc(centre, centre, centre * 0.78, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 5;
  for (let tick = 0; tick < 4; tick++) {
    const angle = (tick / 4) * Math.PI * 2;
    context.beginPath();
    context.moveTo(centre + Math.cos(angle) * centre * 0.62, centre + Math.sin(angle) * centre * 0.62);
    context.lineTo(centre + Math.cos(angle) * centre * 0.86, centre + Math.sin(angle) * centre * 0.86);
    context.stroke();
  }
}

/** Four corner brackets closing on a centre diamond. */
function drawReticleBrackets(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  const reach = size * 0.42;
  const arm = size * 0.16;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 6;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const x = centre + sx * reach;
    const y = centre + sy * reach;
    context.beginPath();
    context.moveTo(x - sx * arm, y);
    context.lineTo(x, y);
    context.lineTo(x, y - sy * arm);
    context.stroke();
  }
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(centre, centre - 10);
  context.lineTo(centre + 10, centre);
  context.lineTo(centre, centre + 10);
  context.lineTo(centre - 10, centre);
  context.closePath();
  context.fill();
}

/** Yellow guide lines and chevrons on the deck, leading back into the bay. */
const HANGAR_GROUND: GroundDressing = {
  wash: { colour: "#8ecbff", alpha: 0.22 },
  path: { kind: "lines", colour: "rgba(255,204,51,0.85)", edge: "rgba(255,204,51,0.9)", width: [0.2, 0.3], wind: 0 },
  litter: [{ shape: "speck", colours: ["rgba(200,215,230,0.6)"], count: 60, size: 2 }],
};
const DECK: CanvasLook = { size: 512, draw: withDressing(drawDeck, HANGAR_GROUND), fadeFrom: 0.5 };
const SEAMS: CanvasLook = { size: 512, draw: drawSeams, linear: true };
const PAD: CanvasLook = { size: 512, draw: drawPad };
const HAZARD: CanvasLook = { size: 512, draw: drawHazard };
const CRATE: CanvasLook = { size: 256, draw: drawCrate };
const SCREEN: CanvasLook = { size: 256, draw: drawScreen, tile: true };
const RETICLE_RING: CanvasLook = { size: 256, draw: drawReticleRing };
const RETICLE_BRACKETS: CanvasLook = { size: 256, draw: drawReticleBrackets };
