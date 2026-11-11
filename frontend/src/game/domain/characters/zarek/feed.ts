import { chargeAbility } from "../../abilities/charge";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import type { GameEvent } from "../../core/events";

/** Every trap fallen into, smashed or pinned this command feeds each Void a charge; its own swallowing doesn't. */
export function feedTheVoid(draft: Draft): void {
  const fed = draft.events.reduce((count, event) => count + trapsIn(event), 0);
  if (fed === 0) return;
  for (const { id, ability } of draft.players) {
    if (ability !== "theVoid") continue;
    let player = playerIn(draft, id);
    let becameReady = false;
    for (let meal = 0; meal < fed; meal++) {
      const charged = chargeAbility(player, { fromBoard: true });
      player = charged.player;
      becameReady ||= charged.becameReady;
    }
    const gained = player.abilityCharge - playerIn(draft, id).abilityCharge;
    if (gained === 0) continue;
    updatePlayer(draft, id, () => ({ abilityCharge: player.abilityCharge }));
    draft.events.push({ type: "voidFed", playerId: id, charge: gained });
    if (becameReady) draft.events.push({ type: "abilityReady", playerId: id, ability: "theVoid" });
  }
}

function trapsIn(event: GameEvent): number {
  switch (event.type) {
    case "trapTriggered":
    case "hiddenTrapSprung":
    case "trapDestroyed":
    case "trapWeeded":
      return 1;
    case "arrowsLoosed":
      return event.pinned.length;
    default:
      return 0;
  }
}
