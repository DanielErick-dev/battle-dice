import { abilityBlocker, type AbilityId } from "../abilities/ability";
import { LEVITATION_TURNS, STUDY_DRAWS } from "../abilities/basic";
import { loseArrowRain } from "../characters/archer/arrowRain";
import { unleash } from "../characters/bjorn/untamed";
import { playCardGamble } from "../characters/jester/cardGamble";
import { GameRuleError } from "../core/errors";
import { drawCard } from "../cards/hand";
import { playerIn, startDraft, updatePlayer, type Draft } from "../core/draft";
import { bloom, freezeTiles } from "../characters/fairy/winter";
import { lightFlames, raiseArmour } from "../characters/kage/flames";
import { resolveWard } from "../board/harm";
import { cleansingTide } from "../characters/auric/cleansingTide";
import { plasmaCannon } from "../characters/alva/plasmaCannon";
import { seraphBlessing } from "../characters/seraphiel/blessing";
import { timeWarp } from "../characters/cronos/timeWarp";
import { resurrectCards } from "../characters/necromancer/resurrection";
import { writeSeals } from "../characters/scribe/seals";
import { hellsDrag, receiveGrace } from "../characters/seraphiel/seraph";
import { summonSpecters, takePlunder } from "../characters/warden/specters";
import { transmuteCards } from "../characters/alchemist/transmutation";
import { placeVoid, seize } from "../characters/zarek/void";
import type { PlayerId } from "../types";
import { assertCanAct, KEEPS_TURN, pendingAnswer, settle } from "./shared";
import type { CommandHandlers, CommandOf, GameDependencies } from "./types";

type AbilityEffect = (
  draft: Draft,
  playerId: PlayerId,
  choice: CommandOf<"activateAbility">,
  deps: GameDependencies,
) => void;

/** What each activated ability does; reactive ones (the Void's swallowing, Tailwind…) only answer prompts or boost rolls. */
const ABILITY_EFFECTS: Partial<Record<AbilityId, AbilityEffect>> = {
  studySession: (draft, playerId) => {
    for (let draw = 0; draw < STUDY_DRAWS; draw++) drawCard(draft, playerId);
  },
  seraphBlessing: (draft, playerId) => seraphBlessing(draft, playerId),
  hellsDrag: (draft, playerId, { targetId }) => hellsDrag(draft, playerId, targetId),
  cleansingTide: (draft, playerId) => cleansingTide(draft, playerId),
  untamed: (draft, playerId) => unleash(draft, playerId),
  timeWarp: (draft, playerId, { power, targetId }) => timeWarp(draft, playerId, power, targetId),
  plasmaCannon: (draft, playerId) => plasmaCannon(draft, playerId),
  levitation: (draft, playerId) => updatePlayer(draft, playerId, () => ({ levitating: LEVITATION_TURNS })),
  transmutation: (draft, playerId, { cardUids = [] }) => transmuteCards(draft, playerId, cardUids),
  resurrection: (draft, playerId, { cardUids = [] }) => resurrectCards(draft, playerId, cardUids),
  forbiddenSeals: (draft, playerId, { sealTiles = [] }) => writeSeals(draft, playerId, sealTiles),
  spectralApparitions: (draft, playerId, { specterTiles = [] }) => summonSpecters(draft, playerId, specterTiles),
  arrowRain: (draft, playerId, { volley }) => loseArrowRain(draft, playerId, volley),
  cardGamble: (draft, playerId, { targetId, power }, deps) =>
    playCardGamble(draft, playerId, deps.rollDice, targetId, power),
  fairyBloom: (draft, playerId, { frostTiles = [] }) =>
    draft.winter ? freezeTiles(draft, playerId, frostTiles) : bloom(draft, playerId),
  theVoid: (draft, playerId, { seizeTile }) => seize(draft, playerId, seizeTile),
  ocularAwakening: (draft, playerId, { power, flameTiles = [] }) =>
    power === "armour" ? raiseArmour(draft, playerId) : lightFlames(draft, playerId, flameTiles),
};

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
