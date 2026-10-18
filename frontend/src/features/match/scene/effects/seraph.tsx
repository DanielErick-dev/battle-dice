/** Seraphiel: the Fall, heaven's chains and Hell's Drag. */
import { TILE_HEIGHT, type Vec3 } from "../boardLayout";
import { DivineChains } from "../character/DivineChains";
import { EFFECT_SCALE } from "../character/figure";
import { HellHand } from "../character/HellHand";
import { FallBurst } from "../character/SeraphCrown";
import type { BoardFx, TokenFx } from "./types";

/** Feathers burn off him and fire rolls out. */
export function Fall({ token }: { token: TokenFx }) {
  return token.fell !== null && <FallBurst key={`fall${token.fell}`} />;
}

/** The Fallen Angel held at a heaven portal, bound standing. */
export function HeavenChains({ token }: { token: TokenFx }) {
  return <DivineChains active={token.player.chained > 0} />;
}

/** The hand comes up through the top of the tile. */
export function HellsDrag({ fx: { view, layout } }: { fx: BoardFx }) {
  const drag = view.fx.drag;
  if (!drag) return null;
  const [x, y, z] = layout.position(drag.from);
  const ground: Vec3 = [x, y + TILE_HEIGHT / 2, z];
  return (
    <group key={`drag${drag.id}`} position={ground} scale={EFFECT_SCALE}>
      <HellHand groundY={ground[1]} />
    </group>
  );
}
