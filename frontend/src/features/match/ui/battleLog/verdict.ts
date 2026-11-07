import { plural, type LogLines } from "./lines";

/** Themis. */
export const verdictLines: LogLines<
  | "verdictPassed"
  | "justiceMarked"
  | "justiceMarched"
  | "justiceMarchEnded"
  | "decreeIssued"
  | "finalJudgment"
> = {
  verdictPassed: (event, { who, line }) =>
    line(
      event.playerId,
      event.defendedId
        ? `⚖ ${who(event.playerId)} tomou para si o ataque de ${who(event.attackerId)} contra ${who(event.defendedId)}: voltou dobrado contra ele`
        : `⚖ ${who(event.playerId)} julgou ${who(event.attackerId)}: o ataque voltou dobrado contra ele`,
    ),
  justiceMarked: (event, { who, line }) => {
    if (event.marks === 0)
      return line(event.by, `⚖ ${who(event.playerId)} escapou do Veredito: as marcas dele se apagaram`);
    return line(
      event.by,
      `⚖ ${who(event.playerId)} recebeu a Marca da Justiça${event.marks > 1 ? ` (${event.marks} marcas)` : ""}`,
    );
  },
  justiceMarched: (event, { who, line }) =>
    line(
      event.playerId,
      `⚖ Justiça Cega: ${who(event.playerId)} anda ${plural(event.own, "casa", "casas")}, os outros ${plural(event.tiles, "casa", "casas")}`,
    ),
  justiceMarchEnded: () => null,
  decreeIssued: (event, { line }) =>
    line(
      event.playerId,
      `⚖ Decreto de Contenção: nas próximas ${event.rolls} rolagens, o dado dos oponentes não passa de ${event.cap}`,
    ),
  finalJudgment: (event, { who, line }) =>
    line(
      event.playerId,
      `⚖ Julgamento Final: ${event.distance} de distância de ${who(event.targetId)}, Dado da Justiça ${event.die} → ${who(event.playerId)} avança ${plural(event.tiles, "casa", "casas")}`,
    ),
};
