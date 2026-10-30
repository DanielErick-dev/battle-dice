import type { VoidItem } from "@/game/domain/types";
import { SEAL_TEXT, SPECTER_TEXT } from "./placementText";

/** What a Void item is, for chips and banners ("uma armadilha (volta 4)"). */
export function voidItemName(item: VoidItem): string {
  switch (item.kind) {
    case "trap":
      return `armadilha (volta ${item.back}${item.curse ? `, ${item.curse === "drain" ? "drena" : "descarta"}` : ""})`;
    case "curse":
      return item.curse === "drain" ? "maldição (drena energia)" : "maldição (descarta carta)";
    case "skipTurn":
      return "perde a vez";
    case "flame":
      return "fogo negro";
    case "snow":
      return "neve";
    case "seal":
      return `selo (${SEAL_TEXT[item.seal].name})`;
    case "specter":
      return `aparição (${SPECTER_TEXT[item.specter].name})`;
  }
}

/** A harm opens a rift into the path; a spell lands on a free tile. */
export function isVoidHarm(item: VoidItem): boolean {
  return item.kind === "trap" || item.kind === "curse" || item.kind === "skipTurn";
}
