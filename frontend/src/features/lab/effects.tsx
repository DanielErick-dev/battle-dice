"use client";

import { NormalBlending } from "three";
import { AppearanceMode, RenderMode, VFXEmitter, VFXParticles } from "wawa-vfx";
import { EFFECT_SCALE } from "@/features/match/scene/character/figure";
import { FrostAura } from "@/features/match/scene/FrostAura";
import { HealingEmitter, HealingParticles } from "@/features/match/scene/vfx/healing";

/** An effect to try round the figure (world units: it stands 3 tall at the origin). */
export interface LabEffect {
  id: string;
  name: string;
  /** What it is and where it could go in the game. */
  hint: string;
  render: () => React.ReactNode;
}

/** wawa-vfx samples (`debug` puts each emitter's settings in the Leva panel) beside our hand-made Untamed aura. */
export const LAB_EFFECTS: readonly LabEffect[] = [
  {
    id: "untamed",
    name: "Aura do Indomável (atual)",
    hint: "A nossa, feita à mão no código. Pra comparar com as da biblioteca.",
    render: () => (
      <group scale={EFFECT_SCALE}>
        <FrostAura active delay={0} />
      </group>
    ),
  },
  {
    id: "blizzard",
    name: "Nevasca",
    hint: "Flocos de neve subindo em volta dele. Opção para o Indomável.",
    render: () => (
      <>
        <VFXParticles
          name="blizzard"
          settings={{
            nbParticles: 4000,
            renderMode: RenderMode.Billboard,
            appearance: AppearanceMode.Circular,
            intensity: 1.2,
            fadeSize: [0.1, 0.9],
            fadeAlpha: [0.1, 0.8],
            gravity: [0, 0.4, 0],
          }}
        />
        <VFXEmitter
          debug
          emitter="blizzard"
          settings={{
            loop: true,
            duration: 1,
            nbParticles: 120,
            spawnMode: "time",
            particlesLifetime: [1.5, 3],
            startPositionMin: [-1.1, 0, -1.1],
            startPositionMax: [1.1, 0.4, 1.1],
            directionMin: [-0.3, 1, -0.3],
            directionMax: [0.3, 1, 0.3],
            size: [0.03, 0.08],
            speed: [0.4, 1.2],
            colorStart: ["#ffffff", "#dff4ff"],
            colorEnd: ["#93c5fd"],
          }}
        />
      </>
    ),
  },
  {
    id: "crystals",
    name: "Cristais flutuando",
    hint: "Cristaizinhos 3D girando e subindo devagar. Opção para o Indomável.",
    render: () => (
      <>
        <VFXParticles
          name="crystals"
          geometry={<octahedronGeometry args={[0.5, 0]} />}
          settings={{
            nbParticles: 600,
            renderMode: RenderMode.Mesh,
            intensity: 1.4,
            fadeSize: [0.15, 0.85],
            fadeAlpha: [0.1, 0.9],
            gravity: [0, 0.1, 0],
          }}
        />
        <VFXEmitter
          debug
          emitter="crystals"
          settings={{
            loop: true,
            duration: 1,
            nbParticles: 14,
            spawnMode: "time",
            particlesLifetime: [2, 4],
            startPositionMin: [-1, 0.4, -1],
            startPositionMax: [1, 2.4, 1],
            startRotationMin: [0, 0, 0],
            startRotationMax: [3, 3, 3],
            rotationSpeedMin: [-2, -2, -2],
            rotationSpeedMax: [2, 2, 2],
            directionMin: [-0.2, 0.5, -0.2],
            directionMax: [0.2, 1, 0.2],
            size: [0.06, 0.14],
            speed: [0.1, 0.3],
            colorStart: ["#dff4ff", "#93c5fd"],
            colorEnd: ["#60a5fa"],
          }}
        />
      </>
    ),
  },
  {
    id: "iceBurst",
    name: "Explosão de gelo",
    hint: "Estilhaços saindo do peito. Opção para a ativação do Indomável.",
    render: () => (
      <>
        <VFXParticles
          name="iceBurst"
          settings={{
            nbParticles: 2000,
            renderMode: RenderMode.StretchBillboard,
            stretchScale: 1.5,
            intensity: 2,
            fadeSize: [0, 0.8],
            fadeAlpha: [0, 0.6],
            gravity: [0, -6, 0],
            easeFunction: "easeOutQuad",
          }}
        />
        <group position-y={1.6}>
          <VFXEmitter
            debug
            emitter="iceBurst"
            settings={{
              loop: true,
              duration: 1.6,
              nbParticles: 90,
              spawnMode: "burst",
              particlesLifetime: [0.4, 1],
              startPositionMin: [-0.15, -0.15, -0.15],
              startPositionMax: [0.15, 0.15, 0.15],
              directionMin: [-1, -0.2, -1],
              directionMax: [1, 1, 1],
              size: [0.03, 0.08],
              speed: [3, 7],
              colorStart: ["#ffffff", "#bfe3ff"],
              colorEnd: ["#60a5fa"],
            }}
          />
        </group>
      </>
    ),
  },
  {
    id: "flames",
    name: "Chamas carmesim",
    hint: "Fogo subindo em volta. Poderia ser a aura da Kage Rubra.",
    render: () => (
      <>
        <VFXParticles
          name="flames"
          settings={{
            nbParticles: 5000,
            renderMode: RenderMode.Billboard,
            appearance: AppearanceMode.Circular,
            intensity: 2.2,
            fadeSize: [0.05, 0.6],
            fadeAlpha: [0, 0.7],
            gravity: [0, 1.5, 0],
            easeFunction: "easeInQuad",
          }}
        />
        <VFXEmitter
          debug
          emitter="flames"
          settings={{
            loop: true,
            duration: 1,
            nbParticles: 260,
            spawnMode: "time",
            particlesLifetime: [0.5, 1.2],
            startPositionMin: [-0.7, 0, -0.7],
            startPositionMax: [0.7, 0.2, 0.7],
            directionMin: [-0.15, 1, -0.15],
            directionMax: [0.15, 1, 0.15],
            size: [0.15, 0.4],
            speed: [0.6, 1.6],
            colorStart: ["#ff7a1a", "#ff2d55"],
            colorEnd: ["#3b0010"],
          }}
        />
      </>
    ),
  },
  {
    id: "sparks",
    name: "Faíscas elétricas",
    hint: "Faíscas rápidas em volta. Poderia ser a Fúria do Monge.",
    render: () => (
      <>
        <VFXParticles
          name="sparks"
          settings={{
            nbParticles: 3000,
            renderMode: RenderMode.StretchBillboard,
            stretchScale: 3,
            intensity: 3,
            fadeSize: [0, 0.5],
            fadeAlpha: [0, 0.4],
            gravity: [0, -2, 0],
          }}
        />
        <VFXEmitter
          debug
          emitter="sparks"
          settings={{
            loop: true,
            duration: 0.5,
            nbParticles: 60,
            spawnMode: "time",
            particlesLifetime: [0.15, 0.4],
            startPositionMin: [-0.6, 0.2, -0.6],
            startPositionMax: [0.6, 2.6, 0.6],
            directionMin: [-1, -1, -1],
            directionMax: [1, 1, 1],
            size: [0.015, 0.04],
            speed: [3, 6],
            colorStart: ["#fff7ae", "#facc15"],
            colorEnd: ["#f59e0b"],
          }}
        />
      </>
    ),
  },
  {
    id: "dust",
    name: "Poeira de impacto",
    hint: "Anel de poeira no chão. Poderia ir no empurrão ou na queda.",
    render: () => (
      <>
        <VFXParticles
          name="dust"
          settings={{
            nbParticles: 1500,
            renderMode: RenderMode.Billboard,
            appearance: AppearanceMode.Circular,
            intensity: 1,
            fadeSize: [0, 0.3],
            fadeAlpha: [0, 0.5],
            gravity: [0, 0.3, 0],
            easeFunction: "easeOutCubic",
            blendingMode: NormalBlending,
          }}
        />
        <VFXEmitter
          debug
          emitter="dust"
          settings={{
            loop: true,
            duration: 1.8,
            nbParticles: 70,
            spawnMode: "burst",
            particlesLifetime: [0.8, 1.6],
            startPositionMin: [-0.3, 0.05, -0.3],
            startPositionMax: [0.3, 0.15, 0.3],
            directionMin: [-1, 0, -1],
            directionMax: [1, 0.25, 1],
            size: [0.25, 0.6],
            speed: [1.5, 3.5],
            colorStart: ["#cbb89d", "#a8977f"],
            colorEnd: ["#6b5d4d"],
          }}
        />
      </>
    ),
  },
  {
    id: "healing",
    name: "Partículas de cura",
    hint: "Luzinhas verdes subindo. É a da Erva Curativa no jogo.",
    render: () => (
      <>
        <HealingParticles />
        <HealingEmitter debug />
      </>
    ),
  },
];
