"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import {
  CHARACTERS,
  type CharacterClip,
  type CharacterDefinition,
  type CharacterId,
  type ClipLengths,
} from "@/features/match/characters";
import { CharacterModel } from "@/features/match/scene/character/CharacterModel";
import { HeldVial, PourStream, SmokeCloud } from "@/features/match/scene/character/AlchemyVial";
import { EnergyBlades } from "@/features/match/scene/character/EnergyBlades";
import { ArcherIntro } from "@/features/match/scene/character/ArcherIntro";
import { BoneRise } from "@/features/match/scene/character/BoneRise";
import { ScribeIntro } from "@/features/match/scene/character/ScribeIntro";
import { JesterCards } from "@/features/match/scene/character/JesterCards";
import { LimbLightning } from "@/features/match/scene/character/LimbLightning";
import {
  LevitationAura,
  LevitationBurst,
  levitationLift,
  stepLevitation,
} from "@/features/match/scene/character/Levitation";
import { useRuneTexture } from "@/features/match/scene/character/runeCircle";
import { WitchStaff } from "@/features/match/scene/character/WitchStaff";
import { preferences, usePreference } from "@/features/settings/preferences";
import { cn } from "@/lib/utils";
import { Graveyard } from "./Graveyard";
import { Scriptorium } from "./Scriptorium";

const FIGURE_HEIGHT = 1.7;
/**
 * The camera looks at the origin: the figure stands a little less than half its height below,
 * framed with room around it and the pedestal inside the stage's box.
 */
const FLOOR_Y = -FIGURE_HEIGHT / 2 + 0.15;
const PEDESTAL_RADIUS = 0.62;
const PEDESTAL_DEPTH = 0.12;
/** The cold glimmer over a graveyard stage (see CharacterDefinition.stage). */
const GRAVE_LIGHT = "#6f8a6c";
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
 * How high a levitating character hovers over the pedestal (on top of what its float clip
 * already lifts), and how much it bobs once up.
 */
const HOVER_HEIGHT = 0.36;
const HOVER_BOB = 0.035;
/** Without an intro, a levitating character stands a moment before rising, so the lift reads. */
const RISE_DELAY_MS = 600;
/**
 * An intro pour (see CharacterDefinition.introPourSeconds): the vial tips for this long, pours
 * for this long, and the first drops take about this long to reach the floor and burst into smoke.
 */
const POUR_TIP_MS = 300;
const POUR_MS = 1000;
const POUR_DROP_MS = 550;
/** How quickly the vial tips over and back. */
const TIP_RATE = 7;

/**
 * The chosen character on a rune pedestal, facing the camera: it plays its intro once, then
 * loops its showcase (or idles without them). Dragging turns the figure to look it over; let go
 * and it swings back. One canvas for the whole menu page: the picker only swaps the model.
 */
export function CharacterStage({ characterId, className }: { characterId: CharacterId; className?: string }) {
  const { color: accent, stage }: CharacterDefinition = CHARACTERS[characterId];
  const graveyard = stage === "graveyard";
  // A graveyard is lit by a cold, sickly glimmer rather than the character's bright accent.
  const color = graveyard ? GRAVE_LIGHT : accent;
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
          background: `radial-gradient(ellipse, ${graveyard ? "#000" : color}, transparent 70%)`,
        }}
      />
      {/* Drawn past the stage's box (the figure stays the same size), so wide moves, blades
          and the pedestal aren't cut off at its edges. The wrapper takes the drag. */}
      <div className="pointer-events-none absolute" style={{ inset: `-${CANVAS_BLEED * 100}%` }}>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 1.25, 4.4], fov: CAMERA_FOV }}
          gl={{ alpha: true }}
          // The Necromancer's dead are cut at the floor as they climb out of it (see BoneRise).
          onCreated={({ gl }) => {
            gl.localClippingEnabled = true;
          }}
        >
          <ambientLight intensity={graveyard ? 0.22 : 0.6} />
          <directionalLight position={[2.5, 4, 3]} intensity={graveyard ? 1.3 : 2.2} />
          {/* Coloured rim light in the character's accent. */}
          <directionalLight position={[-3, 2, -2.5]} intensity={3} color={color} />
          <spotLight
            position={[1.5, 3, -2.5]}
            angle={0.5}
            penumbra={0.8}
            intensity={graveyard ? 5 : 12}
            color={color}
          />
          <Suspense fallback={null}>
            <Turntable angleRef={turn.angle} draggingRef={turn.dragging}>
              <Presentation key={characterId} characterId={characterId} />
            </Turntable>
          </Suspense>
          {stage ? (
            <group position-y={FLOOR_Y}>
              <Suspense fallback={null}>{stage === "graveyard" ? <Graveyard /> : <Scriptorium />}</Suspense>
            </group>
          ) : (
            <RunePedestal color={color} />
          )}
          <RisingMotes key={color} color={color} count={(quality === "high" ? 48 : 18) / (graveyard ? 2 : 1)} />
          <ContactShadows position={[0, FLOOR_Y + 0.002, 0]} scale={3} blur={2.4} opacity={0.7} far={2} />
        </Canvas>
      </div>
    </div>
  );
}

/**
 * The figure's intro once (when it has one), then its showcase loop, centred in frame. A
 * levitating character rises off the pedestal instead, floating with its staff.
 */
function Presentation({ characterId }: { characterId: CharacterId }) {
  const character: CharacterDefinition = CHARACTERS[characterId];
  const showcase: CharacterClip = character.levitates ? "float" : "showcase";
  const pourSeconds = character.introPourSeconds;
  const clip = useRef<CharacterClip>("intro");
  const hovering = useRef(false);
  const hover = useRef<Group>(null);
  /** Levitation progress: 0 on the pedestal, 1 hovering at HOVER_HEIGHT. */
  const rise = useRef(0);
  /** Set as the rise starts, to fire its burst of power once. */
  const [burst, setBurst] = useState<number | null>(null);
  /** The intro pour: how far the vial is tipped, where to, whether it's pouring, where its mouth is. */
  const tilt = useRef(0);
  const tipped = useRef(false);
  const pouring = useRef(false);
  const mouth = useRef(new Vector3());
  /** Set as the poured liquid hits the floor, to burst into smoke once. */
  const [smoke, setSmoke] = useState<number | null>(null);
  useFrame((state, delta) => {
    tilt.current += ((tipped.current ? 1 : 0) - tilt.current) * (1 - Math.exp(-TIP_RATE * delta));
    if (!hover.current) return;
    rise.current = stepLevitation(rise.current, hovering.current, delta);
    const lift = levitationLift(rise.current);
    hover.current.position.y = lift * HOVER_HEIGHT + Math.sin(state.clock.elapsedTime * 1.6) * HOVER_BOB * lift;
  });
  /** Whether the intro is playing, for effects that go with it (e.g. blades of light). */
  const inIntro = useRef(false);
  /** Whether a hand prop is out: through the intro and the showcase (not the plain idle). */
  const propOut = useRef(false);
  const timers = useRef<number[]>([]);
  const onClipLengths = useCallback(
    (lengths: ClipLengths) => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      // Straight to the showcase without an intro (a levitating one after a beat, to rise);
      // otherwise once the intro has played out and its last pose has lingered. Its effects
      // start fading as it ends.
      const introMs = (lengths.intro ?? 0) * 1000;
      const floats = showcase === "float";
      inIntro.current = introMs > 0;
      propOut.current = introMs > 0;
      timers.current = [
        window.setTimeout(() => {
          inIntro.current = false;
          propOut.current = lengths.showcase !== undefined;
        }, introMs),
        window.setTimeout(
          () => {
            clip.current = showcase;
            hovering.current = floats;
            if (floats) setBurst(performance.now());
          },
          introMs > 0 ? introMs + INTRO_HOLD_MS : floats ? RISE_DELAY_MS : 0,
        ),
      ];
      // Mid-intro, the vial is tipped over and poured out; the liquid bursts into smoke.
      const pourAt = (pourSeconds ?? Infinity) * 1000;
      if (introMs > 0 && pourAt < introMs) {
        timers.current.push(
          window.setTimeout(() => (tipped.current = true), pourAt),
          window.setTimeout(() => (pouring.current = true), pourAt + POUR_TIP_MS),
          window.setTimeout(() => setSmoke(performance.now()), pourAt + POUR_TIP_MS + POUR_DROP_MS),
          window.setTimeout(
            () => {
              pouring.current = false;
              tipped.current = false;
            },
            pourAt + POUR_TIP_MS + POUR_MS,
          ),
        );
      }
    },
    [showcase, pourSeconds],
  );
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  return (
    <group position-y={FLOOR_Y}>
      {character.levitates && (
        <>
          <LevitationAura size={FIGURE_HEIGHT} color={character.color} progress={rise} height={HOVER_HEIGHT} />
          {burst !== null && <LevitationBurst key={burst} size={FIGURE_HEIGHT} color={character.color} />}
        </>
      )}
      {character.handProp === "vial" && (
        <>
          <PourStream size={FIGURE_HEIGHT} color={character.color} mouth={mouth} pouring={pouring} />
          {smoke !== null && <SmokeCloud key={smoke} size={FIGURE_HEIGHT} color={character.color} />}
        </>
      )}
      <group ref={hover}>
        <CharacterModel
          url={character.model}
          height={FIGURE_HEIGHT}
          clip={clip}
          onClipLengths={onClipLengths}
          introSpeed={character.introSpeed}
        >
          {(figure) => (
            <>
              {character.energyBlades && <EnergyBlades figure={figure} color={character.color} active={inIntro} />}
              {character.levitates && <WitchStaff figure={figure} color={character.color} active={hovering} />}
              {character.introCards && (
                <JesterCards
                  figure={figure}
                  size={FIGURE_HEIGHT}
                  color={character.color}
                  beats={character.introCards}
                  active={inIntro}
                />
              )}
              {character.introArrows && (
                <ArcherIntro
                  figure={figure}
                  size={FIGURE_HEIGHT}
                  color={character.color}
                  beats={character.introArrows}
                  active={inIntro}
                />
              )}
              {character.introSeals && (
                <ScribeIntro figure={figure} size={FIGURE_HEIGHT} beats={character.introSeals} active={inIntro} />
              )}
              {character.introBones && (
                <BoneRise figure={figure} size={FIGURE_HEIGHT} beats={character.introBones} active={inIntro} />
              )}
              {character.limbLightning && (
                <LimbLightning
                  figure={figure}
                  size={FIGURE_HEIGHT}
                  color={character.color}
                  active={inIntro}
                  strikeSeconds={
                    character.introStrikeSeconds === undefined
                      ? undefined
                      : character.introStrikeSeconds / (character.introSpeed ?? 1)
                  }
                />
              )}
              {character.handProp === "vial" && (
                <HeldVial figure={figure} color={character.color} active={propOut} tilt={tilt} mouth={mouth} />
              )}
            </>
          )}
        </CharacterModel>
      </group>
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
