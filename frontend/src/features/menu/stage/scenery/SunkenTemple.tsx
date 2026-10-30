"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
  type InstancedMesh,
  type Mesh,
} from "three";
import { usePropMesh } from "@/features/match/scene/character/core/props";
import { useSoftDisc } from "@/features/match/scene/character/shared/softDisc";
import { seededRandom } from "@/game/domain/random";
import { blot, withDressing, type GroundDressing } from "./groundDressing";
import { GROUND_RADIUS } from "./sceneryKit";
import { useCanvasTexture, useNoiseTexture, type CanvasLook, type NoiseLook, type Painter } from "./textures";

/** Coral on its rock (a Meshy prop, 2 tall in its export): how tall each stands and how far it's turned. */
const CORALS = [
  { x: -0.7, z: -0.55, height: 0.75, turn: 0.5 },
  { x: 0.78, z: -0.72, height: 0.6, turn: -0.6 },
  { x: -0.86, z: 0.12, height: 0.32, turn: 1.4 },
];
/** The ruin of rune pillars standing behind him (a Meshy prop, 2 tall in its export). */
const PILLARS = { x: -0.1, z: -1.05, height: 1.7, turn: 0.15 };
/** The open treasure chest the coins spilled from (a Meshy prop, 2 wide and 1.28 tall in its export). */
const CHEST = { x: 0.55, z: -0.38, width: 0.42, turn: -0.5 };
const FRONDS = [
  { x: -0.84, z: -0.14, height: 0.42, phase: 0 },
  { x: -0.48, z: -0.74, height: 0.55, phase: 1.3 },
  { x: -0.4, z: -0.68, height: 0.36, phase: 2.1 },
  { x: 0.1, z: -0.92, height: 0.6, phase: 0.6 },
  { x: 0.42, z: -0.82, height: 0.46, phase: 2.8 },
  { x: 0.74, z: -0.38, height: 0.34, phase: 1.9 },
  { x: -0.7, z: 0.4, height: 0.18, phase: 3.4 },
  { x: 0.7, z: 0.36, height: 0.2, phase: 4.2 },
];
const FROND_SEGMENTS = 8;
const COINS = 16;
const BUBBLES = 40;
const BUBBLE_HEIGHT = 1.9;
/** Where bubbles rise from: the corals' feet, the chest and cracks between the tiles. */
const VENTS = [
  [-0.7, -0.55],
  [0.78, -0.72],
  [0.55, -0.38],
  [-0.2, -0.75],
  [0.3, -0.3],
  [-0.5, 0.05],
] as const;
const RAYS = 4;

/**
 * Auric's stage instead of the rune pedestal: the gold-inlaid floor of a sunken temple, coral and swaying
 * weed, rune pillars, an open treasure chest and its coins, caustics rippling over the seabed and bubbles rising. Origin on the floor.
 */
export function SunkenTemple() {
  const tiles = useCanvasTexture(TILES);
  const causticsA = useCanvasTexture(CAUSTICS);
  const causticsB = useCanvasTexture(CAUSTICS);
  const mask = useCanvasTexture(MASK);
  const gilt = useNoiseTexture(GILT);
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: tiles, transparent: true, roughness: 0.75, depthWrite: false }),
      gold: new MeshStandardMaterial({
        map: gilt,
        metalness: 0.85,
        roughness: 0.35,
        emissive: "#5c3d08",
        emissiveIntensity: 0.35,
        flatShading: true,
      }),
      weed: new MeshStandardMaterial({ color: "#2f7d4f", roughness: 0.8, side: DoubleSide }),
      darkWeed: new MeshStandardMaterial({ color: "#1d5a44", roughness: 0.8, side: DoubleSide }),
      brain: new MeshStandardMaterial({ color: "#d9a066", roughness: 0.9 }),
      caustics: [causticsA, causticsB].map(
        (map) =>
          new MeshBasicMaterial({
            map,
            alphaMap: mask,
            color: "#7fe9f5",
            opacity: 0.55,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    }),
    [tiles, gilt, causticsA, causticsB, mask],
  );
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );
  const coral = usePropMesh("auricCoral");
  const pillars = usePropMesh("auricPillars");
  const chest = usePropMesh("auricChest");
  const brain = useMemo(() => brainCoral(), []);
  useEffect(() => () => brain.dispose(), [brain]);

  const caustics = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Two layers drifting across each other make the net of light shift and break.
    causticsA.repeat.set(1.6, 1.6);
    causticsA.offset.set(t * 0.018, t * 0.011);
    causticsB.repeat.set(2.1, 2.1);
    causticsB.offset.set(-t * 0.013, t * 0.02);
    const pulse = caustics.current[0];
    if (pulse) (pulse.material as MeshBasicMaterial).opacity = 0.45 + 0.15 * Math.sin(t * 0.7);
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {materials.caustics.map((material, index) => (
        <mesh
          key={index}
          ref={(mesh) => void (caustics.current[index] = mesh)}
          material={material}
          rotation-x={-Math.PI / 2}
          position-y={0.004 + index * 0.001}
          renderOrder={1}
        >
          <circleGeometry args={[GROUND_RADIUS * 0.95, 64]} />
        </mesh>
      ))}
      <mesh
        geometry={pillars.geometry}
        material={pillars.material}
        scale={PILLARS.height / 2}
        position={[PILLARS.x, PILLARS.height / 2, PILLARS.z]}
        rotation-y={PILLARS.turn}
      />
      <mesh
        geometry={chest.geometry}
        material={chest.material}
        scale={CHEST.width / 2}
        position={[CHEST.x, (CHEST.width / 2) * 0.64, CHEST.z]}
        rotation-y={CHEST.turn}
      />
      {CORALS.map(({ x, z, height, turn }) => (
        <mesh
          key={`${x}:${z}`}
          geometry={coral.geometry}
          material={coral.material}
          scale={height / 2}
          position={[x, height / 2, z]}
          rotation-y={turn}
        />
      ))}
      <mesh geometry={brain} material={materials.brain} position={[-0.48, -0.02, -0.3]} scale={[0.08, 0.055, 0.07]} />
      <mesh geometry={brain} material={materials.brain} position={[0.86, -0.02, 0.06]} scale={[0.06, 0.04, 0.055]} />
      <SeaFan />
      <Seaweed weed={materials.weed} darkWeed={materials.darkWeed} />
      <Coins gold={materials.gold} />
      <Bubbles />
      <SunShafts />
    </group>
  );
}

/** Gold coins spilled from the chest. */
function Coins({ gold }: { gold: MeshStandardMaterial }) {
  const coins = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = coins.current;
    if (!mesh) return;
    const random = seededRandom(51);
    const dummy = new Object3D();
    for (let index = 0; index < COINS; index++) {
      const angle = -Math.PI * (0.2 + random() * 0.6);
      const distance = 0.45 + random() * 0.35;
      dummy.position.set(Math.cos(angle) * distance, 0.004 + random() * 0.004, Math.sin(angle) * distance * 0.9);
      dummy.rotation.set((random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={coins} args={[undefined, gold, COINS]}>
      <cylinderGeometry args={[0.018, 0.018, 0.005, 12]} />
    </instancedMesh>
  );
}

/** A violet sea fan on the right, rocking in the current. */
function SeaFan() {
  const lattice = useCanvasTexture(LATTICE);
  const fan = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (fan.current) fan.current.rotation.x = 0.15 * Math.sin(clock.elapsedTime * 0.8);
  });
  return (
    <group position={[0.3, 0, -0.88]} rotation-y={-0.3}>
      <mesh ref={fan}>
        <circleGeometry args={[0.2, 24, 0, Math.PI]} />
        <meshStandardMaterial map={lattice} color="#c084fc" alphaTest={0.4} side={DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Ribbons of weed bending in the current, each vertex swung further the higher it is. */
function Seaweed({ weed, darkWeed }: { weed: MeshStandardMaterial; darkWeed: MeshStandardMaterial }) {
  const fronds = useMemo(
    () =>
      FRONDS.map(({ height }) => {
        const geometry = new PlaneGeometry(0.05, height, 1, FROND_SEGMENTS);
        geometry.translate(0, height / 2, 0);
        const positions = geometry.getAttribute("position") as BufferAttribute;
        // Tapered to a point at the top.
        for (let index = 0; index < positions.count; index++) {
          positions.setX(index, positions.getX(index) * (1 - (positions.getY(index) / height) * 0.75));
        }
        return { geometry, rest: Float32Array.from(positions.array) };
      }),
    [],
  );
  useEffect(() => () => fronds.forEach(({ geometry }) => geometry.dispose()), [fronds]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    fronds.forEach(({ geometry, rest }, frond) => {
      const { height, phase } = FRONDS[frond];
      const positions = geometry.getAttribute("position") as BufferAttribute;
      for (let index = 0; index < positions.count; index++) {
        const y = rest[index * 3 + 1];
        const reach = (y / height) ** 1.5;
        positions.setX(index, rest[index * 3] + Math.sin(t * 1.1 + phase + y * 6) * 0.06 * reach);
        positions.setZ(index, Math.cos(t * 0.8 + phase + y * 4) * 0.04 * reach);
      }
      positions.needsUpdate = true;
    });
  });

  return (
    <>
      {FRONDS.map(({ x, z, phase }, index) => (
        <mesh
          key={`${x}:${z}`}
          geometry={fronds[index].geometry}
          material={index % 2 ? darkWeed : weed}
          position={[x, 0, z]}
          rotation-y={phase}
        />
      ))}
    </>
  );
}

function Bubbles() {
  const ring = useCanvasTexture(BUBBLE);
  const { geometry, bubbles } = useMemo(() => {
    const random = seededRandom(61);
    const bubbles = Array.from({ length: BUBBLES }, () => {
      const [x, z] = VENTS[Math.floor(random() * VENTS.length)];
      return {
        x: x + (random() - 0.5) * 0.06,
        z: z + (random() - 0.5) * 0.06,
        height: random() * BUBBLE_HEIGHT,
        speed: 0.18 + random() * 0.22,
        phase: random() * Math.PI * 2,
      };
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(BUBBLES * 3), 3));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(BUBBLES * 3), 3));
    return { geometry, bubbles };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const colors = geometry.getAttribute("color") as BufferAttribute;
    const t = clock.elapsedTime;
    bubbles.forEach((bubble, index) => {
      // Faster as they climb, like real bubbles growing on the way up.
      bubble.height += bubble.speed * delta * (1 + bubble.height * 0.4);
      if (bubble.height > BUBBLE_HEIGHT) bubble.height -= BUBBLE_HEIGHT;
      const wobble = Math.sin(t * 5 + bubble.phase) * 0.012 * (1 + bubble.height);
      positions.setXYZ(index, bubble.x + wobble, bubble.height, bubble.z + Math.cos(t * 4 + bubble.phase) * 0.008);
      const fade = Math.min(1, (BUBBLE_HEIGHT - bubble.height) * 2, bubble.height * 8) * 0.8;
      colors.setXYZ(index, fade * 0.8, fade, fade);
    });
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={ring}
        size={0.04}
        vertexColors
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/** Pale shafts of daylight slanting down through the water, swaying slowly. */
function SunShafts() {
  const disc = useSoftDisc();
  const shafts = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    shafts.current.forEach((shaft, index) => {
      if (!shaft) return;
      shaft.rotation.z = -0.2 + index * 0.13 + 0.04 * Math.sin(t * 0.3 + index * 2);
      (shaft.material as MeshBasicMaterial).opacity = 0.08 + 0.05 * Math.sin(t * 0.5 + index * 1.4);
    });
  });
  return (
    <>
      {Array.from({ length: RAYS }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => void (shafts.current[index] = mesh)}
          position={[-0.5 + index * 0.34, 1.05, -0.7 - (index % 2) * 0.15]}
          scale={[0.16 + (index % 2) * 0.08, 2.2, 1]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={disc}
            color="#bff7f2"
            transparent
            opacity={0.1}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

/** A dome 1 across, its surface folded into ridges. */
function brainCoral(): BufferGeometry {
  const geometry = new SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const positions = geometry.getAttribute("position") as BufferAttribute;
  const point = new Vector3();
  for (let index = 0; index < positions.count; index++) {
    point.fromBufferAttribute(positions, index);
    const ridge = 1 + 0.05 * Math.sin(point.x * 14 + Math.sin(point.z * 9) * 2) * Math.cos(point.z * 12);
    point.multiplyScalar(ridge);
    positions.setXYZ(index, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The seabed he rules: rippled blue-green sand, seagrass meadows, his gold sigil round his feet and a few temple
 * tiles half sunk in the sand, their gold inlay still catching the light.
 */
const drawSeabed: Painter = (context, size, random) => {
  context.fillStyle = "#123b4a";
  context.fillRect(0, 0, size, size);
  for (let patch = 0; patch < 70; patch++) {
    const light = random() < 0.55;
    blot(
      context,
      random() * size,
      random() * size,
      20 + random() * 50,
      light ? "rgba(90,170,170,0.35)" : "rgba(8,30,50,0.45)",
    );
  }
  // Sand ripples: wavy bands the current combs across the bed.
  context.lineCap = "round";
  for (let band = 0; band < 46; band++) {
    const y = (band / 46) * size + random() * 6;
    context.strokeStyle = band % 2 ? "rgba(150,210,205,0.22)" : "rgba(6,24,36,0.3)";
    context.lineWidth = 2 + random() * 2;
    context.beginPath();
    for (let x = 0; x <= size; x += 16) {
      const wave = Math.sin(x * 0.03 + band * 0.9) * 5;
      if (x === 0) context.moveTo(x, y + wave);
      else context.lineTo(x, y + wave);
    }
    context.stroke();
  }
  for (let meadow = 0; meadow < 26; meadow++) {
    blot(context, random() * size, random() * size, 12 + random() * 26, "rgba(40,140,90,0.45)");
  }
  // Half-sunk tiles: a corner showing, gold inlay along its edge.
  for (let tile = 0; tile < 9; tile++) {
    const x = random() * size;
    const y = random() * size;
    context.save();
    context.translate(x, y);
    context.rotate(random() * Math.PI);
    context.fillStyle = "rgba(70,110,110,0.85)";
    context.fillRect(-22, -22, 44, 44);
    context.strokeStyle = "rgba(226,176,64,0.9)";
    context.lineWidth = 2.5;
    context.strokeRect(-18, -18, 36, 36);
    context.restore();
    blot(context, x + 14, y + 10, 30, "rgba(110,180,175,0.6)");
  }
  const centre = size / 2;
  context.strokeStyle = "rgba(240,190,80,0.9)";
  context.lineWidth = 4;
  [0.36, 0.42].forEach((share) => {
    context.beginPath();
    context.arc(centre, centre, centre * share, 0, Math.PI * 2);
    context.stroke();
  });
  context.lineWidth = 2.5;
  for (let ray = 0; ray < 16; ray++) {
    const angle = (ray / 16) * Math.PI * 2;
    const outer = centre * (ray % 2 ? 0.5 : 0.56);
    context.beginPath();
    context.moveTo(centre + Math.cos(angle) * centre * 0.42, centre + Math.sin(angle) * centre * 0.42);
    context.lineTo(centre + Math.cos(angle) * outer, centre + Math.sin(angle) * outer);
    context.stroke();
  }
  for (let fleck = 0; fleck < 3000; fleck++) {
    context.fillStyle = random() < 0.5 ? "rgba(4,16,24,0.3)" : "rgba(170,225,220,0.2)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
};

/** A tiling net of bright lines: where each point is about as near two cells of a scattered grid (Voronoi edges). */
function drawCaustics(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(71);
  const cells = Array.from({ length: 22 }, () => [random() * size, random() * size]);
  const image = context.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let nearest = Infinity;
      let second = Infinity;
      for (const [cx, cy] of cells) {
        // Measured around the wrap, so the pattern tiles.
        const dx = Math.min(Math.abs(px - cx), size - Math.abs(px - cx));
        const dy = Math.min(Math.abs(py - cy), size - Math.abs(py - cy));
        const distance = Math.hypot(dx, dy);
        if (distance < nearest) [second, nearest] = [nearest, distance];
        else if (distance < second) second = distance;
      }
      const value = Math.round(255 * Math.exp(-(second - nearest) / 3.5));
      const at = (py * size + px) * 4;
      image.data[at] = image.data[at + 1] = image.data[at + 2] = value;
      image.data[at + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function drawMask(context: CanvasRenderingContext2D, size: number) {
  const fade = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  fade.addColorStop(0, "#ffffff");
  fade.addColorStop(0.55, "#b0b0b0");
  fade.addColorStop(1, "#000000");
  context.fillStyle = fade;
  context.fillRect(0, 0, size, size);
}

/** Ribs fanning out from the foot, crossed by arcs, on transparent: cut out with alphaTest. */
function drawLattice(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  for (let rib = 0; rib <= 12; rib++) {
    const angle = Math.PI + (rib / 12) * Math.PI;
    context.beginPath();
    context.moveTo(centre, centre);
    context.lineTo(centre + Math.cos(angle) * centre, centre + Math.sin(angle) * centre);
    context.stroke();
  }
  context.lineWidth = 2;
  for (let arc = 1; arc <= 7; arc++) {
    context.beginPath();
    context.arc(centre, centre, (arc / 7) * centre * 0.98, Math.PI, Math.PI * 2);
    context.stroke();
  }
}

/** A thin bright ring with a highlight, so additive points read as bubbles rather than dots. */
function drawBubble(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  context.strokeStyle = "rgba(255,255,255,0.9)";
  context.lineWidth = size * 0.08;
  context.beginPath();
  context.arc(centre, centre, centre * 0.8, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.beginPath();
  context.arc(centre - centre * 0.3, centre - centre * 0.3, centre * 0.16, 0, Math.PI * 2);
  context.fill();
}

/** A trail of pale sand to the pillars, coins and shells strewn over it, a sea-blue sheen. */
const TEMPLE_GROUND: GroundDressing = {
  wash: { colour: "#0ea5e9", alpha: 0.3 },
  path: {
    kind: "dirt",
    colour: "rgba(190,220,200,0.55)",
    edge: "rgba(90,150,150,0.35)",
    width: [0.14, 0.26],
    wind: 0.05,
  },
  litter: [
    { shape: "coin", colours: ["#f5c542", "#d4a12a"], count: 50, size: 4 },
    { shape: "pebble", colours: ["#e8dcc0", "#cfc0a0"], count: 30, size: 3 },
  ],
};
const TILES: CanvasLook = { size: 512, draw: withDressing(drawSeabed, TEMPLE_GROUND), seed: 43, fadeFrom: 0.55 };
const CAUSTICS: CanvasLook = { size: 256, draw: drawCaustics, tile: true };
const MASK: CanvasLook = { size: 128, draw: drawMask, linear: true };
const LATTICE: CanvasLook = { size: 256, draw: drawLattice };
const BUBBLE: CanvasLook = { size: 32, draw: drawBubble };
const GILT: NoiseLook = {
  base: [212, 160, 58],
  dark: [96, 110, 60],
  light: [250, 214, 120],
  fadeOut: false,
};
