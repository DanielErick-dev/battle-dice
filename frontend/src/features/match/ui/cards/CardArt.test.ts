import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CardId } from "@/game/domain/cards/catalog";
import { CARD_PALETTE, CardArt } from "./CardArt";

describe("CardArt", () => {
  it.each(Object.keys(CARD_PALETTE) as CardId[])("%s", (cardId) => {
    expect(renderToStaticMarkup(createElement(CardArt, { cardId }))).toMatchSnapshot();
  });
});
