import { useState } from "react";
import { TIME_ROUNDS } from "@/game/domain/abilities";
import { timeTargets } from "@/game/domain/newcomerAbilities";
import { TargetPicker } from "../hud/TargetPicker";
import { seated } from "./seated";
import type { AbilityContext, AbilityFlow, AbilityScene } from "./types";

// Time Warp reaches the opponents in the same place; armoured ones turn it away.
const bendable = ({ board, view, player }: AbilityScene) => timeTargets(board, view.players, player.id);

/** Engrenagem do Tempo: first the power (halt or reverse), then the opponent. */
function TimeWarpPicker({ ctx }: { ctx: AbilityContext }) {
  const [power, setPower] = useState<"halt" | "reverse" | null>(null);
  if (!power) {
    return (
      <TargetPicker
        title="Engrenagem do Tempo"
        tone="text-amber-500"
        subtitle="O que fazer com o tempo de um oponente?"
        alternatives={[
          { label: "Parar o tempo", detail: `fica ${TIME_ROUNDS} rodadas sem jogar`, onPick: () => setPower("halt") },
          {
            label: "Inverter o tempo",
            detail: `o dado anda para trás por ${TIME_ROUNDS} rodadas`,
            onPick: () => setPower("reverse"),
          },
        ]}
        onCancel={ctx.cancel}
      />
    );
  }
  return (
    <TargetPicker
      title={power === "halt" ? "Parar o tempo" : "Inverter o tempo"}
      tone="text-amber-500"
      subtitle="Escolha o oponente."
      targets={seated(ctx.view, bendable(ctx))}
      detail={(player) => <span className="font-mono">{player.position}</span>}
      onPick={(targetId) => ctx.use({ power, targetId })}
      onCancel={ctx.cancel}
    />
  );
}

export const timeWarp: AbilityFlow = {
  start: (scene) => (bendable(scene).length > 0 ? "picker" : null),
  Picker: TimeWarpPicker,
};
