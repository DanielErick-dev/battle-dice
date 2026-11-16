import { voidItemName } from "../voidText";
import type { LogLines } from "./lines";
import { APEX_TURNS } from "@/game/domain/characters/zarek/apex";

/** Zarek's Void. */
export const voidLines: LogLines<
  | "voidSwallowed"
  | "riftOpened"
  | "voidCast"
  | "voidSeized"
  | "voidEchoed"
  | "voidApex"
  | "voidRollTaken"
  | "voidReleased"
> = {
  voidApex: (event, { who, line }) =>
    line(
      event.playerId,
      event.victims.length === 0
        ? `O Ápice do Vazio de ${who(event.playerId)} se abriu, mas todos estavam protegidos`
        : `O Ápice do Vazio de ${who(event.playerId)} engoliu ${event.victims.map(who).join(", ")} por ${APEX_TURNS} rodadas`,
    ),
  voidRollTaken: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.victimId)} tirou ${event.value} de dentro do Vazio: quem andou foi ${who(event.playerId)}`,
    ),
  voidReleased: (event, { who, line }) => line(event.playerId, `${who(event.playerId)} saiu do Vazio`),
  voidSwallowed: (event, { who, line }) =>
    line(event.playerId, `O Vazio de ${who(event.playerId)} engoliu: ${voidItemName(event.item)}`),
  riftOpened: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} abriu uma fenda do Vazio no caminho`),
  voidCast: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} soltou do Vazio: ${voidItemName(event.item)}, na casa ${event.tile}`),
  voidSeized: (event, { who, line }) =>
    line(
      event.playerId,
      `O Vazio de ${who(event.playerId)} absorveu: ${voidItemName(event.item)}, da casa ${event.tile} (virou armadilha roxa)`,
    ),
  voidEchoed: (event, { who, line }) =>
    line(event.playerId, `O Vazio de ${who(event.playerId)} duplicou: ${voidItemName(event.item)}`),
};
