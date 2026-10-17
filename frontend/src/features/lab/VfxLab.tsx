"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useRef, useState } from "react";
import { CHARACTER_IDS, CHARACTERS, type CharacterClip, type CharacterId } from "@/features/match/characters";
import { CharacterModel } from "@/features/match/scene/character/CharacterModel";
import { FIGURE_HEIGHT } from "@/features/match/scene/character/figure";
import { PostEffects } from "@/features/match/scene/PostEffects";
import { cn } from "@/lib/utils";
import { LAB_EFFECTS } from "./effects";

/**
 * A playground for trying visual effects round a character: pick a figure and an effect, turn the
 * camera round, and tweak the effect's settings live in the Leva panel. Not linked from the menus.
 */
export function VfxLab() {
  const [characterId, setCharacterId] = useState<CharacterId>("frostfangBerserker");
  const [effectId, setEffectId] = useState(LAB_EFFECTS[0].id);
  /** Bumped to restart the effect from scratch. */
  const [run, setRun] = useState(0);
  const effect = LAB_EFFECTS.find(({ id }) => id === effectId) ?? LAB_EFFECTS[0];

  return (
    <div className="relative h-dvh w-full bg-[#05070d] text-slate-100">
      <Canvas camera={{ position: [0, 2.6, 7], fov: 40 }} gl={{ antialias: false }}>
        <color attach="background" args={["#0b1020"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[2.5, 4, 3]} intensity={2.2} />
        <directionalLight position={[-3, 2, -2.5]} intensity={2} color={CHARACTERS[characterId].color} />
        <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
          <circleGeometry args={[3, 64]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
        <Suspense fallback={null}>
          <LabFigure key={characterId} characterId={characterId} />
        </Suspense>
        <group key={`${effect.id}${run}`}>{effect.render()}</group>
        <OrbitControls target={[0, 1.4, 0]} minDistance={3} maxDistance={14} />
        <PostEffects quality="high" />
      </Canvas>

      <aside className="absolute left-4 top-4 flex max-h-[calc(100dvh-2rem)] w-72 flex-col gap-3 overflow-y-auto rounded-xl border border-white/10 bg-black/70 p-4 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold">Laboratório de efeitos</h1>
          <p className="text-xs text-slate-400">Arraste pra girar a câmera. Ajuste o efeito no painel da direita.</p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Personagem
          <select
            className="rounded-md border border-white/15 bg-slate-900 px-2 py-1.5"
            value={characterId}
            onChange={(event) => setCharacterId(event.target.value as CharacterId)}
          >
            {CHARACTER_IDS.map((id) => (
              <option key={id} value={id}>
                {CHARACTERS[id].name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          {LAB_EFFECTS.map(({ id, name, hint }) => (
            <button
              key={id}
              type="button"
              onClick={() => setEffectId(id)}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                id === effect.id ? "border-sky-400/70 bg-sky-500/15" : "border-white/10 bg-white/5 hover:bg-white/10",
              )}
            >
              <span className="block font-medium">{name}</span>
              <span className="block text-xs text-slate-400">{hint}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRun((count) => count + 1)}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500"
        >
          Repetir efeito
        </button>
      </aside>
    </div>
  );
}

function LabFigure({ characterId }: { characterId: CharacterId }) {
  const clip = useRef<CharacterClip>("idle");
  return <CharacterModel url={CHARACTERS[characterId].model} height={FIGURE_HEIGHT} clip={clip} />;
}
