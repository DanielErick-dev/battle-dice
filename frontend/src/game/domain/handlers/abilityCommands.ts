import { abilityBlocker } from "../abilities/ability";
import { ABILITY_EFFECTS } from "../abilities/effects";
import { GameRuleError } from "../core/errors";
import { playerIn, startDraft, updatePlayer } from "../core/draft";
import { resolveWard } from "../board/harm";
import { receiveGrace } from "../characters/seraphiel/seraph";
import { takePlunder } from "../characters/warden/specters";
import { placeVoid } from "../characters/zarek/void";
import { assertCanAct, KEEPS_TURN, pendingAnswer, settle } from "./shared";
import type { CommandHandlers } from "./types";

export const abilityCommands: CommandHandlers<
  "activateAbility" | "plunderCards" | "answerWard" | "chooseGrace" | "placeVoid"
> = {
  // A free action on his own turn: a harm reshapes the board itself.
  placeVoid: (state, { playerId, ...placement }, deps) => {
    assertCanAct(state, playerId);
    const draft = startDraft(state, deps.random);
    const board = placeVoid(draft, playerId, placement);
    const settled = settle(draft, playerId, KEEPS_TURN);
    return { ...settled, state: { ...settled.state, board } };
  },

  // The ability's effect lasts for the rest of the turn.
  activateAbility: (state, command, deps) => {
    const { playerId } = command;
    assertCanAct(state, playerId);
    const draft = startDraft(state, deps.random);
    const player = playerIn(draft, playerId);
    const blocker = abilityBlocker(player);
    if (blocker || !player.ability) throw new GameRuleError(blocker ?? "NO_ABILITY");

    updatePlayer(draft, playerId, () => ({ abilityCharge: 0 }));
    draft.events.push({ type: "abilityUsed", playerId, ability: player.ability });
    ABILITY_EFFECTS[player.ability]?.(draft, playerId, command, deps);

    const settled = settle(draft, playerId, KEEPS_TURN);
    if (settled.state.turn !== state.turn) return settled;
    return {
      ...settled,
      // Time Warp's extra turn waits for the turn to end, as a card's would.
      state: { ...settled.state, abilityInUse: player.ability, bonusTurn: state.bonusTurn || draft.extraTurn },
    };
  },

  // The Warden picks what their Plunder specter takes; play goes on as the move left it.
  plunderCards: (state, { playerId, cardUids }, deps) => {
    const pending = pendingAnswer(state, state.pendingPlunder, "NO_PLUNDER_PENDING", ({ owner }) => owner === playerId);
    const draft = startDraft({ ...state, pendingPlunder: null }, deps.random);
    takePlunder(draft, pending, cardUids);
    return settle(draft, pending.victim, { endsTurn: pending.endsTurn, extraTurn: pending.extraTurn });
  },

  // Resumes a landing paused on the ward prompt.
  answerWard: (state, { playerId, use }, deps) => {
    const pending = pendingAnswer(state, state.pendingWard, "NO_WARD_PENDING", (ward) => ward.playerId === playerId);
    const draft = startDraft({ ...state, pendingWard: null }, deps.random);
    resolveWard(draft, playerId, pending.tile, pending.threat, use);
    return settle(draft, playerId, { endsTurn: pending.endsTurn, extraTurn: pending.extraTurn || draft.extraTurn });
  },

  // Seraphiel's pick on the heaven tile he stopped on; play goes on as the move left it.
  chooseGrace: (state, command, deps) => {
    const { playerId } = command;
    const pending = pendingAnswer(
      state,
      state.pendingGrace,
      "NO_GRACE_PENDING",
      (grace) => grace.playerId === playerId,
    );
    const draft = startDraft({ ...state, pendingGrace: null }, deps.random);
    receiveGrace(draft, playerId, pending.tile, pending.offer, command);
    return settle(draft, playerId, { endsTurn: pending.endsTurn, extraTurn: pending.extraTurn });
  },
};
