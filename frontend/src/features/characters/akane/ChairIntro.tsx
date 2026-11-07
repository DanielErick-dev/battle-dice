"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, MeshStandardMaterial, Vector3, type Group, type Object3D, type Sprite } from "three";
import { FIGURE_HEIGHT } from "../core/figure";
import { handUnit, InHand } from "../core/inHand";
import { useDisposable } from "../shared/disposal";
import { useSoftDisc } from "../shared/softDisc";
import { useAge } from "@/features/shared/three/useAge";
import { FireRing } from "./Blaze";
import { FlameCard } from "./FlameCard";

/**
 * The school chair, as shares of his height: in the stand-up clip his hip joints sit at 0.32 of it and the
 * underside of his thighs about 0.05 lower (measured), so the seat top goes there, centred under them.
 */
const SEAT = { top: 0.27, width: 0.27, depth: 0.25, z: 0, thickness: 0.02 };
const BACK = { height: 0.2, gap: 0.08, thickness: 0.018 };
const TUBE = 0.012;
const WOOD = new Color("#a8743f");
const CHAR = new Color("#140804");
/** How long the chair takes to burn away. */
const BURN_SECONDS = 0.8;

/**
 * Akane's menu intro: he starts slouched on a plain school chair; as he gets up (`riseSeconds` into the intro)
 * it bursts into flames and burns away. In the figure's frame, `size` tall; mounted fresh with every intro.
 */
export function ChairIntro({ size, riseSeconds }: { size: number; riseSeconds: number }) {
  const chair = useRef<Group>(null);
  const age = useAge();
  const wood = useDisposable(useMemo(() => new MeshStandardMaterial({ color: WOOD, roughness: 0.75 }), []));
  const steel = useDisposable(
    useMemo(() => new MeshStandardMaterial({ color: "#3b4048", roughness: 0.4, metalness: 0.7 }), []),
  );
  const woodRef = useRef(wood);

  useFrame(({ clock }) => {
    const burn = (age(clock.elapsedTime) - riseSeconds) / BURN_SECONDS;
    const left = 1 - Math.min(1, Math.max(0, burn));
    if (!chair.current) return;
    chair.current.visible = left > 0;
    chair.current.scale.set(1, left ** 0.6, 1);
    const char = Math.min(1, Math.max(0, burn * 2.5));
    // Charring black as it burns.
    woodRef.current.color.copy(WOOD).lerp(CHAR, char);
  });

  const top = SEAT.top * size;
  const back = (SEAT.z - SEAT.depth / 2) * size;
  const legs = [-1, 1].flatMap((x) => [-1, 1].map((z) => [x, z] as const));
  return (
    <group>
      <group ref={chair}>
        <mesh material={wood} position={[0, top - (SEAT.thickness * size) / 2, SEAT.z * size]} castShadow>
          <boxGeometry args={[SEAT.width * size, SEAT.thickness * size, SEAT.depth * size]} />
        </mesh>
        <mesh
          material={wood}
          position={[0, top + (BACK.gap + BACK.height / 2) * size, back]}
          rotation-x={-0.08}
          castShadow
        >
          <boxGeometry args={[SEAT.width * size * 0.95, BACK.height * size, BACK.thickness * size]} />
        </mesh>
        {legs.map(([x, z]) => (
          <mesh
            key={`${x}${z}`}
            material={steel}
            position={[
              x * (SEAT.width / 2 - TUBE) * size,
              (top - SEAT.thickness * size) / 2,
              (SEAT.z + z * (SEAT.depth / 2 - TUBE)) * size,
            ]}
          >
            <cylinderGeometry args={[TUBE * size * 0.5, TUBE * size * 0.5, top - SEAT.thickness * size, 6]} />
          </mesh>
        ))}
        {/* The back's two uprights, carrying on from the back legs. */}
        {[-1, 1].map((x) => (
          <mesh
            key={x}
            material={steel}
            position={[x * (SEAT.width / 2 - TUBE) * size, top + ((BACK.gap + BACK.height) / 2) * size, back]}
          >
            <cylinderGeometry args={[TUBE * size * 0.5, TUBE * size * 0.5, (BACK.gap + BACK.height) * size, 6]} />
          </mesh>
        ))}
      </group>
      {/* The fire effects are drawn for the match figure: shrunk to this one. */}
      <group scale={size / FIGURE_HEIGHT} position-z={SEAT.z * size}>
        <FireRing delay={riseSeconds} reach={0.6} flames={9} seconds={BURN_SECONDS + 0.2} />
      </group>
    </group>
  );
}

const SNAP_SECONDS = 0.9;

/** The snap of his fingers (`snapSeconds` into the intro): a tall flame and a flash bursting off his right hand. */
export function SnapFlare({ figure, snapSeconds }: { figure: Object3D; snapSeconds: number }) {
  return (
    <InHand figure={figure} bone="RightHand">
      {(hand) => <Flare hand={hand} figure={figure} snapSeconds={snapSeconds} />}
    </InHand>
  );
}

function Flare({ hand, figure, snapSeconds }: { hand: Object3D; figure: Object3D; snapSeconds: number }) {
  const disc = useSoftDisc();
  const root = useRef<Group>(null);
  const flash = useRef<Sprite>(null);
  const core = useRef<Sprite>(null);
  const tongue = useRef<Group>(null);
  const scratch = useMemo(() => ({ hand: new Vector3(), figure: new Vector3() }), []);
  const age = useAge();

  useFrame(({ clock }) => {
    const t = (age(clock.elapsedTime) - snapSeconds) / SNAP_SECONDS;
    if (!root.current) return;
    root.current.visible = t > 0 && t < 1;
    if (!root.current.visible) return;
    root.current.scale.setScalar(handUnit(hand, figure, scratch));
    const burst = Math.sin(Math.min(1, t * 3) * Math.PI * 0.5) * (1 - t);
    flash.current?.scale.setScalar(0.15 + 0.55 * Math.min(1, t * 3));
    if (flash.current) flash.current.material.opacity = 0.9 * burst;
    core.current?.scale.setScalar(0.16 * (1 - t));
    // Leaps up off his fingers, then sinks into the flame his palm keeps.
    tongue.current?.scale.setScalar(Math.max(0.001, Math.sin(Math.min(1, t * 4) * Math.PI * 0.5) * (1 - t * 0.6)));
  });

  return (
    <group ref={root} visible={false}>
      <group position={[-0.03, 0.09, 0]}>
        <sprite ref={flash}>
          <spriteMaterial map={disc} color="#ff7a2a" transparent depthWrite={false} blending={AdditiveBlending} />
        </sprite>
        <sprite ref={core}>
          <spriteMaterial map={disc} color="#fff1c2" transparent depthWrite={false} blending={AdditiveBlending} />
        </sprite>
        <group ref={tongue}>
          <FlameCard width={0.34} glow={1.6} seed={3} />
        </group>
      </group>
    </group>
  );
}
