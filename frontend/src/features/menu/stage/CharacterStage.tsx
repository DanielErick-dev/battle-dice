"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useRef, useState, type RefObject } from "react";
import type { AmbientLight, DirectionalLight, SpotLight } from "three";
import { CHARACTERS, type CharacterDefinition, type CharacterId } from "@/features/characters";
import { preferences, usePreference } from "@/features/settings/preferences";
import { cn } from "@/lib/utils";
import { useStageSounds } from "../audio/useStageSounds";
import { GreekColumns } from "@/features/characters/themis/GreekColumns";
import { FIGURE_HEIGHT, FLOOR_Y } from "./layout";
import { Presentation } from "./Presentation";
import { RisingMotes } from "./RisingMotes";
import { RunePedestal } from "./RunePedestal";
import { SCENERY, type Scenery } from "./scenery";
import { StageShake } from "./StageShake";
import { Turntable, useDragTurn } from "./Turntable";

/** Share of the stage's size the canvas extends past each of its edges. */
const CANVAS_BLEED = 0.2;
const BLEED_FRACTION = CANVAS_BLEED / (1 + 2 * CANVAS_BLEED);
const BLEED_SHARE = BLEED_FRACTION * 100;
// The canvas fades out over its bleed, so what reaches past the stage's box thins away instead of a hard edge.
const FADE_SIDES = `linear-gradient(to right, transparent, black ${BLEED_SHARE}%, black ${100 - BLEED_SHARE}%, transparent)`;
const FADE_ENDS = `linear-gradient(to bottom, transparent, black ${BLEED_SHARE}%, black ${100 - BLEED_SHARE}%, transparent)`;
// Characters that come down from the sky (CharacterDefinition.descends) fade sooner at the top.
const FADE_TOP = `linear-gradient(to bottom, transparent ${BLEED_FRACTION * 60}%, black ${BLEED_FRACTION * 100 + 4}%)`;
/** Widened with the bleed so the figure keeps the size a 32° view of the stage gives it. */
const CAMERA_FOV = (2 * Math.atan((1 + 2 * CANVAS_BLEED) * Math.tan((16 * Math.PI) / 180)) * 180) / Math.PI;

/** One canvas for the whole menu page: the picker only swaps the model, so switching never rebuilds the scene. */
export function CharacterStage({ characterId, className }: { characterId: CharacterId; className?: string }) {
  const {
    color: accent,
    stage,
    descends,
    introSword,
    introSpeed,
    meditates,
  }: CharacterDefinition = CHARACTERS[characterId];
  const scenery: Scenery | undefined = stage && SCENERY[stage];
  const dim = scenery?.dim ?? false;
  const color = scenery?.light ?? accent;
  const quality = usePreference(preferences.effectsQuality);
  const sounds = useStageSounds();
  // Replaying with sound works now that the page has had a click.
  const [encore, setEncore] = useState(0);
  const turn = useDragTurn(() => setEncore((count) => count + 1));
  /** How hard the wind blows through the stage (0 to 1): Seraphiel's wingbeats. */
  const gust = useRef(0);
  /** Share of the light that's on, for scenery that switches it (see SceneryProps.lights). */
  const lights = useRef(1);
  const introAt = useRef<number | null>(null);
  const setLights = useCallback((level: number) => void (lights.current = level), []);
  const introSeconds = useCallback(
    () => (introAt.current === null ? null : performance.now() / 1000 - introAt.current),
    [],
  );
  const onIntro = useCallback((at: number | null) => void (introAt.current = at), []);

  return (
    <div
      className={cn("relative cursor-grab touch-pan-y select-none active:cursor-grabbing", className)}
      onPointerDown={turn.onPointerDown}
      onPointerMove={turn.onPointerMove}
      onPointerUp={turn.onPointerUp}
      onPointerCancel={turn.onPointerCancel}
    >
      <div
        aria-hidden
        className="absolute inset-x-[15%] bottom-[6%] h-[12%] rounded-[50%] opacity-70 blur-xl"
        style={{
          background: `radial-gradient(ellipse, ${dim ? "#000" : color}, transparent 70%)`,
        }}
      />
      {/* Drawn past the stage's box so wide moves aren't cut off; the wrapper takes the drag. */}
      <div
        className="pointer-events-none absolute"
        style={{
          inset: `-${CANVAS_BLEED * 100}%`,
          maskImage: `${FADE_SIDES}, ${descends ? FADE_TOP : FADE_ENDS}`,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      >
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 1.25, 4.4], fov: CAMERA_FOV }}
          gl={{ alpha: true, powerPreference: "high-performance" }}
          // The Necromancer's dead are cut at the floor as they climb out of it (see BoneRise).
          onCreated={({ gl }) => {
            gl.localClippingEnabled = true;
          }}
        >
          <StageLights dim={dim} color={color} level={lights} />
          <Suspense fallback={null}>
            <Turntable angleRef={turn.angle} draggingRef={turn.dragging}>
              <Presentation
                key={`${characterId}:${encore}`}
                characterId={characterId}
                sounds={sounds}
                gustRef={gust}
                onIntro={onIntro}
              />
            </Turntable>
          </Suspense>
          {scenery ? (
            <group position-y={FLOOR_Y}>
              <Suspense fallback={null}>
                <scenery.component
                  gust={gust}
                  intro={`${characterId}:${encore}`}
                  setLights={setLights}
                  introSeconds={introSeconds}
                />
                {/* Part of the ground, so they stay put while the figure is turned; replayed with each intro. */}
                {introSword && (
                  <GreekColumns
                    key={`${characterId}:${encore}`}
                    size={FIGURE_HEIGHT}
                    riseSeconds={introSword.plantSeconds / (introSpeed ?? 1)}
                  />
                )}
              </Suspense>
            </group>
          ) : (
            !meditates && <RunePedestal color={color} />
          )}
          {!scenery?.weather && (
            <RisingMotes key={color} color={color} count={(quality === "high" ? 48 : 18) / (dim ? 2 : 1)} />
          )}
          <StageShake gust={gust} />
          <ContactShadows position={[0, FLOOR_Y + 0.002, 0]} scale={3} blur={2.4} opacity={0.7} far={2} />
        </Canvas>
      </div>
    </div>
  );
}

/** The stage's lights, each scaled every frame by `level`. */
function StageLights({ dim, color, level }: { dim: boolean; color: string; level: RefObject<number> }) {
  const ambient = useRef<AmbientLight>(null);
  const key = useRef<DirectionalLight>(null);
  const rim = useRef<DirectionalLight>(null);
  const spot = useRef<SpotLight>(null);
  const base = { ambient: dim ? 0.22 : 0.6, key: dim ? 1.3 : 2.2, rim: 3, spot: dim ? 5 : 12 };
  useFrame(() => {
    const scale = level.current;
    if (ambient.current) ambient.current.intensity = base.ambient * scale;
    if (key.current) key.current.intensity = base.key * scale;
    if (rim.current) rim.current.intensity = base.rim * scale;
    if (spot.current) spot.current.intensity = base.spot * scale;
  });
  return (
    <>
      <ambientLight ref={ambient} intensity={base.ambient} />
      <directionalLight ref={key} position={[2.5, 4, 3]} intensity={base.key} />
      <directionalLight ref={rim} position={[-3, 2, -2.5]} intensity={base.rim} color={color} />
      <spotLight ref={spot} position={[1.5, 3, -2.5]} angle={0.5} penumbra={0.8} intensity={base.spot} color={color} />
    </>
  );
}
