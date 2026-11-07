import { blessingTurns } from "@/game/domain/board/blessings";
import { DIVINE_CARDS } from "@/game/domain/cards/catalog";
import { PLUNDER_CARDS } from "@/game/domain/characters/warden/specters";
import type { MatchStore } from "../../model/matchStore";
import type { MatchView } from "../../model/matchView";
import { CardChoicePicker } from "../cards/CardChoicePicker";
import { DiscardPicker } from "../cards/DiscardPicker";
import { GracePrompt } from "../hud/GracePrompt";
import { WardPrompt } from "../hud/WardPrompt";

interface PendingPromptsProps {
  store: MatchStore;
  view: MatchView;
  nameOf: (id: string | null) => string | null;
}

/** What the rules are waiting on someone to answer, once the animations have caught up. */
export function PendingPrompts({ store, view, nameOf }: PendingPromptsProps) {
  const discardingPlayer = view.players.find((player) => player.id === view.pendingDiscard?.playerId);
  const wardingPlayer = view.players.find((player) => player.id === view.pendingWard?.playerId);
  const plunderVictim = view.players.find((player) => player.id === view.pendingPlunder?.victim);
  const gracedPlayer = view.players.find((player) => player.id === view.pendingGrace?.playerId);
  return (
    <>
      {view.pendingGrace?.offer === "blessing" && gracedPlayer && !view.isAnimating && (
        <GracePrompt turns={blessingTurns(gracedPlayer)} onPick={(blessing) => store.chooseGrace({ blessing })} />
      )}
      {view.pendingGrace?.offer === "relic" && !view.isAnimating && (
        <CardChoicePicker
          title="Relicário do Céu"
          subtitle="Escolha a relíquia que você leva."
          accent="amber"
          cards={DIVINE_CARDS.map((cardId) => ({ uid: cardId, cardId }))}
          max={1}
          required
          confirmLabel="Levar relíquia"
          onPick={([cardId]) => {
            const relic = DIVINE_CARDS.find((candidate) => candidate === cardId);
            if (relic) store.chooseGrace({ cardId: relic });
          }}
        />
      )}
      {view.pendingPlunder && plunderVictim && !view.isAnimating && (
        <CardChoicePicker
          title="Pilhagem Espectral"
          subtitle={`${nameOf(view.pendingPlunder.owner)}: escolha ${Math.min(PLUNDER_CARDS, plunderVictim.hand.length)} cartas de ${plunderVictim.name}.`}
          accent="sky"
          cards={plunderVictim.hand}
          max={Math.min(PLUNDER_CARDS, plunderVictim.hand.length)}
          required
          confirmLabel="Pilhar"
          onPick={store.plunderCards}
        />
      )}
      {view.pendingWard && wardingPlayer?.ability && !view.isAnimating && (
        <WardPrompt ability={wardingPlayer.ability} threat={view.pendingWard.threat} onAnswer={store.answerWard} />
      )}
      {view.pendingDiscard && discardingPlayer && !view.isAnimating && (
        <DiscardPicker hand={discardingPlayer.hand} drawn={view.pendingDiscard.drawn} onDiscard={store.discardCard} />
      )}
    </>
  );
}
