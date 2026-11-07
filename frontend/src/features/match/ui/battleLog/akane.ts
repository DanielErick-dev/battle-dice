import { plural, type LogLines } from "./lines";

/** Akane. */
export const akaneLines: LogLines<
  | "scarletLit"
  | "playerIgnited"
  | "fireQuenched"
  | "innerFlameKindled"
  | "impetusUnleashed"
  | "emberSlid"
  | "hotBloodBurst"
  | "fuelPoured"
  | "fireFed"
  | "emberStepReady"
  | "supernova"
> = {
  scarletLit: (event, { who, line }) =>
    line(
      event.playerId,
      `🔥 ${who(event.playerId)} incendiou ${plural(event.tiles.length, "casa", "casas")}${event.melted.length ? ` (derreteu ${plural(event.melted.length, "casa", "casas")} de neve/gelo)` : ""}`,
    ),
  playerIgnited: (event, { who, line }) =>
    line(
      event.by,
      `🔥 ${who(event.playerId)} pegou fogo por ${plural(event.rounds, "rodada", "rodadas")}: dado pela metade e sem energia`,
    ),
  fireQuenched: (event, { who, line }) =>
    line(
      event.by,
      `💧 ${event.playerIds.map(who).join(", ")} ${event.playerIds.length > 1 ? "não estão" : "não está"} mais pegando fogo`,
    ),
  innerFlameKindled: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} acendeu uma Chama Interna (${event.flames}/3)`),
  impetusUnleashed: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} liberou o Ímpeto Brilhante por ${plural(event.rolls, "rolagem", "rolagens")}`,
    ),
  emberSlid: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} deslizou pelas chamas (Passo de Brasa)`),
  hotBloodBurst: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} explodiu de Sangue Quente: ${event.targetIds.length ? `${event.targetIds.map(who).join(", ")} voltam ${plural(event.tiles, "casa", "casas")}` : "ninguém por perto"}`,
    ),
  fuelPoured: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} jogou Combustível Puro por ${plural(event.rolls, "rolagem", "rolagens")}`,
    ),
  fireFed: (event, { who, line }) =>
    line(
      event.playerId,
      `🔥 ${who(event.playerId)} queimou mais uma rodada: ${event.energy ? `perdeu ${event.energy} de energia e ` : ""}${who(event.by)} ganhou 1`,
    ),
  emberStepReady: (event, { who, line }) => line(event.playerId, `${who(event.playerId)} preparou o Passo de Brasa`),
  supernova: (event, { who, line }) =>
    line(
      event.playerId,
      `💥 Supernova Escarlate: ${plural(event.fires, "casa", "casas")} em chamas e ${plural(event.burning, "oponente", "oponentes")} queimando → ${who(event.playerId)} avança ${plural(event.tiles, "casa", "casas")}`,
    ),
};
