/** Crystal Fairy: her wand and snow, the tiles she enchants and the Eternal Winter. */
import { useMemo } from "react";
import { Vector3, type Object3D } from "three";
import { frozenTiles } from "@/game/domain/characters/fairy/winter";
import type { PlayerId } from "@/game/domain/types";
import { playerColor } from "../../characters";
import type { MatchView } from "../../model/matchView";
import type { BoardLayout } from "../boardLayout";
import { FIGURE_HEIGHT } from "../character/core/figure";
import { FrostStream } from "../character/fairy/FrostStream";
import { FrostWand } from "../character/fairy/FrostWand";
import { SnowBind } from "../character/fairy/SnowBind";
import { SnowHopBurst } from "../character/fairy/SnowHopBurst";
import { EnchantedTileMark } from "../character/fairy/EnchantedTileMark";
import { SQUARE_SLAB } from "../slab";
import { WinterIce } from "../character/fairy/WinterIce";
import { Delayed } from "../TrapSmash";
import type { BoardFx, TokenFx } from "./types";

/** Anyone stuck in her snow: it wraps them, then just their legs. */
export function Snowbound({ token }: { token: TokenFx }) {
  return <SnowBind rounds={token.player.snowbound?.rounds ?? 0} />;
}

export function SnowHop({ token }: { token: TokenFx }) {
  return (
    token.hopBurst !== null && (
      <Delayed key={`hop${token.hopBurst}`} seconds={token.character?.hopTakeoffSeconds ?? 0}>
        <SnowHopBurst />
      </Delayed>
    )
  );
}

export function FrostWandProp({ token, figure }: { token: TokenFx; figure: Object3D }) {
  return token.character?.wand && <FrostWand figure={figure} active={token.live.wandOut} tip={token.wandTip} />;
}

export function EnchantedTiles({ fx: { view, layout, shown } }: { fx: BoardFx }) {
  return view.enchantedTiles
    .filter(({ tile }) => shown(tile))
    .map(({ tile, owner }) => (
      <EnchantedTileMark
        key={`enchanted${tile}`}
        position={layout.position(tile)}
        outline={layout.slab(tile)?.outline}
        color={playerColor(owner)}
      />
    ));
}

/** Snow on every frozen tile, like her enchanted ones; snowed and burning tiles keep their own look. */
export function EternalWinter({ fx: { view, board, layout } }: { fx: BoardFx }) {
  const tiles = useMemo(() => {
    const covered = new Set([...view.enchantedTiles, ...view.blackFlames].map(({ tile }) => tile));
    return frozenTiles(view.winter, board.startTile)
      .filter((tile) => !covered.has(tile))
      .map((tile) => ({ tile, position: layout.position(tile), outline: layout.slab(tile)?.outline ?? SQUARE_SLAB }));
  }, [view.winter, view.enchantedTiles, view.blackFlames, board, layout]);
  return (
    <WinterIce
      tiles={tiles}
      color={view.winter ? playerColor(view.winter.owner) : "#7dd3fc"}
      capacity={board.finishTile}
    />
  );
}

export function SnowStream({ fx: { view, layout, wandTips } }: { fx: BoardFx }) {
  const stream = view.fx.frostStream;
  return (
    stream && (
      <FrostStream
        key={`frost${stream.id}`}
        from={streamStart(view, layout, wandTips.get(stream.playerId), stream.playerId)}
        to={layout.position(stream.tile)}
      />
    )
  );
}

/** Her wand's tip, or above her head if it's never been seen. */
function streamStart(view: MatchView, layout: BoardLayout, tip: Vector3 | undefined, playerId: PlayerId): Vector3 {
  if (tip && tip.lengthSq() > 0) return tip;
  const tile = view.players.find((player) => player.id === playerId)?.position ?? 0;
  const [x, y, z] = layout.position(tile);
  return new Vector3(x, y + FIGURE_HEIGHT * 0.8, z);
}
