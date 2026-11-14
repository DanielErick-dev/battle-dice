import { inHeaven } from "@/game/domain/board/blessings";
import type { Board, Player } from "@/game/domain/types";
import type { MatchStore } from "../../model/matchStore";
import { cardsLeftThisTurn, type MatchView, type ViewerControls } from "../../model/matchView";
import { CardHand } from "../cards/CardHand";
import { AbilityMeter } from "../hud/AbilityMeter";
import { BlessingBadges } from "../hud/BlessingBadges";
import { VoidHold } from "../hud/VoidHold";

interface HandColumnProps {
  store: MatchStore;
  view: MatchView;
  controls: ViewerControls;
  board: Board;
  /** The viewer: the active player in hot-seat, the pinned seat's player online. */
  player: Player | undefined;
  onActivateAbility: () => void;
  onReleaseVoidItem: (release: number, doubled: boolean) => void;
}

/** The hand and its meters, in a column on the right. */
export function HandColumn({
  store,
  view,
  controls,
  board,
  player,
  onActivateAbility,
  onReleaseVoidItem,
}: HandColumnProps) {
  return (
    <div className="absolute top-4 right-4 flex flex-col items-end gap-4 sm:top-6 sm:right-6">
      {player && view.winnerId === null && (
        <div className="pointer-events-auto max-sm:mt-20">
          <CardHand
            key={player.id}
            table={{
              board,
              blackFlames: view.blackFlames,
              winter: view.winter,
              destroyedTraps: view.destroyedTraps,
              pinnedTraps: view.pinnedTraps,
              enchantedTiles: view.enchantedTiles,
              scarletFlames: view.scarletFlames,
              players: view.players,
              elementals: view.elementals,
            }}
            player={player}
            // Who each card can be aimed at (see cardTargets); a protected one turns it away.
            players={view.players}
            canPlay={controls.canPlayCard}
            cardsLeft={cardsLeftThisTurn(view)}
            lastDrawnUid={view.lastDrawnUid}
            onPlay={store.playCard}
            onFuse={controls.canRoll ? store.fuseCards : null}
            onSacrifice={controls.canRoll ? store.sacrificeEnergy : null}
            status={
              <>
                <AbilityMeter
                  player={player}
                  inUse={controls.ownsTurn && view.abilityInUse !== null && view.abilityInUse === player.ability}
                  onActivate={onActivateAbility}
                  canActivate={controls.canActivateAbility}
                />
                <VoidHold player={player} canAct={controls.canRoll} onRelease={onReleaseVoidItem} />
                <BlessingBadges player={player} waiting={inHeaven(board, player.position)} />
              </>
            }
          />
        </div>
      )}
    </div>
  );
}
