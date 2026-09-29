"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, type Group, type Mesh } from "three";
import {
  CHARACTERS,
  type CharacterClip,
  type CharacterDefinition,
  type CharacterId,
  type ClipLengths,
} from "@/features/match/characters";
import { CharacterModel } from "@/features/match/scene/character/CharacterModel";
import { EnergyBlades } from "@/features/match/scene/character/EnergyBlades";
import { preferences, usePreference } from "@/features/settings/preferences";
import { cn } from "@/lib/utils";

const FIGURE_HEIGHT = 1.7;
/**
 * The camera looks at the origin: the figure stands a little less than half its height below,
 * framed with room around it and the pedestal inside the stage's box.
 */
const FLOOR_Y = -FIGURE_HEIGHT / 2 + 0.15;
const PEDESTAL_RADIUS = 0.62;
const PEDESTAL_DEPTH = 0.12;
/** Radians the figure turns per pixel dragged. */
const DRAG_TURN = 0.012;
/** How quickly the figure follows the drag, and swings back to face the camera once let go. */
const TURN_FOLLOW = 12;
const TURN_RETURN = 2.5;
/** Share of the stage's size the canvas extends past each of its edges. */
const CANVAS_BLEED = 0.2;
/** Widened with the bleed so the figure keeps the size a 32° view of the stage gives it. */
const CAMERA_FOV = (2 * Math.atan((1 + 2 * CANVAS_BLEED) * Math.tan((16 * Math.PI) / 180)) * 180) / Math.PI;
/** The intro's last pose is held this long before the figure eases into its showcase. */
const INTRO_HOLD_MS = 700;

/**
 * The chosen character on a rune pedestal, facing the camera: it plays its intro once, then
 * loops its showcase (or idles without them). Dragging turns the figure to look it over; let go
 * and it swings back. One canvas for the whole menu page: the picker only swaps the model.
 */
export function CharacterStage({ characterId, className }: { characterId: CharacterId; className?: string }) {
  const { color } = CHARACTERS[characterId];
  const quality = usePreference(preferences.effectsQuality);
  const turn = useDragTurn();

  return (
    <div
      className={cn("relative cursor-grab touch-pan-y select-none active:cursor-grabbing", className)}
      onPointerDown={turn.onPointerDown}
      onPointerMove={turn.onPointerMove}
      onPointerUp={turn.onPointerUp}
      onPointerCancel={turn.onPointerUp}
    >
      <div
        aria-hidden
        className="absolute inset-x-[15%] bottom-[6%] h-[12%] rounded-[50%] opacity-70 blur-xl"
        style={{
          background: `radial-gradient(ellipse, ${color}, transparent 70%)`,
        }}
      />
      {/* Drawn past the stage's box (the figure stays the same size), so wide moves, blades
          and the pedestal aren't cut off at its edges. The wrapper takes the drag. */}
      <div className="pointer-events-none absolute" style={{ inset: `-${CANVAS_BLEED * 100}%` }}>
        <Canvas dpr={[1, 2]} camera={{ position: [0, 1.25, 4.4], fov: CAMERA_FOV }} gl={{ alpha: true }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2.5, 4, 3]} intensity={2.2} />
          {/* Coloured rim light in the character's accent. */}
          <directionalLight position={[-3, 2, -2.5]} intensity={3} color={color} />
          <spotLight position={[1.5, 3, -2.5]} angle={0.5} penumbra={0.8} intensity={12} color={color} />
          <Suspense fallback={null}>
            <Turntable angleRef={turn.angle} draggingRef={turn.dragging}>
              <Presentation key={characterId} characterId={characterId} />
            </Turntable>
          </Suspense>
          <RunePedestal color={color} />
          <RisingMotes key={color} color={color} count={quality === "high" ? 48 : 18} />
          <ContactShadows position={[0, FLOOR_Y + 0.002, 0]} scale={3} blur={2.4} opacity={0.7} far={2} />
        </Canvas>
      </div>
    </div>
  );
}

/** The figure's intro once (when it has one), then its showcase loop, centred in frame. */
function Presentation({ characterId }: { characterId: CharacterId }) {
  const character: CharacterDefinition = CHARACTERS[characterId];
  const clip = useRef<CharacterClip>("intro");
  /** Whether the intro is playing, for effects that go with it (e.g. blades of light). */
  const inIntro = useRef(false);
  const timers = useRef<number[]>([]);
  const onClipLengths = useCallback((lengths: ClipLengths) => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    // Straight to the showcase without an intro; otherwise once the intro has played out and
    // its last pose has lingered. Its effects start fading as it ends.
    const introMs = (lengths.intro ?? 0) * 1000;
    inIntro.current = introMs > 0;
    timers.current = [
      window.setTimeout(() => (inIntro.current = false), introMs),
      window.setTimeout(() => (clip.current = "showcase"), introMs > 0 ? introMs + INTRO_HOLD_MS : 0),
    ];
  }, []);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  return (
    <group position-y={FLOOR_Y}>
      <CharacterModel url={character.model} height={FIGURE_HEIGHT} clip={clip} onClipLengths={onClipLengths}>
        {character.energyBlades
          ? (figure) => <EnergyBlades figure={figure} color={character.color} active={inIntro} />
          : undefined}
      </CharacterModel>
    </group>
  );
}

/** Drag state shared by the DOM wrapper (which reads the pointer) and the scene (which turns). */
function useDragTurn() {
  const angle = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);

  return useMemo(
    () => ({
      angle,
      dragging,
      onPointerDown(event: ReactPointerEvent) {
        dragging.current = true;
        lastX.current = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: ReactPointerEvent) {
        if (!dragging.current) return;
        angle.current += (event.clientX - lastX.current) * DRAG_TURN;
        lastX.current = event.clientX;
      },
      onPointerUp() {
        dragging.current = false;
      },
    }),
    [],
  );
}

/** Follows the dragged angle; released, it eases back to face the camera the short way round. */
function Turntable({
  angleRef,
  draggingRef,
  children,
}: {
  angleRef: RefObject<number>;
  draggingRef: RefObject<boolean>;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    if (!draggingRef.current) {
      // Wrap into (-π, π] so a figure turned past halfway comes back the near way.
      angleRef.current = Math.atan2(Math.sin(angleRef.current), Math.cos(angleRef.current));
      angleRef.current *= Math.exp(-TURN_RETURN * delta);
    }
    node.rotation.y += (angleRef.current - node.rotation.y) * (1 - Math.exp(-TURN_FOLLOW * delta));
  });
  return <group ref={group}>{children}</group>;
}

/** A dark stone disc under the figure with a slowly turning ring of glowing runes on top. */
function RunePedestal({ color }: { color: string }) {
  const runes = useRuneTexture();
  const ring = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z += delta * 0.15;
  });

  return (
    <group position-y={FLOOR_Y}>
      {/* Drawn first and leaving no depth, so a blade or foot dipping below the top still
          shows rather than vanishing into the stone. */}
      <mesh position-y={-PEDESTAL_DEPTH / 2} renderOrder={-1}>
        <cylinderGeometry args={[PEDESTAL_RADIUS, PEDESTAL_RADIUS * 1.08, PEDESTAL_DEPTH, 48]} />
        <meshStandardMaterial color="#17131f" metalness={0.7} roughness={0.45} depthWrite={false} />
      </mesh>
      {/* Glowing seam around the rim. */}
      <mesh position-y={-PEDESTAL_DEPTH * 0.35} rotation-x={Math.PI / 2}>
        <torusGeometry args={[PEDESTAL_RADIUS * 1.02, 0.008, 8, 64]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position-y={0.001} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[PEDESTAL_RADIUS * 0.98, 64]} />
        <meshBasicMaterial
          map={runes}
          color={color}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** White rune circle (tinted by the material): two rings, a band of glyphs and a star. */
function useRuneTexture() {
  const texture = useMemo(() => {
    const result = new CanvasTexture(drawRuneCircle());
    result.anisotropy = 4;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function drawRuneCircle(): HTMLCanvasElement {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const centre = size / 2;
  context.translate(centre, centre);
  context.strokeStyle = "white";
  context.lineCap = "round";

  const circle = (radius: number, width: number) => {
    context.lineWidth = width;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  };
  circle(centre * 0.97, 5);
  circle(centre * 0.8, 3);
  circle(centre * 0.52, 3);

  // Glyphs between the outer rings, from a fixed seed so they're the same every visit.
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const glyphs = 24;
  context.lineWidth = 4;
  for (let index = 0; index < glyphs; index += 1) {
    context.save();
    context.rotate((index / glyphs) * Math.PI * 2);
    context.translate(0, -centre * 0.885);
    context.beginPath();
    context.moveTo(0, -14);
    context.lineTo(0, 14);
    for (let stroke = 0; stroke < 2; stroke += 1) {
      const y = (random() - 0.5) * 24;
      context.moveTo(0, y);
      context.lineTo((random() < 0.5 ? -1 : 1) * (6 + random() * 6), y + (random() - 0.5) * 16);
    }
    context.stroke();
    context.restore();
  }

  // Six-pointed star inside the inner ring.
  context.lineWidth = 3;
  for (const offset of [0, Math.PI / 3]) {
    context.beginPath();
    for (let corner = 0; corner <= 3; corner += 1) {
      const angle = offset + (corner / 3) * Math.PI * 2 - Math.PI / 2;
      const point = [Math.cos(angle) * centre * 0.52, Math.sin(angle) * centre * 0.52] as const;
      if (corner === 0) context.moveTo(...point);
      else context.lineTo(...point);
    }
    context.stroke();
  }

  return canvas;
}

/** Glowing motes drifting up around the figure, in the character's accent. */
function RisingMotes({ color, count }: { color: string; count: number }) {
  const sprite = useMoteSprite();
  const { geometry, motes } = useMemo(() => {
    const motes = Array.from({ length: count }, () => spawnMote(true));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    return { geometry, motes };
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const time = state.clock.elapsedTime;
    motes.forEach((mote, index) => {
      mote.height += mote.speed * delta;
      if (mote.height > MOTE_RISE) Object.assign(mote, spawnMote(false));
      const sway = Math.sin(time * 1.3 + mote.phase) * 0.06;
      positions.setXYZ(
        index,
        Math.cos(mote.angle) * mote.radius + sway,
        FLOOR_Y + mote.height,
        Math.sin(mote.angle) * mote.radius,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={sprite}
        color={new Color(color).multiplyScalar(1.6)}
        size={0.06}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/** How high motes rise above the floor before fading back in at the bottom. */
const MOTE_RISE = 2.1;

/** A new mote at the floor, or anywhere along its rise to fill the air from the start. */
function spawnMote(anywhere: boolean) {
  return {
    height: anywhere ? Math.random() * MOTE_RISE : 0,
    angle: Math.random() * Math.PI * 2,
    radius: 0.25 + Math.random() * 0.5,
    speed: 0.18 + Math.random() * 0.3,
    phase: Math.random() * Math.PI * 2,
  };
}

/** A soft round dot, so the points read as glowing embers rather than squares. */
function useMoteSprite() {
  const texture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.5)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
