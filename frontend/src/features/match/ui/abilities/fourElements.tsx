import { useState } from "react";
import {
  bendableElements,
  BREEZE_THRESHOLD,
  WALL_REACH,
  COMBUSTION_PUSH,
  TETHER_TURNS,
  tetherTargets,
  WALL_HP,
} from "@/game/domain/characters/tenzai/elements";
import { ELEMENTS, type Element } from "@/game/domain/characters/tenzai/types";
import { ELEMENT_NAME } from "../hud/effectCopy/tenzai";
import { TargetPicker } from "../hud/TargetPicker";
import { seated } from "./seated";
import type { AbilityContext, AbilityFlow } from "./types";

const ELEMENT_DETAIL: Readonly<Record<Element, string>> = {
  earth: `muralha de ${WALL_HP} de vida numa casa`,
  water: `prende um oponente por ${TETHER_TURNS} rodadas e vai junto`,
  fire: `5 ou 6: dado ×2, explode (${COMBUSTION_PUSH} casas) e rola de novo`,
  wind: `rouba escondido a próxima rolagem de ${BREEZE_THRESHOLD}+`,
};

/** Why an element can't be bent right now (bendableElements left it out). */
function restingReason(element: Element, lastElement: Element | null): string {
  if (element === lastElement) return "foi o último: descansa agora";
  if (element === "water") return "nenhum oponente no mesmo lugar para prender";
  return `nenhuma casa livre até ${WALL_REACH} à frente de alguém`;
}

/** Domínio dos 4 Elementos: the element first (never the last one), then a tile or an opponent if it needs one. */
function ElementPicker({ ctx }: { ctx: AbilityContext }) {
  const [binding, setBinding] = useState(false);
  const { board, view, player } = ctx;
  if (binding) {
    return (
      <TargetPicker
        title="Laço de Correnteza"
        tone="text-sky-300"
        subtitle="Quem a correnteza vai prender?"
        targets={seated(view, tetherTargets(board, view.players, player.id))}
        detail={(target) => <span className="font-mono">{target.position}</span>}
        onPick={(targetId) => ctx.use({ element: "water", targetId })}
        onCancel={ctx.cancel}
      />
    );
  }
  const open = new Set(bendableElements(board, view.players, player, view.elementals));
  const pick = (element: Element) => {
    if (element === "earth") ctx.place("wall");
    else if (element === "water") setBinding(true);
    else ctx.use({ element });
  };
  return (
    <TargetPicker
      title="Domínio dos 4 Elementos"
      tone="text-cyan-200"
      subtitle={
        player.tenzai.lastElement
          ? `Qual elemento? (${ELEMENT_NAME[player.tenzai.lastElement]} foi o último e descansa agora)`
          : "Qual elemento?"
      }
      alternatives={ELEMENTS.map((element) => ({
        label: ELEMENT_NAME[element],
        detail: ELEMENT_DETAIL[element],
        onPick: () => pick(element),
        unavailable: open.has(element) ? undefined : restingReason(element, player.tenzai.lastElement),
      }))}
      onCancel={ctx.cancel}
    />
  );
}

export const fourElements: AbilityFlow = { start: () => "picker", Picker: ElementPicker };
