"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LatheGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SpriteMaterial,
  Vector2,
  type Mesh,
  type Sprite,
  type Texture,
} from "three";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { GROUND_RADIUS, taperedTube } from "./kit/geometry";
import { withDressing, type GroundDressing } from "./kit/groundDressing";
import { useCanvasTexture, type Painter } from "./kit/textures";

const CIRCLE_SIZE = 1.3;
const BENCH = { x: -0.52, z: -0.66, turn: 0.55, width: 0.64, depth: 0.24, height: 0.46 };
const BENCH_TOP = BENCH.height + 0.0175;
type FlaskKind = "round" | "cone" | "tall";
/** Along the bench top; `size` is the bulb's radius (a vial's own radius for "tall"). */
const FLASKS: { x: number; z: number; kind: FlaskKind; size: number; liquid: string }[] = [
  { x: -0.22, z: 0.02, kind: "round", size: 0.07, liquid: "#1ee89a" },
  { x: -0.07, z: -0.04, kind: "cone", size: 0.06, liquid: "#8af25a" },
  { x: 0.06, z: 0.04, kind: "tall", size: 0.02, liquid: "#10b981" },
  { x: 0.12, z: -0.05, kind: "tall", size: 0.016, liquid: "#5eead4" },
  { x: 0.22, z: 0.01, kind: "round", size: 0.048, liquid: "#34f5b0" },
];
const ALEMBIC = { x: 0.56, z: -0.6, turn: -0.5 };
/** The still's pot outline, bottom up, before it's turned; it sits on a stand this high. */
const POT_PROFILE = [
  [0, 0],
  [0.07, 0.01],
  [0.1, 0.05],
  [0.1, 0.1],
  [0.075, 0.15],
  [0.04, 0.17],
  [0.035, 0.2],
] as const;
const STAND = 0.1;
const HEAD_Y = STAND + 0.2;
const BEAK: [number, number, number][] = [
  [0.03, HEAD_Y + 0.04, 0],
  [0.14, HEAD_Y + 0.02, 0.01],
  [0.24, 0.26, 0.03],
  [0.31, 0.19, 0.04],
];
const RECEIVER = { x: 0.31, z: 0.04, size: 0.05 };
const BUBBLES_PER_FLASK = 6;
const LIQUID_GLOW = 1.5;
const FLAME = new Color("#7dffb0").multiplyScalar(2);

/** The Emerald Alchemist's stage: tiled floor, a chalk circle, a bench of bubbling flasks and a brass still. */
export function AlchemyLab() {
  const tiles = useCanvasTexture({ size: 512, draw: paintLabFloor, seed: 13, fadeFrom: 0.3 });
  const chalk = useCanvasTexture({ size: 512, draw: paintChalkCircle, seed: 3 });
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: tiles, transparent: true, roughness: 0.8, depthWrite: false }),
      chalk: new MeshBasicMaterial({
        map: chalk,
        color: "#e6fff2",
        opacity: 0.65,
        transparent: true,
        depthWrite: false,
      }),
      circleGlow: new MeshBasicMaterial({
        map: chalk,
        color: "#10b981",
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
      wood: new MeshStandardMaterial({ color: "#3b2617", roughness: 0.9 }),
      darkWood: new MeshStandardMaterial({ color: "#24170e", roughness: 1 }),
      glass: new MeshStandardMaterial({
        color: "#d6fff0",
        transparent: true,
        opacity: 0.28,
        roughness: 0.05,
        depthWrite: false,
      }),
      cork: new MeshStandardMaterial({ color: "#8a6a45", roughness: 1 }),
      brass: new MeshStandardMaterial({ color: "#b8873a", metalness: 0.55, roughness: 0.38 }),
      iron: new MeshStandardMaterial({ color: "#232326", metalness: 0.6, roughness: 0.6 }),
      leather: new MeshStandardMaterial({ color: "#1f3b2c", roughness: 0.75 }),
      paper: new MeshStandardMaterial({ color: "#d2c6a4", roughness: 0.9 }),
      liquids: FLASKS.map(({ liquid }) => liquidMaterial(liquid)),
      distillate: liquidMaterial("#3cf2a8"),
      halo: glowSprite(disc, new Color("#22e39a"), 0.16),
      spill: new MeshBasicMaterial({
        map: disc,
        color: "#22e39a",
        opacity: 0.45,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      flame: glowSprite(disc, FLAME, 1),
    }),
    [tiles, chalk, disc],
  );
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );
  const geometries = useMemo(
    () => ({
      pot: new LatheGeometry(
        POT_PROFILE.map(([x, y]) => new Vector2(x, y)),
        24,
      ),
      beak: taperedTube(BEAK, 0.014, 0.55),
    }),
    [],
  );
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);
  const flames = useRef<(Sprite | null)[]>([]);
  const drop = useRef<Mesh>(null);
  const circleGlow = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (circleGlow.current)
      (circleGlow.current.material as MeshBasicMaterial).opacity = 0.35 + 0.25 * Math.sin(t * 1.2);
    flames.current.forEach((flame, index) => {
      if (!flame) return;
      const flicker = 1 + 0.14 * Math.sin(t * 14 + index * 2.1) + 0.07 * Math.sin(t * 31 + index);
      flame.scale.set(0.035 * flicker, 0.06 * (2 - flicker), 1);
    });
    if (drop.current) {
      // A drop gathers at the beak's tip, then falls into the receiver.
      const life = (t * 0.55) % 1;
      const [x, y, z] = BEAK[BEAK.length - 1];
      const fall = life < 0.7 ? 0 : (life - 0.7) / 0.3;
      drop.current.position.set(x, y - 0.012 - fall * fall * 0.07, z);
      drop.current.scale.setScalar(0.006 * Math.min(1, life / 0.7 + 0.3));
    }
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      <mesh material={materials.chalk} rotation-x={-Math.PI / 2} position-y={0.003} renderOrder={1}>
        <planeGeometry args={[CIRCLE_SIZE, CIRCLE_SIZE]} />
      </mesh>
      <mesh
        ref={circleGlow}
        material={materials.circleGlow}
        rotation-x={-Math.PI / 2}
        position-y={0.004}
        renderOrder={2}
      >
        <planeGeometry args={[CIRCLE_SIZE, CIRCLE_SIZE]} />
      </mesh>
      <group position={[BENCH.x, 0, BENCH.z]} rotation-y={BENCH.turn}>
        <mesh material={materials.wood} position-y={BENCH.height}>
          <boxGeometry args={[BENCH.width, 0.035, BENCH.depth]} />
        </mesh>
        <mesh material={materials.darkWood} position-y={0.14}>
          <boxGeometry args={[BENCH.width - 0.06, 0.025, BENCH.depth - 0.04]} />
        </mesh>
        {[-1, 1].flatMap((sideX) =>
          [-1, 1].map((sideZ) => (
            <mesh
              key={`${sideX}:${sideZ}`}
              material={materials.darkWood}
              position={[sideX * (BENCH.width / 2 - 0.03), BENCH.height / 2, sideZ * (BENCH.depth / 2 - 0.025)]}
            >
              <boxGeometry args={[0.035, BENCH.height, 0.035]} />
            </mesh>
          )),
        )}
        {FLASKS.map((flask, index) => (
          <group key={index} position={[flask.x, BENCH_TOP, flask.z]}>
            <Flask {...flask} glass={materials.glass} liquid={materials.liquids[index]} cork={materials.cork} />
            <sprite material={materials.halo} position-y={flaskHeight(flask) * 0.4} scale={flask.size * 6} />
          </group>
        ))}
        <FlaskBubbles />
        {/* Below: a stoppered jar and a ledger. */}
        <group position={[-0.16, 0.1525, 0]}>
          <Flask kind="tall" size={0.035} glass={materials.glass} liquid={materials.liquids[2]} cork={materials.cork} />
        </group>
        <mesh material={materials.leather} position={[0.12, 0.1525 + 0.02, 0.01]} rotation-y={0.2}>
          <boxGeometry args={[0.18, 0.04, 0.13]} />
        </mesh>
        <mesh material={materials.paper} position={[0.124, 0.1525 + 0.02, 0.01]} rotation-y={0.2}>
          <boxGeometry args={[0.172, 0.03, 0.133]} />
        </mesh>
      </group>
      <group position={[ALEMBIC.x, 0, ALEMBIC.z]} rotation-y={ALEMBIC.turn}>
        {/* A three-legged stand with a burner under the pot. */}
        {[0, 1, 2].map((leg) => {
          const angle = (leg / 3) * Math.PI * 2;
          return (
            <mesh
              key={leg}
              material={materials.iron}
              position={[Math.cos(angle) * 0.085, STAND / 2, Math.sin(angle) * 0.085]}
            >
              <cylinderGeometry args={[0.007, 0.007, STAND, 6]} />
            </mesh>
          );
        })}
        <mesh material={materials.iron} position-y={STAND} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.085, 0.008, 6, 24]} />
        </mesh>
        <mesh material={materials.brass} position-y={0.012}>
          <cylinderGeometry args={[0.03, 0.035, 0.024, 12]} />
        </mesh>
        {[-0.012, 0.012].map((x, index) => (
          <sprite
            key={index}
            ref={(sprite) => {
              flames.current[index] = sprite;
            }}
            material={materials.flame}
            position={[x, 0.05, 0]}
          />
        ))}
        <sprite material={materials.halo} position-y={0.05} scale={0.3} />
        <mesh geometry={geometries.pot} material={materials.brass} position-y={STAND} />
        <mesh material={materials.brass} position-y={HEAD_Y}>
          <sphereGeometry args={[0.055, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh geometry={geometries.beak} material={materials.brass} />
        <mesh ref={drop} material={materials.distillate}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
        <group position={[RECEIVER.x, 0, RECEIVER.z]}>
          <Flask kind="round" size={RECEIVER.size} glass={materials.glass} liquid={materials.distillate} />
          <sprite material={materials.halo} position-y={RECEIVER.size} scale={0.3} />
        </group>
      </group>
      {/* A vial knocked over, its brew glowing on the tiles. */}
      <group position={[0.52, 0, 0.3]} rotation-y={-0.7}>
        <mesh material={materials.spill} position={[0.07, 0.003, 0]} rotation-x={-Math.PI / 2} renderOrder={1}>
          <planeGeometry args={[0.3, 0.22]} />
        </mesh>
        <group position={[0, 0.02, 0]} rotation-z={Math.PI / 2}>
          <Flask kind="tall" size={0.02} glass={materials.glass} liquid={materials.liquids[0]} cork={materials.cork} />
        </group>
      </group>
      <group position={[-0.62, 0, 0.26]} rotation-y={0.6}>
        <mesh material={materials.leather} position-y={0.02}>
          <boxGeometry args={[0.19, 0.04, 0.14]} />
        </mesh>
        <mesh material={materials.paper} position={[0.004, 0.02, 0]}>
          <boxGeometry args={[0.182, 0.03, 0.143]} />
        </mesh>
      </group>
    </group>
  );
}

function flaskHeight({ kind, size }: { kind: FlaskKind; size: number }): number {
  return kind === "round" ? size * 3.2 : kind === "cone" ? size * 2.2 : size * 6;
}

/** Standing on its origin: a bulb or cone of glass with its liquid inside, the neck stoppered when `cork` is given. */
function Flask({
  kind,
  size,
  glass,
  liquid,
  cork,
}: {
  kind: FlaskKind;
  size: number;
  glass: MeshStandardMaterial;
  liquid: MeshBasicMaterial;
  cork?: MeshStandardMaterial;
}) {
  const height = flaskHeight({ kind, size });
  if (kind === "tall") {
    return (
      <group>
        <mesh material={liquid} position-y={size * 2}>
          <cylinderGeometry args={[size * 0.82, size * 0.82, size * 4, 12]} />
        </mesh>
        <mesh material={glass} position-y={size * 3}>
          <cylinderGeometry args={[size, size, size * 6, 12]} />
        </mesh>
        {cork && (
          <mesh material={cork} position-y={size * 6.3}>
            <cylinderGeometry args={[size * 0.9, size * 0.75, size * 1.2, 10]} />
          </mesh>
        )}
      </group>
    );
  }
  const neckRadius = size * 0.3;
  const body = kind === "round" ? size * 2 : size * 1.6;
  return (
    <group>
      {kind === "round" ? (
        <>
          {/* The lower part of the bulb, open at the top, capped by the liquid's surface. */}
          <mesh material={liquid} position-y={size}>
            <sphereGeometry args={[size * 0.88, 16, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55]} />
          </mesh>
          <mesh material={liquid} position-y={size * (1 + 0.88 * Math.cos(Math.PI * 0.45))} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[size * 0.88 * Math.sin(Math.PI * 0.45), 16]} />
          </mesh>
          <mesh material={glass} position-y={size}>
            <sphereGeometry args={[size, 18, 12]} />
          </mesh>
        </>
      ) : (
        <>
          <mesh material={liquid} position-y={size * 0.35}>
            <cylinderGeometry args={[size * 0.64, size * 0.92, size * 0.7, 14]} />
          </mesh>
          <mesh material={glass} position-y={size * 0.8}>
            <cylinderGeometry args={[neckRadius, size, body, 16]} />
          </mesh>
        </>
      )}
      <mesh material={glass} position-y={(body + height) / 2}>
        <cylinderGeometry args={[neckRadius, neckRadius * 1.1, height - body, 10]} />
      </mesh>
      {cork && (
        <mesh material={cork} position-y={height + size * 0.15}>
          <cylinderGeometry args={[neckRadius * 1.05, neckRadius * 0.85, size * 0.4, 10]} />
        </mesh>
      )}
    </group>
  );
}

/** Bubbles rising through each flask on the bench, in the bench's own space. */
function FlaskBubbles() {
  const disc = useSoftDisc();
  const { geometry, bubbles } = useMemo(() => {
    const random = seededRandom(57);
    const bubbles = FLASKS.flatMap((flask) => {
      // From near the bottom up to the liquid's surface.
      const top =
        flask.kind === "round" ? flask.size * 1.1 : flask.kind === "cone" ? flask.size * 0.68 : flask.size * 3.9;
      const spread = (flask.kind === "tall" ? 0.5 : 0.45) * flask.size;
      return Array.from({ length: BUBBLES_PER_FLASK }, () => ({
        x: flask.x + (random() - 0.5) * spread,
        z: flask.z + (random() - 0.5) * spread,
        bottom: BENCH_TOP + flask.size * 0.25,
        top: BENCH_TOP + top,
        speed: 0.6 + random() * 0.9,
        phase: random(),
      }));
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(bubbles.length * 3), 3));
    return { geometry, bubbles };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const t = clock.elapsedTime;
    bubbles.forEach(({ x, z, bottom, top, speed, phase }, index) => {
      const life = (t * speed * 0.6 + phase) % 1;
      positions.setXYZ(index, x + Math.sin(t * 6 + phase * 9) * 0.002, bottom + (top - bottom) * life, z);
    });
    positions.needsUpdate = true;
  });

  return (
    <points geometry={geometry} renderOrder={3}>
      <pointsMaterial
        map={disc}
        color={new Color("#d8ffe9").multiplyScalar(1.4)}
        size={0.014}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function liquidMaterial(color: string): MeshBasicMaterial {
  return new MeshBasicMaterial({ color: new Color(color).multiplyScalar(LIQUID_GLOW), toneMapped: false });
}

function glowSprite(map: Texture, color: Color, opacity: number): SpriteMaterial {
  return new SpriteMaterial({
    map,
    color,
    opacity,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

/** Square slate tiles in two shades, worn grout, and the odd green stain. */
const paintTiles: Painter = (context, size, random) => {
  context.fillStyle = "#0e1412";
  context.fillRect(0, 0, size, size);
  const tile = size / 8;
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      const light = (row + column) % 2 === 0;
      const shade = (light ? 62 : 34) + random() * 10;
      context.fillStyle = `rgb(${shade - 6},${shade + 4},${shade})`;
      context.fillRect(column * tile + 2, row * tile + 2, tile - 4, tile - 4);
    }
  }
  for (let fleck = 0; fleck < 3000; fleck++) {
    context.fillStyle = random() < 0.5 ? "rgba(6,10,8,0.35)" : "rgba(120,140,130,0.18)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  for (let stain = 0; stain < 7; stain++) {
    const x = random() * size;
    const y = random() * size;
    const radius = 10 + random() * 28;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(30,140,90,0.35)");
    gradient.addColorStop(1, "rgba(30,140,90,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
};

/** A transmutation circle in chalk on a transparent canvas: rings, triangle, square and glyphs between the rings. */
const paintChalkCircle: Painter = (context, size, random) => {
  const centre = size / 2;
  const outer = size * 0.46;
  const inner = size * 0.4;
  // Each line drawn a few times, a little off, so it reads as chalk rather than ink.
  const chalk = (path: () => void, width = 3) => {
    for (let pass = 0; pass < 3; pass++) {
      context.save();
      context.translate((random() - 0.5) * 2, (random() - 0.5) * 2);
      context.strokeStyle = `rgba(240,255,245,${0.3 + random() * 0.2})`;
      context.lineWidth = width;
      context.beginPath();
      path();
      context.stroke();
      context.restore();
    }
  };
  const polygon = (sides: number, radius: number, start: number) => () => {
    for (let corner = 0; corner <= sides; corner++) {
      const angle = start + (corner / sides) * Math.PI * 2;
      context.lineTo(centre + Math.cos(angle) * radius, centre + Math.sin(angle) * radius);
    }
  };
  chalk(() => context.arc(centre, centre, outer, 0, Math.PI * 2), 4);
  chalk(() => context.arc(centre, centre, inner, 0, Math.PI * 2));
  chalk(polygon(3, inner, -Math.PI / 2));
  chalk(polygon(3, inner, Math.PI / 2));
  chalk(polygon(4, inner * 0.5, Math.PI / 4));
  chalk(() => context.arc(centre, centre, inner * 0.5, 0, Math.PI * 2));
  for (let corner = 0; corner < 6; corner++) {
    const angle = -Math.PI / 2 + (corner / 6) * Math.PI * 2;
    chalk(() =>
      context.arc(centre + Math.cos(angle) * inner, centre + Math.sin(angle) * inner, size * 0.025, 0, Math.PI * 2),
    );
  }
  for (let glyph = 0; glyph < 30; glyph++) {
    const angle = (glyph / 30) * Math.PI * 2 + 0.05;
    const radius = (outer + inner) / 2;
    const x = centre + Math.cos(angle) * radius;
    const y = centre + Math.sin(angle) * radius;
    const tilts = Array.from({ length: 1 + Math.floor(random() * 3) }, () => angle + random() * Math.PI);
    chalk(() => {
      for (const tilt of tilts) {
        context.moveTo(x - Math.cos(tilt) * 7, y - Math.sin(tilt) * 7);
        context.lineTo(x + Math.cos(tilt) * 7, y + Math.sin(tilt) * 7);
      }
    }, 2);
  }
};

/** A green runner trimmed in gold down the lab, spilled potions and broken glass. */
const LAB_GROUND: GroundDressing = {
  wash: { colour: "#10b981", alpha: 0.3 },
  patches: { colours: ["rgba(40,220,140,0.28)", "rgba(120,60,200,0.2)"], count: 14, radius: [16, 40] },
  path: { kind: "runner", colour: "#0f3d2e", edge: "#d4af37", width: [0.2, 0.2] },
  litter: [{ shape: "shard", colours: ["rgba(170,255,220,0.8)", "rgba(120,220,255,0.7)"], count: 70, size: 4 }],
};
const paintLabFloor = withDressing(paintTiles, LAB_GROUND);
