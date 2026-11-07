import type { ReactNode } from "react";
import type { CardId } from "@/game/domain/cards/catalog";
import { commonArt } from "./common";
import { divineArt } from "./divine";
import { themisArt } from "./themis";
import { akaneArt } from "./akane";
import { zarekArt } from "./zarek";

/** Procedural artwork for each card (inline SVG, 100×70 viewBox): no image files or rights. */
export const ART: Readonly<Record<CardId, ReactNode>> = {
  ...commonArt,
  ...divineArt,
  ...themisArt,
  ...akaneArt,
  ...zarekArt,
};
