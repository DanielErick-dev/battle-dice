import type { TileEffectKind, TileEffectView } from "../../../model/matchView";
import { boardCopy } from "./board";
import { abilitiesCopy } from "./abilities";
import { zarekCopy } from "./zarek";
import { fairyCopy } from "./fairy";
import { kageCopy } from "./kage";
import { seraphielCopy } from "./seraphiel";
import { themisCopy } from "./themis";
import { akaneCopy } from "./akane";
import { jesterCopy } from "./jester";
import { scribeCopy } from "./scribe";
import { wardenCopy } from "./warden";
import { viniciusCopy } from "./vinicius";
import type { Copy, CopyEntry } from "./types";

const EFFECT_COPY: Readonly<Record<TileEffectKind, CopyEntry>> = {
  ...boardCopy,
  ...abilitiesCopy,
  ...zarekCopy,
  ...fairyCopy,
  ...kageCopy,
  ...seraphielCopy,
  ...themisCopy,
  ...akaneCopy,
  ...jesterCopy,
  ...scribeCopy,
  ...wardenCopy,
  ...viniciusCopy,
};

/** What the banner says for this effect. */
export function effectCopyOf(effect: TileEffectView): Copy {
  const entry = EFFECT_COPY[effect.kind];
  return typeof entry === "function" ? entry(effect) : entry;
}
