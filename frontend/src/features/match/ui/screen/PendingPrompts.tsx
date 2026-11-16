import { blessingTurns } from "@/game/domain/board/blessings";
import { DIVINE_CARDS } from "@/game/domain/cards/catalog";
import { PLUNDER_CARDS } from "@/game/domain/characters/warden/specters";
import { raidPiles } from "@/game/domain/characters/alchemist/condenser";
import type { MatchStore } from "../../model/matchStore";
import type { MatchView, ViewerControls } from "../../model/matchView";
import { CardChoicePicker } from "../cards/CardChoicePicker";
import { DiscardPicker } from "../cards/DiscardPicker";
import { GracePrompt } from "../hud/GracePrompt";
import { WardPrompt } from "../hud/WardPrompt";

interface PendingPromptsProps {
  store: MatchStore;
  view: MatchView;
  /** A prompt aimed at another seat stays on that player's screen. */
  controls: ViewerControls;
  nameOf: (id: string | null) => string | null;
}

/** What the rules are waiting on someone to answer, once the animations have caught up. */
export function PendingPrompts({ store, view, controls, nameOf }: PendingPromptsProps) {
  const discardingPlayer = view.players.find((player) => player.id === view.pendingDiscard?.playerId);
  const wardingPlayer = view.players.find((player) => player.id === view.pendingWard?.playerId);
  const plunderVictim = view.players.find((player) => player.id === view.pendingPlunder?.victim);
  const gracedPlayer = view.players.find((player) => player.id === view.pendingGrace?.playerId);
  return (
    <>
      {view.pendingGrace?.offer === "blessing" && gracedPlayer && controls.answers.grace && !view.isAnimating && (
        <GracePrompt turns={blessingTurns(gracedPlayer)} onPick={(blessing) => store.chooseGrace({ blessing })} />
      )}
      {view.pendingGrace?.offer === "relic" && controls.answers.grace && !view.isAnimating && (
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
      {view.pendingPlunder && plunderVictim && controls.answers.plunder && !view.isAnimating && (
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
      {view.pendingRaid && controls.answers.raid && !view.isAnimating && (
        <CardChoicePicker
          title={view.pendingRaid.own ? "Condensador de Cemitério" : "Cemitério"}
          subtitle={`${nameOf(view.pendingRaid.owner)}: escolha ${raidPicks(view)} ${raidPicks(view) === 1 ? "carta" : "cartas"} ${view.pendingRaid.own ? "do seu cemitério" : "de qualquer cemitério"} para a mão.`}
          accent="emerald"
          cards={raidPiles(view.players, view.pendingRaid).piles.flatMap((player) => [...player.discard].reverse())}
          max={raidPicks(view)}
          required
          confirmLabel="Trazer de volta"
          onPick={store.raidGraveyard}
        />
      )}
      {view.pendingWard && wardingPlayer?.ability && controls.answers.ward && !view.isAnimating && (
        <WardPrompt ability={wardingPlayer.ability} threat={view.pendingWard.threat} onAnswer={store.answerWard} />
      )}
      {view.pendingDiscard && discardingPlayer && controls.answers.discard && !view.isAnimating && (
        <DiscardPicker hand={discardingPlayer.hand} drawn={view.pendingDiscard.drawn} onDiscard={store.discardCard} />
      )}
    </>
  );
}

function raidPicks(view: MatchView): number {
  return view.pendingRaid ? raidPiles(view.players, view.pendingRaid).picks : 0;
}
