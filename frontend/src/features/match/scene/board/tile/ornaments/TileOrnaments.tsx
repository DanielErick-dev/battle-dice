"use client";

import type { Tile } from "@/game/domain/types";
import type { TileTheme } from "../theme/tileTheme";
import { AdvanceChevrons } from "./AdvanceChevrons";
import { CardChest } from "./CardChest";
import { FloatingDie } from "./FloatingDie";
import { Hourglass } from "./Hourglass";
import { PortalVortex } from "./PortalVortex";
import { RelicCard } from "./RelicCard";
import { TrapSpikes } from "./TrapSpikes";

interface TileOrnamentsProps {
  tile: Tile;
  theme: TileTheme;
  highlighted: boolean;
  arrowAngle: number | null;
  /** The way the road runs across the slab. */
  heading: number;
  /** Someone stands on it: what floats over the tile makes way for them. */
  occupied: boolean;
}

/** What stands on a tile and shows its effect: a portal, spikes, chevrons, a die, an hourglass, a card. */
export function TileOrnaments({ tile, theme, highlighted, arrowAngle, heading, occupied }: TileOrnamentsProps) {
  return (
    <>
      {tile.effect.kind === "portal" && <PortalVortex color={theme.glow} active={highlighted} phase={tile.id * 1.7} />}
      {tile.effect.kind === "trap" && <TrapSpikes sprung={occupied} heading={heading} />}
      {tile.effect.kind === "advance" && <AdvanceChevrons color={theme.glow} angle={arrowAngle ?? 0} />}
      {tile.effect.kind === "card" && !tile.effect.cardId && (
        <CardChest color={theme.glow} open={occupied} heading={heading} />
      )}
      {!occupied && (
        <>
          {tile.effect.kind === "extraTurn" && <FloatingDie color={theme.glow} />}
          {tile.effect.kind === "skipTurn" && <Hourglass color={theme.glow} />}
          {tile.effect.kind === "card" && tile.effect.cardId && <RelicCard cardId={tile.effect.cardId} />}
        </>
      )}
    </>
  );
}
