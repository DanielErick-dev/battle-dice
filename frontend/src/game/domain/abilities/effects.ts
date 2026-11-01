import { bloom, freezeTiles } from "../characters/fairy/winter";
import { cleansingTide } from "../characters/auric/cleansingTide";
import { hellsDrag } from "../characters/seraphiel/seraph";
import { levitate, studySession } from "./basic";
import { lightFlames, raiseArmour } from "../characters/kage/flames";
import { loseArrowRain } from "../characters/archer/arrowRain";
import { plasmaCannon } from "../characters/alva/plasmaCannon";
import { playCardGamble } from "../characters/jester/cardGamble";
import { resurrectCards } from "../characters/necromancer/resurrection";
import { seize } from "../characters/zarek/void";
import { seraphBlessing } from "../characters/seraphiel/blessing";
import { summonSpecters } from "../characters/warden/specters";
import { timeWarp } from "../characters/cronos/timeWarp";
import { transmuteCards } from "../characters/alchemist/transmutation";
import { unleash } from "../characters/bjorn/untamed";
import { writeSeals } from "../characters/scribe/seals";
import type { AbilityId, PlayerId } from "@/game/domain/types";
import type { CommandOf, GameDependencies } from "../handlers/types";
import type { Draft } from "../core/draft";

export type AbilityEffect = (
  draft: Draft,
  playerId: PlayerId,
  choice: CommandOf<"activateAbility">,
  deps: GameDependencies,
) => void;

/** What each activated ability does; null for those that only boost the turn or answer the board's prompts. */
export const ABILITY_EFFECTS: Readonly<Record<AbilityId, AbilityEffect | null>> = {
  doubleCast: null,
  tailwind: null,
  dormantFury: null,
  silentVerdict: null,
  studySession: (draft, playerId) => studySession(draft, playerId),
  levitation: (draft, playerId) => levitate(draft, playerId),
  seraphBlessing: (draft, playerId) => seraphBlessing(draft, playerId),
  hellsDrag: (draft, playerId, { targetId }) => hellsDrag(draft, playerId, targetId),
  cleansingTide: (draft, playerId) => cleansingTide(draft, playerId),
  untamed: (draft, playerId) => unleash(draft, playerId),
  timeWarp: (draft, playerId, { power, targetId }) => timeWarp(draft, playerId, power, targetId),
  plasmaCannon: (draft, playerId) => plasmaCannon(draft, playerId),
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
