import { cardText } from "../cards/cardText";
import { plural, type LogLines } from "./lines";

/** Unidade Alva; the Brownout's halving names the numbers, since the HUD can't. */
export const alvaLines: LogLines<
  | "empPulsed"
  | "memoryOverload"
  | "corruptedInjected"
  | "corruptedPurged"
  | "brownoutSapped"
  | "firewallLocked"
  | "dataCollapsed"
  | "alvaThrust"
  | "apocalypseProtocol"
> = {
  empPulsed: (event, { who, line }) =>
    line(
      event.playerId,
      `⚡ ${who(event.playerId)} disparou o PEM: ${plural(event.victims.length, "oponente ficou", "oponentes ficaram")} sem cartas e sem habilidade`,
    ),
  memoryOverload: (event, { who, line }) =>
    line(
      event.playerId,
      event.burnt.length === 0
        ? `⚡ A Sobrecarga de Memória de ${who(event.playerId)} explodiu, mas ninguém tinha mais de 5 cartas`
        : `⚡ Sobrecarga de Memória: ${event.burnt.map((entry) => `${who(entry.playerId)} perdeu ${plural(entry.cards.length, "carta", "cartas")}`).join(", ")}`,
    ),
  corruptedInjected: (event, { who, line }) =>
    line(
      event.playerId,
      `⚡ ${who(event.playerId)} injetou ${plural(event.count, "Carta Corrompida", "Cartas Corrompidas")} na mão de ${who(event.targetId)}`,
    ),
  corruptedPurged: (event, { who, line }) =>
    line(
      event.playerId,
      `⚡ ${who(event.playerId)} apagou uma Carta Corrompida sacrificando ${cardText(event.card.cardId, event.card.fused).name}`,
    ),
  brownoutSapped: (event, { who, line }) =>
    line(event.playerId, `⚡ Subtensão: o movimento de ${who(event.playerId)} caiu de ${event.from} para ${event.to}`),
  firewallLocked: (event, { who, line }) =>
    line(
      event.playerId,
      `⚡ ${who(event.targetId)} ficou travado pelo Firewall: sem cartas por ${plural(event.turns, "rodada", "rodadas")}`,
    ),
  dataCollapsed: (event, { who, line }) =>
    line(
      event.playerId,
      `⚡ Colapso de Dados: as ${event.weight} cartas de ${who(event.targetId)} viraram peso e o arremessaram para trás`,
    ),
  alvaThrust: (event, { who, line }) =>
    line(event.playerId, `⚡ ${who(event.playerId)} voou ${plural(event.tiles, "casa", "casas")} com os propulsores`),
  apocalypseProtocol: (event, { who, line }) =>
    line(event.playerId, `⚡ ${who(event.playerId)} iniciou o Protocolo Apocalipse`),
};
