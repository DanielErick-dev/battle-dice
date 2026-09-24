import type { CSSProperties } from "react";
import type { Player, PlayerId } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { skinFor, type SpriteSheet } from "../config";
import type { SpriteAnchors } from "../scene/spriteAnchors";

interface PlayerSpritesProps {
  players: readonly Player[];
  poweredPlayerId: PlayerId | null;
  anchors: SpriteAnchors;
}

/**
 * Animated character sprites, anchored at the feet. PlayerToken moves each anchor every
 * frame and sets `data-motion` (idle/run) and `data-facing` (left/right) on it.
 */
export function PlayerSprites({ players, poweredPlayerId, anchors }: PlayerSpritesProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {players.map((player) => {
        const { sprites } = skinFor(player.id);
        if (!sprites) return null;

        return (
          <div
            key={player.id}
            ref={anchors.bind(player.id)}
            role="img"
            aria-label={player.name}
            data-motion="idle"
            data-facing="right"
            data-aura={player.id === poweredPlayerId ? "on" : "off"}
            className="group absolute top-0 left-0 size-0 origin-top-left opacity-0 will-change-transform"
          >
            <div className="size-0 group-data-[facing=left]:-scale-x-100">
              <SpriteStrip sheet={sprites.idle} className="group-data-[motion=run]:hidden" />
              <SpriteStrip sheet={sprites.run} className="hidden group-data-[motion=run]:block" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SpriteStrip({ sheet, className }: { sheet: SpriteSheet; className?: string }) {
  const style = {
    width: (sheet.displayHeight * sheet.frameWidth) / sheet.frameHeight,
    height: sheet.displayHeight,
    backgroundImage: `url(${sheet.src})`,
    "--frames": sheet.frames,
    "--fps": sheet.fps,
  } as CSSProperties;

  return <div style={style} className={cn("sprite-strip absolute bottom-0 left-0 -translate-x-1/2", className)} />;
}
