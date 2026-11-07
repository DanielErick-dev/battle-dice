import { inHeaven } from "@/game/domain/board/blessings";
import type { Board, Player } from "@/game/domain/types";
import type { MatchStore } from "../../model/matchStore";
import { canActivateAbility, canPlayCard, canRoll, cardsLeftThisTurn, type MatchView } from "../../model/matchView";
import { CardHand } from "../cards/CardHand";
import { AbilityMeter } from "../hud/AbilityMeter";
import { BlessingBadges } from "../hud/BlessingBadges";
import { VoidHold } from "../hud/VoidHold";

interface HandColumnProps {
  store: MatchStore;
  view: MatchView;
  board: Board;
  activePlayer: Player | undefined;
  onActivateAbility: () => void;
  onReleaseVoidItem: (release: number, doubled: boolean) => void;
}

/** The hand and its meters, in a column on the right. */
export function HandColumn({
  store,
  view,
  board,
  activePlayer,
  onActivateAbility,
  onReleaseVoidItem,
}: HandColumnProps) {
  return (
    <div className="absolute top-4 right-4 flex flex-col items-end gap-4 sm:top-6 sm:right-6">
      {activePlayer && view.winnerId === null && (
        <div className="pointer-events-auto max-sm:mt-20">
          <CardHand
            key={activePlayer.id}
            table={{
              board,
              blackFlames: view.blackFlames,
              winter: view.winter,
              destroyedTraps: view.destroyedTraps,
              pinnedTraps: view.pinnedTraps,
              enchantedTiles: view.enchantedTiles,
              scarletFlames: view.scarletFlames,
              players: view.players,
            }}
            player={activePlayer}
            // Who each card can be aimed at (see cardTargets); a protected one turns it away.
            players={view.players}
            canPlay={canPlayCard(view)}
            cardsLeft={cardsLeftThisTurn(view)}
            lastDrawnUid={view.lastDrawnUid}
            onPlay={store.playCard}
            onFuse={canRoll(view) ? store.fuseCards : null}
            onSacrifice={canRoll(view) ? store.sacrificeEnergy : null}
            status={
              <>
                <AbilityMeter
                  player={activePlayer}
                  inUse={view.abilityInUse !== null && view.abilityInUse === activePlayer.ability}
                  onActivate={onActivateAbility}
                  canActivate={canActivateAbility(view)}
                />
                <VoidHold player={activePlayer} canAct={canRoll(view)} onRelease={onReleaseVoidItem} />
                <BlessingBadges player={activePlayer} waiting={inHeaven(board, activePlayer.position)} />
              </>
            }
          />
        </div>
      )}
    </div>
  );
}
