import { bloom } from "../characters/fairy/bloom";
import { bendElement } from "../characters/tenzai/elements";
import { freezeTiles } from "../characters/fairy/winter";
import { cleansingTide } from "../characters/auric/cleansingTide";
import { hellsDrag } from "../characters/seraphiel/seraph";
import { levitate } from "./basic";
import { fireZone } from "../characters/akane/fire";
import { lightFlames, raiseArmour } from "../characters/kage/flames";
import { loseArrowRain } from "../characters/archer/arrowRain";
import { empPulse } from "../characters/alva/systems";
import { playCardGamble } from "../characters/jester/cardGamble";
import { resurrectCards } from "../characters/necromancer/resurrection";
import { seize } from "../characters/zarek/seize";
import { seraphielBlessing } from "../characters/seraphiel/blessing";
import { summonSpecters } from "../characters/warden/specters";
import { timeWarp } from "../characters/cronos/timeWarp";
import { INVERSION_TURNS, startInversion } from "../characters/alchemist/inversion";
import { unleash } from "../characters/bjorn/untamed";
import { writeSeals } from "../characters/scribe/seals";
import type { AbilityId } from "./ability";
import type { PlayerId } from "../core/state";
import type { CommandOf, GameDependencies } from "../handlers/types";
import type { Draft } from "../core/draft";

type AbilityEffect = (
  draft: Draft,
  playerId: PlayerId,
  choice: CommandOf<"activateAbility">,
  deps: GameDependencies,
) => void;

/** What each activated ability does; null for those that only boost the turn or answer the board's prompts. */
export const ABILITY_EFFECTS: Readonly<Record<AbilityId, AbilityEffect | null>> = {
  doubleCast: null,
  fourElements: (draft, playerId, choice) => bendElement(draft, playerId, choice),
  dormantFury: null,
  silentVerdict: null,
  weeding: null,
  fireZone: (draft, playerId) => fireZone(draft, playerId),
  levitation: (draft, playerId) => levitate(draft, playerId),
  seraphielBlessing: (draft, playerId) => seraphielBlessing(draft, playerId),
  hellsDrag: (draft, playerId, { targetId }) => hellsDrag(draft, playerId, targetId),
  cleansingTide: (draft, playerId) => cleansingTide(draft, playerId),
  untamed: (draft, playerId) => unleash(draft, playerId),
  timeWarp: (draft, playerId, { power, targetId }) => timeWarp(draft, playerId, power, targetId),
  empPulse: (draft, playerId) => empPulse(draft, playerId),
  grandInversion: (draft, playerId) => startInversion(draft, playerId, INVERSION_TURNS),
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
