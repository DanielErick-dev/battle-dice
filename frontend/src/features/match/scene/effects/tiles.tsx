/** Tile effects anyone can set off: a realm's gate opening and a hidden trap springing. */
import { effectKey } from "../effectKey";
import { HiddenTrapBurst } from "../HiddenTrapBurst";
import { RealmGate } from "../realm/RealmGate";
import type { BoardFx } from "./types";

export function Gate({ fx: { view, layout } }: { fx: BoardFx }) {
  const gate = view.effect?.kind === "realmEnter" ? view.effect : null;
  return (
    gate?.realm && <RealmGate key={`gate${effectKey(gate)}`} realm={gate.realm} position={layout.position(gate.from)} />
  );
}

export function HiddenTrap({ fx: { view, layout } }: { fx: BoardFx }) {
  const effect = view.effect;
  return (
    effect?.kind === "hiddenTrap" && (
      <HiddenTrapBurst key={`hidden${effectKey(effect)}`} position={layout.position(effect.from)} />
    )
  );
}
