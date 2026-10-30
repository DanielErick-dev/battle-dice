"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DodecahedronGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  SpriteMaterial,
  type Mesh,
  type Sprite,
} from "three";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { withDressing, type GroundDressing } from "./groundDressing";
import { GROUND_RADIUS } from "./sceneryKit";
import { useCanvasTexture, useNoiseTexture, type CanvasLook, type NoiseLook } from "./textures";

/** Smooth stones on the sand: `size` is the long side; flattened as the tide leaves them. */
const STONES = [
  { x: -0.62, z: 0.12, size: 0.07, turn: 0.4 },
  { x: -0.48, z: 0.4, size: 0.045, turn: 1.2 },
  { x: 0.52, z: 0.22, size: 0.06, turn: -0.6 },
  { x: 0.7, z: -0.12, size: 0.04, turn: 2.1 },
  { x: 0.34, z: -0.32, size: 0.05, turn: 0.9 },
  { x: -0.28, z: -0.34, size: 0.035, turn: -1.4 },
];
const SCALLOPS = [
  { x: -0.4, z: 0.22, turn: 0.6, tint: "#e9cfc0" },
  { x: 0.38, z: 0.46, turn: -0.9, tint: "#f0e2cf" },
  { x: 0.6, z: 0.02, turn: 2.2, tint: "#d9a9a0" },
];
const SPIRALS = [
  { x: -0.7, z: -0.1, turn: 0.8 },
  { x: 0.22, z: 0.58, turn: -2.4 },
];
/** The cairn on the right, bottom stone first: [width, height]. */
const CAIRN: [number, number][] = [
  [0.13, 0.06],
  [0.1, 0.05],
  [0.075, 0.04],
  [0.05, 0.03],
];
const GLINTS = 46;
const VOTIVE = new Color("#9cc8ff").multiplyScalar(2.4);

/** Where the water's edge runs across the sand, as a depth `z` for a given `x` (negative is the back). */
function shoreline(x: number) {
  return -0.36 - 0.06 * Math.sin(x * 3.1 + 0.6) - 0.03 * Math.sin(x * 7.3);
}

/**
 * Themis's stage instead of the rune pedestal: a moonlit shore of wet sand, a sheet of shallow water with
 * its foam line washing in, shells and smooth stones, and a broken shrine half in the sea. Origin on the floor.
 */
export function MoonlitShore() {
  const sand = useCanvasTexture(SAND);
  const ripples = useCanvasTexture(RIPPLES);
  const waterMask = useCanvasTexture(WATER_MASK);
  const foam = useCanvasTexture(FOAM);
  const stoneMap = useNoiseTexture(STONE);
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      sand: new MeshStandardMaterial({ map: sand, transparent: true, roughness: 0.85, depthWrite: false }),
      water: new MeshStandardMaterial({
        color: "#3d6ea8",
        map: ripples,
        alphaMap: waterMask,
        transparent: true,
        roughness: 0.12,
        metalness: 0.35,
        depthWrite: false,
      }),
      foam: new MeshStandardMaterial({ map: foam, transparent: true, roughness: 0.6, depthWrite: false }),
      stone: new MeshStandardMaterial({ map: stoneMap, roughness: 0.8 }),
      // The courses the sea washes over, darker and greener with weed.
      sunken: new MeshStandardMaterial({ map: stoneMap, color: "#7f9a8e", roughness: 0.7 }),
      pebble: new MeshStandardMaterial({ color: "#5d6470", roughness: 0.35 }),
      shell: new MeshStandardMaterial({ color: "#f4e6d4", roughness: 0.5, flatShading: true }),
      rune: new MeshStandardMaterial({
        color: "#0b1830",
        emissive: "#5aa2ff",
        emissiveIntensity: 1.2,
        toneMapped: false,
      }),
      votive: new SpriteMaterial({
        map: disc,
        color: VOTIVE,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      halo: new SpriteMaterial({
        map: disc,
        color: "#5b8fe0",
        opacity: 0.2,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    }),
    [sand, ripples, waterMask, foam, stoneMap, disc],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const geometries = useMemo(
    () => ({
      pebble: new SphereGeometry(1, 14, 10),
      chunk: new DodecahedronGeometry(1, 0),
      // A quarter dome, flat-shaded so its facets read as the ribs of a scallop.
      scallop: new SphereGeometry(1, 9, 4, 0, Math.PI, 0, Math.PI / 2),
      spiral: new ConeGeometry(1, 1, 7, 1),
    }),
    [],
  );
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);
  const foamSheet = useRef<Mesh>(null);
  const votive = useRef<Sprite>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ripples.offset.set(Math.sin(t * 0.2) * 0.02, t * 0.035);
    // Washes up the sand and draws back, thinning as it reaches furthest.
    const wash = Math.sin(t * 0.55);
    if (foamSheet.current) {
      foamSheet.current.position.z = 0.035 * wash;
      (foamSheet.current.material as MeshStandardMaterial).opacity = 0.75 - 0.3 * wash;
    }
    const flicker = 1 + 0.1 * Math.sin(t * 11) + 0.06 * Math.sin(t * 23);
    votive.current?.scale.set(0.035 * flicker, 0.06 * (2 - flicker), 1);
  });

  return (
    <group>
      <mesh material={materials.sand} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      <mesh material={materials.water} rotation-x={-Math.PI / 2} position-y={0.012} renderOrder={1}>
        <planeGeometry args={[2 * GROUND_RADIUS, 2 * GROUND_RADIUS]} />
      </mesh>
      <mesh ref={foamSheet} material={materials.foam} rotation-x={-Math.PI / 2} position-y={0.014} renderOrder={2}>
        <planeGeometry args={[2 * GROUND_RADIUS, 2 * GROUND_RADIUS]} />
      </mesh>
      <MoonGlints />
      <Shrine
        stone={materials.stone}
        sunken={materials.sunken}
        rune={materials.rune}
        flame={materials.votive}
        halo={materials.halo}
        chunk={geometries.chunk}
        votive={votive}
      />
      <group position={[0.62, -0.02, -0.6]} rotation-y={0.4}>
        {CAIRN.map(([width, height], index) => {
          const y = CAIRN.slice(0, index).reduce((sum, [, below]) => sum + below * 1.7, 0) + height * 0.8;
          return (
            <mesh
              key={index}
              geometry={geometries.pebble}
              material={index === 0 ? materials.sunken : materials.pebble}
              position={[index * 0.006, y, (index % 2) * 0.008]}
              rotation-z={(index % 2 ? 1 : -1) * 0.12}
              scale={[width, height, width * 0.85]}
            />
          );
        })}
      </group>
      {STONES.map(({ x, z, size, turn }) => (
        <mesh
          key={`${x}:${z}`}
          geometry={geometries.pebble}
          material={materials.pebble}
          position={[x, size * 0.15, z]}
          rotation-y={turn}
          scale={[size, size * 0.38, size * 0.7]}
        />
      ))}
      {SCALLOPS.map(({ x, z, turn, tint }) => (
        <mesh
          key={`${x}:${z}`}
          geometry={geometries.scallop}
          position={[x, 0, z]}
          rotation={[0, turn, 0]}
          scale={[0.032, 0.012, 0.03]}
        >
          <meshStandardMaterial color={tint} roughness={0.5} flatShading />
        </mesh>
      ))}
      {SPIRALS.map(({ x, z, turn }) => (
        <mesh
          key={`${x}:${z}`}
          geometry={geometries.spiral}
          material={materials.shell}
          position={[x, 0.012, z]}
          rotation={[0, turn, Math.PI / 2 - 0.15]}
          scale={[0.014, 0.05, 0.014]}
        />
      ))}
    </group>
  );
}

/** A plinth sunk in the shallows, its column snapped off, a stone shield with a glowing rune and a votive light. */
function Shrine({
  stone,
  sunken,
  rune,
  flame,
  halo,
  chunk,
  votive,
}: Record<"stone" | "sunken" | "rune", MeshStandardMaterial> & {
  flame: SpriteMaterial;
  halo: SpriteMaterial;
  chunk: DodecahedronGeometry;
  votive: RefObject<Sprite | null>;
}) {
  const r = 0.055;
  return (
    <group position={[-0.56, -0.03, -0.68]} rotation-y={0.45}>
      <mesh material={sunken} position-y={0.02}>
        <boxGeometry args={[0.38, 0.08, 0.3]} />
      </mesh>
      <mesh material={sunken} position-y={0.085}>
        <boxGeometry args={[0.27, 0.05, 0.22]} />
      </mesh>
      <mesh material={stone} position-y={0.11 + 0.2}>
        <cylinderGeometry args={[r * 0.9, r, 0.4, 12]} />
      </mesh>
      <mesh geometry={chunk} material={stone} position-y={0.52} rotation-y={0.7} scale={[r, r * 0.55, r]} />
      {/* The rest of the column, toppled into the water. */}
      <mesh material={stone} position={[0.26, 0.02, 0.14]} rotation={[0.1, -0.5, Math.PI / 2]}>
        <cylinderGeometry args={[r * 0.9, r * 0.9, 0.22, 12]} />
      </mesh>
      <mesh geometry={chunk} material={stone} position={[-0.2, 0.01, 0.12]} scale={[0.04, 0.03, 0.035]} />
      {/* Her bulwark carved in stone, leant against the column. */}
      <group position={[0, 0.2, r + 0.03]} rotation-x={Math.PI / 2 - 0.25}>
        <mesh material={stone}>
          <cylinderGeometry args={[0.075, 0.075, 0.014, 20]} />
        </mesh>
        <mesh material={rune} position-y={0.008} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.05, 0.005, 6, 28]} />
        </mesh>
        <mesh material={rune} position-y={0.009}>
          <sphereGeometry args={[0.012, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
      <group position={[0.1, 0.11, 0.07]}>
        <mesh material={stone} position-y={0.012}>
          <cylinderGeometry args={[0.014, 0.016, 0.024, 10]} />
        </mesh>
        <sprite ref={votive} material={flame} position-y={0.05} />
        <sprite material={halo} position-y={0.04} scale={0.35} />
      </group>
    </group>
  );
}

/** Moonlight glittering on the shallows: points that twinkle in and out, thickest along a path. */
function MoonGlints() {
  const disc = useSoftDisc();
  const { geometry, glints } = useMemo(() => {
    const random = seededRandom(41);
    const glints = Array.from({ length: GLINTS }, () => {
      const x = (random() - 0.5) * 1.3 * (random() < 0.6 ? 0.35 : 1) + 0.12;
      const shore = shoreline(x) - 0.04;
      const z = shore - random() * (Math.sqrt(Math.max(0, 0.9 - x * x)) + shore);
      return { x, z, rate: 1.5 + random() * 3, phase: random() * Math.PI * 2 };
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(glints.flatMap(({ x, z }) => [x, 0.016, z])), 3),
    );
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(GLINTS * 3), 3));
    return { geometry, glints };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    const colors = geometry.getAttribute("color") as BufferAttribute;
    const t = clock.elapsedTime;
    glints.forEach(({ rate, phase }, index) => {
      // Sharpened so each glint flashes briefly instead of glowing steadily.
      const flash = Math.max(0, Math.sin(t * rate + phase)) ** 6;
      colors.setXYZ(index, flash * 0.75, flash * 0.85, flash);
    });
    colors.needsUpdate = true;
  });

  return (
    <points geometry={geometry} renderOrder={3}>
      <pointsMaterial
        map={disc}
        size={0.045}
        vertexColors
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/** Pale moonlit sand, darker and glossier where the tide has just been, with ripple marks and grit. */
function drawSand(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(13);
  context.fillStyle = "#8a8579";
  context.fillRect(0, 0, size, size);
  // The canvas's top is the stage's back, towards the sea.
  const wet = context.createLinearGradient(0, 0, 0, size);
  wet.addColorStop(0, "rgba(38,46,58,0.9)");
  wet.addColorStop(0.36, "rgba(48,56,66,0.55)");
  wet.addColorStop(0.55, "rgba(60,64,70,0)");
  context.fillStyle = wet;
  context.fillRect(0, 0, size, size);
  context.lineWidth = 2;
  for (let line = 0; line < 26; line++) {
    const y = random() * size;
    context.strokeStyle = random() < 0.5 ? "rgba(60,58,54,0.25)" : "rgba(170,164,150,0.2)";
    context.beginPath();
    for (let x = 0; x <= size; x += 8) context.lineTo(x, y + Math.sin(x * 0.05 + line) * 5);
    context.stroke();
  }
  for (let fleck = 0; fleck < 4000; fleck++) {
    context.fillStyle = random() < 0.55 ? "rgba(50,48,44,0.35)" : "rgba(196,190,176,0.3)";
    context.fillRect(random() * size, random() * size, 1 + random() * 1.5, 1 + random() * 1.5);
  }
}

/** Light crests over a mid-blue, tiling, scrolled shorewards. */
function drawRipples(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(29);
  context.fillStyle = "#6f8fb5";
  context.fillRect(0, 0, size, size);
  for (let crest = 0; crest < 22; crest++) {
    const y = (crest / 22) * size + random() * 6;
    context.strokeStyle = `rgba(214,232,255,${0.25 + random() * 0.35})`;
    context.lineWidth = 1 + random() * 2;
    context.beginPath();
    // Whole periods across the canvas, so the texture tiles without a seam.
    const waves = 2 + Math.floor(random() * 3);
    const phase = random() * Math.PI * 2;
    for (let x = 0; x <= size; x += 4) context.lineTo(x, y + Math.sin((x / size) * waves * Math.PI * 2 + phase) * 4);
    context.stroke();
  }
}

/** Opaque out past the shoreline, feathered at the edge and faded towards the rim. */
function drawWaterMask(context: CanvasRenderingContext2D, size: number) {
  const image = context.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px / size) * 2 - 1;
      const z = (py / size) * 2 - 1;
      const depth = Math.min(1, Math.max(0, (shoreline(x) - z) / 0.12));
      const rim = 1 - Math.min(1, Math.max(0, (Math.hypot(x, z) - 0.7) / 0.3));
      const value = Math.round(255 * depth * rim * 0.85);
      const at = (py * size + px) * 4;
      image.data[at] = image.data[at + 1] = image.data[at + 2] = value;
      image.data[at + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

/** Broken foam along the water's edge, and a fainter line of it a wave further out. */
function drawFoam(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(37);
  const toCanvas = (value: number) => ((value + 1) / 2) * size;
  [
    { offset: 0, count: 700, alpha: 0.55 },
    { offset: -0.12, count: 300, alpha: 0.25 },
  ].forEach(({ offset, count, alpha }) => {
    for (let blob = 0; blob < count; blob++) {
      const x = random() * 2 - 1;
      const z = shoreline(x) + offset + (random() - 0.5) * 0.03;
      context.fillStyle = `rgba(236,244,255,${alpha * (0.4 + random() * 0.6)})`;
      context.beginPath();
      context.arc(toCanvas(x), toCanvas(z), 0.6 + random() * 2.6, 0, Math.PI * 2);
      context.fill();
    }
  });
}

/** Footprints of wet sand down to the water, shells and pebbles, a moonlit blue. */
const SHORE_GROUND: GroundDressing = {
  wash: { colour: "#3b82f6", alpha: 0.22 },
  path: {
    kind: "dirt",
    colour: "rgba(150,135,105,0.6)",
    edge: "rgba(110,98,76,0.35)",
    width: [0.12, 0.22],
    wind: 0.05,
  },
  litter: [
    { shape: "petal", colours: ["#fde7f0", "#f5d0c5", "#e0e7ff"], count: 50, size: 4 },
    { shape: "pebble", colours: ["#94a3b8", "#cbd5e1"], count: 50, size: 3 },
  ],
};
const SAND: CanvasLook = { size: 512, draw: withDressing(drawSand, SHORE_GROUND), fadeFrom: 0.55 };
const RIPPLES: CanvasLook = { size: 256, draw: drawRipples, tile: true };
const WATER_MASK: CanvasLook = { size: 256, draw: drawWaterMask, linear: true };
const FOAM: CanvasLook = { size: 512, draw: drawFoam, fadeFrom: 0.65 };
const STONE: NoiseLook = {
  base: [112, 116, 122],
  dark: [62, 68, 76],
  light: [150, 156, 162],
  fadeOut: false,
};
