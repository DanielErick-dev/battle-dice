/** Akane: the flames on his body, scarlet fire on the board, people on fire, his Inner Flame and his cards' fire. */
import { Sparkles } from "@react-three/drei";
import type { Object3D } from "three";
import { tokenPosition } from "../token/tokenPlacement";
import {
  BOLT_FLIGHT,
  FireBolt,
  FireRing,
  FlamePillar,
  STRIKE_IMPACT,
  Supernova,
} from "@/features/characters/akane/Blaze";
import { FuelDice } from "@/features/characters/akane/FuelDice";
import { FIRE_RACE_STEP, fireTrack } from "@/features/characters/akane/fireTrack";
import { useFrame } from "@react-three/fiber";
import { useState } from "react";
import { useAge } from "@/features/shared/three/useAge";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { BodyFlames } from "@/features/characters/akane/BodyFlames";
import { ClothFire } from "@/features/characters/akane/ClothFire";
import { SnapFlare } from "@/features/characters/akane/ChairIntro";
import { HandFireball } from "@/features/characters/akane/HandFireball";
import { BurningAura, InnerFlames } from "@/features/characters/akane/BurningAura";
import { ScarletFlameMark } from "@/features/characters/akane/ScarletFlameMark";
import type { BoardFx, TokenFx } from "./types";

export function HandFlame({ token, figure }: { token: TokenFx; figure: Object3D }) {
  // Snowed in up to the hands, the fire is smothered.
  const buried = (token.player.snowbound?.rounds ?? 0) >= 2;
  return (
    token.character?.handFlame &&
    !buried && (
      <>
        <BodyFlames figure={figure} />
        <ClothFire figure={figure} />
      </>
    )
  );
}

/** His Fire Zone's pitch: a fireball gathers in his hand and bursts off his fingers as he lets it go. */
export function PitchFire({ token, figure }: { token: TokenFx; figure: Object3D }) {
  const release = token.character?.castImpactSeconds;
  // Kept on past the ability's notice (it ends right after the release), so the burst plays out.
  const [last, setLast] = useState<number | null>(null);
  if (token.abilityCast !== null && token.abilityCast !== last) setLast(token.abilityCast);
  if (!token.character?.handFlame || last === null || release === undefined) return null;
  return (
    <group key={`pitch${last}`}>
      <HandFireball figure={figure} releaseSeconds={release} />
      <SnapFlare figure={figure} snapSeconds={release} />
    </group>
  );
}

/** On fire, or Akane himself blazing under his Impetus. */
export function Burning({ token }: { token: TokenFx }) {
  const { burning, impetusRolls } = token.player;
  if (impetusRolls > 0) return <BurningAura fierce />;
  return burning > 0 && <BurningAura />;
}

export function InnerFlame({ token }: { token: TokenFx }) {
  const { innerFlame } = token.player;
  return innerFlame > 0 && <InnerFlames count={innerFlame} />;
}

export function ScarletFlames({ fx: { view, layout, shown } }: { fx: BoardFx }) {
  // Lit by his pitched fireball: each tile catches once it lands, racing on down the line.
  const lob = view.fx.blaze?.kind === "lob" ? view.fx.blaze.tiles : [];
  return view.scarletFlames
    .filter(({ tile }) => shown(tile))
    .map(({ tile }) => (
      <ScarletFlameMark
        key={`scarlet${tile}`}
        position={layout.position(tile)}
        outline={layout.slab(tile)?.outline}
        delay={lob.includes(tile) ? BOLT_FLIGHT + lob.indexOf(tile) * FIRE_RACE_STEP : 0}
      />
    ));
}

/** Pure Fuel's burning dice, for as long as its doubled rolls last. */
export function FuelFire({ token }: { token: TokenFx }) {
  return token.player.fuelRolls > 0 && <FuelDice />;
}

/** Ember Step ready: embers smouldering at his feet until he slides. */
export function EmberFeet({ token }: { token: TokenFx }) {
  return (
    token.player.emberStep && (
      <Sparkles count={14} scale={[0.8, 0.35, 0.8]} position-y={0.18} size={4} speed={0.8} color="#ff8a3a" />
    )
  );
}

/** Fireballs, bursts, the Impetus pillar and the Supernova, one at a time as they go off. */
export function Blaze({ fx: { view, layout } }: { fx: BoardFx }) {
  const blaze = view.fx.blaze;
  if (!blaze) return null;
  const at = tokenPosition(view, layout, blaze.playerId);
  // Acted out with his strike, the fire waits for his hands to hit the ground.
  const strike = blaze.act === "strike" ? STRIKE_IMPACT : 0;
  const bolts = blaze.targetIds.map((id, index) => (
    <FireBolt
      key={id}
      from={at}
      to={tokenPosition(view, layout, id)}
      delay={blaze.kind === "burst" ? strike + 0.2 + index * 0.08 : 0}
    />
  ));
  return (
    <group key={`blaze${blaze.id}`}>
      {blaze.kind === "burst" && (
        <group position={at}>
          <FireRing delay={strike} />
        </group>
      )}
      {blaze.kind === "pillar" && (
        <group position={at}>
          <FlamePillar delay={strike} />
          <FireRing delay={strike} reach={1} flames={8} />
        </group>
      )}
      {blaze.kind === "nova" && <Supernova at={at} sources={blaze.tiles.map((tile) => layout.position(tile))} />}
      {blaze.kind === "lob" && blaze.tiles.length > 0 && (
        <>
          <FireBolt from={at} to={layout.position(blaze.tiles[0])} ground />
          <FireRace from={at} tiles={blaze.tiles.map((tile) => layout.position(tile))} />
        </>
      )}
      {bolts}
    </group>
  );
}

/** Moves fireTrack along with the Fire Zone's front: the fireball's flight, then tile after tile as they catch. */
function FireRace({ from, tiles }: { from: Vec3; tiles: readonly Vec3[] }) {
  const age = useAge();
  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    const [x0, y0, z0] = from;
    if (t < BOLT_FLIGHT) {
      const [x1, y1, z1] = tiles[0];
      const k = t / BOLT_FLIGHT;
      fireTrack.position.set(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, z0 + (z1 - z0) * k);
      return;
    }
    const along = Math.min(tiles.length - 1, (t - BOLT_FLIGHT) / FIRE_RACE_STEP);
    const index = Math.floor(along);
    const [ax, ay, az] = tiles[index];
    const [bx, by, bz] = tiles[Math.min(tiles.length - 1, index + 1)];
    const k = along - index;
    fireTrack.position.set(ax + (bx - ax) * k, ay + (by - ay) * k, az + (bz - az) * k);
  });
  return null;
}
