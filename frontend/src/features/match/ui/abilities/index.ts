// Registry of abilities that ask something first; a new one gets its own file and a line here (see README).
import type { AbilityId } from "@/game/domain/abilities/ability";
import { arrowRain } from "./arrowRain";
import { resurrection } from "./cardChoices";
import { cardGamble } from "./cardGamble";
import { fourElements } from "./fourElements";
import { hellsDrag } from "./hellsDrag";
import { ocularAwakening } from "./ocularAwakening";
import { fairyBloom, forbiddenSeals, spectralApparitions, theVoid } from "./placements";
import { timeWarp } from "./timeWarp";
import type { AbilityFlow } from "./types";

export const ABILITY_FLOWS: Partial<Readonly<Record<AbilityId, AbilityFlow>>> = {
  arrowRain,
  cardGamble,
  fairyBloom,
  forbiddenSeals,
  fourElements,
  hellsDrag,
  ocularAwakening,
  resurrection,
  spectralApparitions,
  theVoid,
  timeWarp,
};

export { placementOf } from "./placements";
export type { AbilityContext, AbilityScene, Placement } from "./types";
