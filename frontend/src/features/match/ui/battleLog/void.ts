import { voidItemName } from "../voidText";
import type { LogLines } from "./lines";

/** Zarek's Void. */
export const voidLines: LogLines<"voidSwallowed" | "riftOpened" | "voidCast" | "voidSeized" | "voidEchoed"> = {
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
