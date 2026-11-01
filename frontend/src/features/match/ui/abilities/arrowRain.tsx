import { ARROW_RAIN_PINS, ARROW_RAIN_PUSH } from "@/game/domain/characters/archer/arrowRain";
import { opponentsInReach } from "@/game/domain/board/reach";
import { TargetPicker } from "../hud/TargetPicker";
import type { AbilityFlow, AbilityScene } from "./types";

const reachable = ({ board, view, player }: AbilityScene) => opponentsInReach(board, view.players, player.id);

/** Chuva de Flechas: with opponents in reach, strike them or pin the traps ahead; otherwise it pins the traps. */
export const arrowRain: AbilityFlow = {
  start: (scene) => (reachable(scene).length > 0 ? "picker" : null),
  Picker: ({ ctx }) => {
    const count = reachable(ctx).length;
    return (
      <TargetPicker
        title="Chuva de Flechas"
        tone="text-lime-300"
        subtitle={`Prenda as próximas ${ARROW_RAIN_PINS} armadilhas à frente ou faça todos os oponentes voltarem ${ARROW_RAIN_PUSH} casas.`}
        alternatives={[
          {
            label: "Atacar os oponentes",
            detail: `${count === 1 ? "1 volta" : `${count} voltam`} ${ARROW_RAIN_PUSH} casas`,
            onPick: () => ctx.use({ volley: "opponents" }),
          },
          {
            label: "Prender armadilhas",
            detail: `${ARROW_RAIN_PINS} à frente`,
            onPick: () => ctx.use(),
          },
        ]}
        onCancel={ctx.cancel}
      />
    );
  },
};
