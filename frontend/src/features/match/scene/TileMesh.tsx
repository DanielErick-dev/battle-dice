"use client";

import { Html, RoundedBox, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  DoubleSide,
  Float32BufferAttribute,
  ShapeGeometry,
  type Group,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from "three";
import type { Tile } from "@/game/domain/types";
import { TILE_HEIGHT, TILE_PITCH, type BoardLayout, type Vec3 } from "./boardLayout";
import { pickCursor, type PickCursor } from "./pickCursor";
import { PortalVortex } from "./PortalVortex";
import { RelicCard } from "./RelicCard";
import { FIGURE_HEIGHT } from "./character/figure";
import { themeFor } from "./tileTheme";
import { slabBody, slabShape, SQUARE_SLAB, type SlabOutline } from "./slab";
import { useTileFaceTexture } from "./useTileFaceTexture";

const HIGHLIGHT_FALLBACK = "#f97316";

interface TileMeshProps {
  tile: Tile;
  position: Vec3;
  /** Its slab of the road (see BoardLayout.slab); a square slab without one (realm tracks). */
  slab?: ReturnType<BoardLayout["slab"]>;
  /** Path colour at this tile (see pathColor). */
  accent: string;
  /** Direction to the next tile on the face texture, or null on the last tile. */
  arrowAngle: number | null;
  /** Portal/trap in action: flashes the tile. */
  highlighted: boolean;
  /** Within reach of the active player's next roll: breathes softly. */
  reachable: boolean;
  /** Face texture size in pixels. */
  textureSize: number;
  /** Part of a stretch hiding traps. */
  inTrapZone?: boolean;
  /** Its harm was smashed or swallowed by the Void: drawn as a wreck. */
  destroyed?: boolean;
  /** Buried under a spell (the fairy's snow, black fire): what stands on the tile is hidden. */
  covered?: boolean;
  /**
   * Someone stands on it: what floats over the tile (a card, a die, an hourglass) makes way for
   * them instead of turning inside them, and the finish's trophy rises over their head.
   */
  occupied?: boolean;
  /** Can be picked for an ability (seals, apparitions, black fire): breathes, and a click picks it. */
  onPick?: (tile: number) => void;
  /** The pointer over it while it can be picked (an enchanted hand; the plain pointer without one). */
  pickCursor?: PickCursor;
}

/** Pixels the pointer may move between press and release for it to still count as a click, not a drag. */
const CLICK_SLOP = 6;

/** The side of the slab, a weathered grey; the face carries the colour (see useTileFaceTexture). */
const STONE_SIDE = "#5a554f";
const BEVEL = 0.05;

export function TileMesh({
  tile,
  position,
  slab,
  accent,
  arrowAngle,
  highlighted,
  reachable,
  textureSize,
  inTrapZone = false,
  destroyed = false,
  covered = false,
  occupied = false,
  onPick,
  pickCursor: cursor,
}: TileMeshProps) {
  /** The pointer is over it while it can be picked: it rises and lights up. */
  const [hovered, setHovered] = useState(false);
  if (hovered && !onPick) setHovered(false);
  /** The pointer is over it at all: what the stone does shows in a tag above it. */
  const [peeking, setPeeking] = useState(false);
  const { outline, heading: way } = slab ?? { outline: SQUARE_SLAB, heading: 0 };
  // Laid along the way, but never upside down to the camera: on rows running right to left it turns round.
  const heading = Math.cos(way) < 0 ? way + Math.PI : way;
  const shapes = useSlabGeometry(outline, heading);
  const hovering = hovered && onPick !== undefined;
  // Picked (or the picking over) under the pointer: the pointer goes back to normal.
  useEffect(() => {
    if (!hovering) return;
    document.body.style.cursor = cursor ? pickCursor(cursor) : "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovering, cursor]);
  const theme = useMemo(() => themeFor(tile, { inTrapZone, destroyed }), [tile, inTrapZone, destroyed]);
  const emissive = theme.glowIntensity > 0 ? theme.glow : HIGHLIGHT_FALLBACK;
  const glowColor = theme.kind === "regular" ? accent : theme.glow;
  const faceTexture = useTileFaceTexture({
    tileId: tile.id,
    theme,
    accent,
    // The face is laid along the way: its arrows point relative to that.
    arrowAngle: arrowAngle === null ? null : arrowAngle - heading,
    resolution: textureSize,
  });
  const bodyMaterial = useRef<MeshStandardMaterial>(null);
  const underglow = useRef<MeshBasicMaterial>(null);
  const lift = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    if (bodyMaterial.current) {
      const pulse = highlighted ? 1.2 + Math.sin(time * 10) * 0.6 : hovering ? 0.9 + Math.sin(time * 8) * 0.25 : 0;
      bodyMaterial.current.emissiveIntensity = theme.glowIntensity * 0.35 + pulse;
    }
    if (underglow.current) {
      const breathe = hovering ? 1 : reachable || onPick ? 0.75 + Math.sin(time * 4 - tile.id * 0.6) * 0.2 : 0.38;
      underglow.current.opacity += (breathe - underglow.current.opacity) * Math.min(1, delta * 8);
      underglow.current.color.set(hovering ? "#ffffff" : glowColor);
    }
    if (lift.current) {
      const target = hovering ? 0.32 : reachable || onPick ? 0.06 : 0;
      lift.current.position.y += (target - lift.current.position.y) * Math.min(1, delta * 8);
    }
  });

  return (
    <group position={position}>
      <mesh geometry={shapes.glow} position-y={-TILE_HEIGHT / 2 + 0.03} scale={[1.12, 1, 1.12]}>
        <meshBasicMaterial
          ref={underglow}
          color={glowColor}
          transparent
          opacity={0.38}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <group ref={lift}>
        {/*
          Only the slab itself takes the pick: what stands on a tile (a floating card, an hourglass)
          can reach over the tile behind it on screen, and must not steal its click.
        */}
        <group
          onClick={
            onPick &&
            ((event) => {
              // A drag across the board (to look around) isn't a pick.
              if (event.delta > CLICK_SLOP) return;
              event.stopPropagation();
              onPick(tile.id);
            })
          }
          onPointerOver={(event) => {
            // Only the tile nearest the pointer lights up, not the ones behind it.
            event.stopPropagation();
            setPeeking(true);
            if (onPick) setHovered(true);
          }}
          onPointerOut={() => {
            setPeeking(false);
            setHovered(false);
          }}
        >
          <mesh geometry={shapes.body} castShadow receiveShadow>
            <meshStandardMaterial
              ref={bodyMaterial}
              color={STONE_SIDE}
              emissive={emissive}
              roughness={0.9}
              flatShading
            />
          </mesh>

          <mesh geometry={shapes.face} position-y={TILE_HEIGHT / 2 + 0.004} receiveShadow>
            <meshStandardMaterial map={faceTexture} roughness={0.85} />
          </mesh>
        </group>
        {peeking && theme.label && (
          <Html center position-y={1.5} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
            <div
              className="rounded-lg bg-black/80 px-2.5 py-1 text-center whitespace-nowrap ring-1 ring-white/15"
              style={{ boxShadow: `0 0 14px ${theme.glow}66` }}
            >
              <div className="text-xs font-black tracking-wide text-white italic">{theme.label}</div>
              {theme.caption && (
                <div className="text-[10px] font-bold" style={{ color: theme.glow }}>
                  {theme.caption}
                </div>
              )}
            </div>
          </Html>
        )}

        {!covered && (
          <>
            {tile.effect.kind === "portal" && (
              <PortalVortex color={theme.glow} active={highlighted} phase={tile.id * 1.7} />
            )}
            {tile.effect.kind === "trap" && <TrapSpikes color={theme.glow} />}
            {tile.effect.kind === "advance" && <AdvanceChevrons color={theme.glow} angle={arrowAngle ?? 0} />}
            {!occupied && (
              <>
                {tile.effect.kind === "extraTurn" && <FloatingDie color={theme.glow} />}
                {tile.effect.kind === "skipTurn" && <Hourglass color={theme.glow} />}
                {tile.effect.kind === "card" &&
                  (tile.effect.cardId ? (
                    <RelicCard cardId={tile.effect.cardId} />
                  ) : (
                    <FloatingCard color={theme.glow} />
                  ))}
              </>
            )}
          </>
        )}
        {tile.role === "finish" && <FinishBeacon color={theme.glow} occupied={occupied} />}
      </group>
    </group>
  );
}

const SPIKE_SPOTS: readonly [number, number][] = [
  [-0.35, 0.05],
  [0, -0.1],
  [0.35, 0.05],
  [0.2, -0.45],
  [0.5, -0.4],
];

function TrapSpikes({ color }: { color: string }) {
  return (
    <group position-y={TILE_HEIGHT / 2}>
      {SPIKE_SPOTS.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, 0.16, z]} castShadow>
          <coneGeometry args={[0.1, 0.32, 6]} />
          <meshStandardMaterial
            color="#3a0a0f"
            emissive={color}
            emissiveIntensity={0.5}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Three chevrons that light up in sequence along the direction of travel. */
function AdvanceChevrons({ color, angle }: { color: string; angle: number }) {
  const chevrons = useRef<(MeshStandardMaterial | null)[]>([]);

  useFrame(({ clock }) => {
    chevrons.current.forEach((material, i) => {
      if (!material) return;
      const wave = (Math.sin(clock.elapsedTime * 6 - i * 1.2) + 1) / 2;
      material.emissiveIntensity = 0.6 + wave * 2.4;
    });
  });

  return (
    <group position-y={TILE_HEIGHT / 2 + 0.12} rotation-y={-angle}>
      {[-0.35, 0, 0.35].map((x, i) => (
        <mesh key={x} position-x={x} rotation-z={-Math.PI / 2} scale={[1, 1, 0.35]}>
          <coneGeometry args={[0.2, 0.26, 3]} />
          <meshStandardMaterial
            ref={(material) => {
              chevrons.current[i] = material;
            }}
            color={color}
            emissive={color}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function FloatingDie({ color }: { color: string }) {
  const die = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    if (!die.current) return;
    die.current.rotation.x += delta * 0.9;
    die.current.rotation.y += delta * 1.3;
    die.current.position.y = 0.85 + Math.sin(clock.elapsedTime * 2.2) * 0.1;
  });

  return (
    <group ref={die}>
      <RoundedBox args={[0.42, 0.42, 0.42]} radius={0.07} smoothness={3} castShadow>
        <meshStandardMaterial color="#f4f4f5" emissive={color} emissiveIntensity={0.35} roughness={0.3} />
      </RoundedBox>
      <Sparkles count={10} scale={[0.9, 0.9, 0.9]} size={2.5} speed={0.5} color={color} />
    </group>
  );
}

/** A small glowing card spinning above the tile. */
function FloatingCard({ color }: { color: string }) {
  const card = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    if (!card.current) return;
    card.current.rotation.y += delta * 1.6;
    card.current.position.y = 0.95 + Math.sin(clock.elapsedTime * 2) * 0.1;
  });

  return (
    <group>
      <group ref={card} rotation-z={0.15}>
        <RoundedBox args={[0.42, 0.6, 0.03]} radius={0.04} smoothness={2} castShadow>
          <meshStandardMaterial
            color="#fdf2f8"
            emissive={color}
            emissiveIntensity={1.4}
            metalness={0.4}
            roughness={0.25}
          />
        </RoundedBox>
      </group>
      <Sparkles count={12} scale={[0.9, 1.2, 0.9]} position-y={0.9} size={2.5} speed={0.6} color={color} />
    </group>
  );
}

/** Slowly turning hourglass: two cones tip to tip between caps. */
function Hourglass({ color }: { color: string }) {
  const glass = useRef<Group>(null);

  useFrame((_, delta) => {
    if (glass.current) glass.current.rotation.y += delta * 0.6;
  });

  return (
    <group ref={glass} position-y={TILE_HEIGHT / 2 + 0.45} scale={0.85}>
      {[1, -1].map((side) => (
        <group key={side}>
          <mesh position-y={side * 0.19} rotation-x={side > 0 ? Math.PI : 0}>
            <coneGeometry args={[0.2, 0.36, 16, 1, true]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
              transparent
              opacity={0.55}
              side={DoubleSide}
            />
          </mesh>
          <mesh position-y={side * 0.39} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.05, 20]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Where the finish's trophy hovers: at chest height over the empty tile, over the head of whoever stands on it. */
const TROPHY_HEIGHT = 1.9;
const TROPHY_HEIGHT_OCCUPIED = FIGURE_HEIGHT + 0.7;

function FinishBeacon({ color, occupied }: { color: string; occupied: boolean }) {
  const trophy = useRef<Group>(null);
  const height = useRef(TROPHY_HEIGHT);

  useFrame(({ clock }, delta) => {
    if (!trophy.current) return;
    const goal = occupied ? TROPHY_HEIGHT_OCCUPIED : TROPHY_HEIGHT;
    height.current += (goal - height.current) * Math.min(1, delta * 4);
    trophy.current.rotation.y = clock.elapsedTime * 0.8;
    trophy.current.position.y = height.current + Math.sin(clock.elapsedTime * 2) * 0.12;
  });

  return (
    <group>
      <mesh position-y={1.6}>
        <cylinderGeometry args={[0.55, 0.75, 3, 24, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>
      <group ref={trophy}>
        <mesh castShadow>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.4}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </group>
      <pointLight color={color} intensity={3} distance={4} position-y={1.2} />
    </group>
  );
}

/**
 * A slab of the road from its outline: the body (bevelled, TILE_HEIGHT tall, centred on y = 0), its top
 * face (flat, at y = 0, its texture laid along `heading` so the rune points the way) and a flat copy
 * for the glow under it.
 */
function useSlabGeometry(outline: SlabOutline, heading: number) {
  const key = `${outline.map(([x, z]) => `${x.toFixed(3)},${z.toFixed(3)}`).join(";")}|${heading.toFixed(3)}`;
  const shapes = useMemo(() => {
    const body = slabBody(outline, TILE_HEIGHT, BEVEL).translate(0, -TILE_HEIGHT / 2, 0);
    const face = new ShapeGeometry(slabShape(outline, BEVEL * 0.6)).rotateX(-Math.PI / 2);
    // u along the way, v across it (canvas y towards the way's right), a TILE_PITCH square per texture.
    const [cos, sin] = [Math.cos(heading), Math.sin(heading)];
    const position = face.getAttribute("position");
    const uv: number[] = [];
    for (let index = 0; index < position.count; index++) {
      const [x, z] = [position.getX(index), position.getZ(index)];
      uv.push(0.5 + (x * cos + z * sin) / TILE_PITCH, 0.5 - (-x * sin + z * cos) / TILE_PITCH);
    }
    face.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    const glow = new ShapeGeometry(slabShape(outline)).rotateX(-Math.PI / 2);
    return { body, face, glow };
    // The key stands for the outline and heading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(
    () => () => {
      shapes.body.dispose();
      shapes.face.dispose();
      shapes.glow.dispose();
    },
    [shapes],
  );
  return shapes;
}
