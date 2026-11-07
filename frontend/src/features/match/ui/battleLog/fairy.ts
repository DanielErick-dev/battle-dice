import { plural, type LogLines } from "./lines";

/** The Crystal Fairy. */
export const fairyLines: LogLines<
  "snowDrained" | "tilesEnchanted" | "enchantmentStirred" | "winterBegan" | "tilesFrozen"
> = {
  snowDrained: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} ficou preso na neve: ${event.energy} de energia foi para ${who(event.owner)}`,
    ),
  tilesEnchanted: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} cobriu ${plural(event.tiles.length, "casa", "casas")} de neve`),
  enchantmentStirred: (event, { who, line }) =>
    line(
      event.playerId,
      event.owner === event.playerId
        ? `${who(event.playerId)} deslizou pela própria neve`
        : `${who(event.playerId)} ficou preso na neve de ${who(event.owner)} por ${plural(event.frozen, "rodada", "rodadas")}`,
    ),
  winterBegan: (event, { who, line }) => line(event.playerId, `${who(event.playerId)} trouxe o Inverno Eterno`),
  tilesFrozen: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} congelou ${plural(event.tiles.length, "casa", "casas")}`),
};
