import type { Player } from "@/game/domain/types";

/** A short status shown under the phone's character: what's on them right now. */
export interface StatusChip {
  label: string;
  tone: "good" | "bad" | "info";
}

const turns = (count: number) => (count === 1 ? "1 turno" : `${count} turnos`);

/** What's on a player right now, good first, in a few words each (the board's auras, as text). */
export function statusChips(player: Player): StatusChip[] {
  const chips: StatusChip[] = [];
  if (player.shielded) chips.push({ label: "Escudo Arcano", tone: "good" });
  if (player.spectralArmour > 0) chips.push({ label: `Armadura · ${turns(player.spectralArmour)}`, tone: "good" });
  if (player.divineAegis > 0) chips.push({ label: `Égide · ${turns(player.divineAegis)}`, tone: "good" });
  if (player.untamed > 0) chips.push({ label: `Indomável · ${turns(player.untamed)}`, tone: "good" });
  if (player.levitating > 0) chips.push({ label: `Flutuando · ${turns(player.levitating)}`, tone: "good" });
  if (player.diceBoost !== null || player.diceBonuses.length > 0) chips.push({ label: "Dado turbinado", tone: "good" });
  if (player.crown !== null) chips.push({ label: "Coroa", tone: "good" });
  if (player.skipTurns > 0)
    chips.push({ label: `Perde a vez${player.skipTurns > 1 ? ` ×${player.skipTurns}` : ""}`, tone: "bad" });
  if (player.chained > 0) chips.push({ label: `Acorrentado · ${turns(player.chained)}`, tone: "bad" });
  if (player.silencedTurns > 0) chips.push({ label: "Silenciado", tone: "bad" });
  if (player.burning > 0) chips.push({ label: `Pegando fogo · ${turns(player.burning)}`, tone: "bad" });
  if (player.snowbound)
    chips.push({
      label: `Preso na neve · ${player.snowbound.rounds === 1 ? "1 rodada" : `${player.snowbound.rounds} rodadas`}`,
      tone: "bad",
    });
  if (player.reversedRolls > 0) chips.push({ label: `Tempo invertido ×${player.reversedRolls}`, tone: "bad" });
  if (player.containedRolls > 0) chips.push({ label: `Dado contido ×${player.containedRolls}`, tone: "bad" });
  if (player.justiceMarks > 0) chips.push({ label: `Marcas da Justiça ×${player.justiceMarks}`, tone: "info" });
  if (player.innerFlame > 0) chips.push({ label: `Chama Interna ${player.innerFlame}`, tone: "info" });
  return chips;
}
