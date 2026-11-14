/** Tenzai: his walls, bonds and hidden breeze on the board, his orbit and Convergence on him, and each bending's burst. */
import {
  BendingBurst,
  BreezeCoil,
  CombustionHands,
  ConvergenceAura,
  ConvergenceEyes,
  ElementOrbit,
  HandTrails,
  HeistStreak,
  StoneWall,
  WaterTether,
} from "@/features/characters/tenzai/ElementalVfx";
import { headingAlong, pathDirection, tokenPosition } from "../token/tokenPlacement";
import type { Object3D } from "three";
import type { BoardFx, TokenFx } from "./types";

export function StoneWalls({ fx: { view, board, layout, shown } }: { fx: BoardFx }) {
  return view.elementals.walls
    .filter(({ tile }) => shown(tile))
    .map((wall) => (
      <StoneWall
        key={`wall${wall.tile}`}
        position={layout.position(wall.tile)}
        heading={headingAlong(pathDirection(board, layout, wall.tile))}
        hp={wall.hp}
        maxHp={wall.maxHp}
        seed={wall.tile}
      />
    ));
}

export function Tethers({ fx: { view, layout } }: { fx: BoardFx }) {
  return view.elementals.tethers.map((tether) => (
    <WaterTether
      key={`tether${tether.owner}`}
      from={tokenPosition(view, layout, tether.target)}
      to={tokenPosition(view, layout, tether.owner)}
    />
  ));
}

/** Only the one who set it sees his breeze (a projected party view never even carries another's). */
export function HiddenBreeze({ fx: { view, layout, viewerId } }: { fx: BoardFx }) {
  return view.elementals.breezes
    .filter((breeze) => breeze.owner === viewerId)
    .map((breeze) => (
      <group key={`breeze${breeze.owner}`} position={tokenPosition(view, layout, breeze.owner)}>
        <BreezeCoil />
      </group>
    ));
}

/** The burst of his latest bending, at his figure or at the tile it struck. */
export function Bending({ fx: { view, layout } }: { fx: BoardFx }) {
  const bending = view.fx.bending;
  if (!bending) return null;
  const at = bending.tile !== undefined ? layout.position(bending.tile) : tokenPosition(view, layout, bending.playerId);
  if (bending.kind === "heist") {
    if (!bending.targetId) return null;
    return (
      <HeistStreak
        key={`bending${bending.id}`}
        from={tokenPosition(view, layout, bending.targetId)}
        to={tokenPosition(view, layout, bending.playerId)}
      />
    );
  }
  return (
    <group key={`bending${bending.id}`} position={at}>
      <BendingBurst kind={bending.kind} />
    </group>
  );
}

export function Orbit({ token }: { token: TokenFx }) {
  const { converged, orbit } = token.player.tenzai;
  if (converged > 0) return <ConvergenceAura />;
  return orbit.length > 0 && <ElementOrbit elements={orbit} />;
}

export function GlowingEyes({ token, figure }: { token: TokenFx; figure: Object3D }) {
  return token.player.tenzai.converged > 0 && <ConvergenceEyes figure={figure} />;
}

export function Combustion({ token }: { token: TokenFx }) {
  return token.player.tenzai.combustion !== null && <CombustionHands />;
}

const CLIP_ELEMENTS = { quake: "earth", tide: "water", flare: "fire", gust: "wind" } as const;

/** His hands trail the element he's bending. */
export function BendingHands({ token, figure }: { token: TokenFx; figure: Object3D }) {
  const clip = token.outburst?.clip;
  if (!clip || !(clip in CLIP_ELEMENTS)) return null;
  const element = CLIP_ELEMENTS[clip as keyof typeof CLIP_ELEMENTS];
  return <HandTrails key={token.outburst?.id} figure={figure} element={element} />;
}
