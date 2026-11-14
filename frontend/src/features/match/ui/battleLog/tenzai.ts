import { cardText } from "../cards/cardText";
import { ELEMENT_NAME } from "../hud/effectCopy/tenzai";
import { plural, type LogLines } from "./lines";

const leftOut = () => null;

/** Tenzai; his armed breeze stays out of the log, it's his secret. */
export const tenzaiLines: LogLines<
  | "elementBent"
  | "elementAttuned"
  | "convergenceAwakened"
  | "wallRaised"
  | "wallStrengthened"
  | "wallHit"
  | "wallCrumbled"
  | "tetherBound"
  | "tetherPulled"
  | "tetherSnapped"
  | "tetherSwapped"
  | "combustionReady"
  | "combustionExploded"
  | "breezeArmed"
  | "breezeStolen"
  | "breezeResisted"
  | "breezeFaded"
> = {
  elementBent: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} dobrou a ${ELEMENT_NAME[event.element]}${event.doubled ? " (dobrada)" : ""}`,
    ),
  elementAttuned: (event, { who, line }) =>
    line(
      event.playerId,
      `${ELEMENT_NAME[event.element]} entrou na órbita de ${who(event.playerId)} (${event.elements.length}/4)`,
    ),
  convergenceAwakened: (event, { who, line }) =>
    line(
      event.playerId,
      `✨ ${who(event.playerId)} entrou na Convergência: intocável por ${plural(event.turns, "rodada", "rodadas")}`,
    ),
  wallRaised: (event, { who, line }) =>
    line(event.playerId, `🪨 ${who(event.playerId)} ergueu uma muralha na casa ${event.tile} (${event.hp} de vida)`),
  wallStrengthened: (event, { line }) =>
    line(event.playerId, `🪨 A muralha da casa ${event.tile} agora aguenta ${event.hp}`),
  wallHit: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} bateu na muralha da casa ${event.tile} (${event.damage} de dano, restam ${event.hp})`,
    ),
  wallCrumbled: (event, { line }) => line(event.owner, `A muralha da casa ${event.tile} caiu`),
  tetherBound: (event, { who, line }) =>
    line(
      event.playerId,
      `💧 ${who(event.playerId)} prendeu ${who(event.targetId)} num Laço de Correnteza por ${plural(event.turns, "rodada", "rodadas")}`,
    ),
  tetherPulled: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} foi puxado ${plural(event.path.length, "casa", "casas")} pela maré`),
  tetherSnapped: (event, { who, line }) => line(event.playerId, `O laço de ${who(event.playerId)} se desfez`),
  tetherSwapped: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} trocou de lugar com ${who(event.targetId)} (${cardText("riptideLash").name})`,
    ),
  combustionReady: (event, { who, line }) =>
    line(event.playerId, `🔥 ${who(event.playerId)} encantou o dado (×${event.multiplier} no 5 ou 6)`),
  combustionExploded: (event, { who, line }) =>
    line(
      event.playerId,
      `💥 O dado de ${who(event.playerId)} explodiu${event.pushed.length ? `: ${event.pushed.map(who).join(", ")} ${event.pushed.length > 1 ? "voltam" : "volta"}` : ""}; rola de novo`,
    ),
  breezeArmed: leftOut,
  breezeFaded: leftOut,
  breezeStolen: (event, { who, line }) =>
    line(
      event.playerId,
      `🌪️ O vento de ${who(event.playerId)} roubou a rolagem de ${event.value} de ${who(event.victimId)}`,
    ),
  breezeResisted: (event, { who, line }) => line(event.playerId, `${who(event.victimId)} estava protegido da brisa`),
};
