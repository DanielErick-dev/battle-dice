import type { LogLines } from "./lines";

/** Turns and rolls. */
export const turnLines: LogLines<
  | "diceRolled"
  | "turnChanged"
  | "turnSkipped"
  | "turnTimedOut"
  | "extraTurnGranted"
  | "skipTurnGained"
  | "playerWon"
> = {
  diceRolled: (event, { who, line }) => {
    const parts = event.dice.join(event.best ? " ou " : " + ");
    const bonus = event.bonus ? ` + ${event.bonus}` : "";
    const times = event.multiplier && event.multiplier > 1 ? ` × ${event.multiplier}` : "";
    const halved = event.halved ? " ÷ 2, pegando fogo" : "";
    const detail = event.dice.length > 1 || bonus || times || halved ? ` (${parts}${bonus}${times}${halved})` : "";
    return line(
      event.playerId,
      `${who(event.playerId)} rolou ${event.value}${detail}${event.reversed ? ", de ré" : ""}`,
    );
  },
  turnChanged: (event, { who }) => ({ actor: event.playerId, text: `Vez de ${who(event.playerId)}`, divider: true }),
  turnSkipped: (event, { who, line }) => line(event.playerId, `${who(event.playerId)} perdeu a vez`),
  turnTimedOut: (event, { who, line }) =>
    line(event.playerId, `⌛ ${who(event.playerId)} ficou sem tempo e perdeu a vez`),
  extraTurnGranted: (event, { who, line }) => line(event.playerId, `${who(event.playerId)} ganhou uma jogada extra`),
  skipTurnGained: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} vai perder ${event.turns && event.turns > 1 ? `${event.turns} vezes` : "a próxima vez"}`,
    ),
  playerWon: (event, { who, line }) => line(event.playerId, `🏆 ${who(event.playerId)} venceu a partida!`),
};
