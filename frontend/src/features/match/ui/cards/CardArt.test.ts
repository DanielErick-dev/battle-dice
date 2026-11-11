import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CardId } from "@/game/domain/cards/catalog";
import { ART } from "./art";
import { CARD_PALETTE, CardArt, cardImage, DrawnArt } from "./CardArt";

describe("CardArt", () => {
  it.each(Object.keys(CARD_PALETTE) as CardId[])("%s", (cardId) => {
    expect(renderToStaticMarkup(createElement(CardArt, { cardId }))).toMatchSnapshot();
  });
});

describe("cardImage", () => {
  it("shows the painted image until it fails, then falls back to the drawn art", () => {
    expect(cardImage("hotBlood", null)).toBe("/cards/hotBlood.webp");
    expect(cardImage("hotBlood", "/cards/hotBlood.webp")).toBeNull();
    expect(cardImage("hotBlood", "/cards/emberStep.webp")).toBe("/cards/hotBlood.webp");
  });

  it("draws cards without a painted image", () => {
    expect(cardImage("windStep", null)).toBeNull();
  });

  it("has drawn art for every card, so the fallback is never empty", () => {
    for (const cardId of Object.keys(CARD_PALETTE) as CardId[]) {
      expect(ART[cardId], cardId).toBeTruthy();
      expect(renderToStaticMarkup(createElement(DrawnArt, { cardId }))).toContain("<svg");
    }
  });
});
