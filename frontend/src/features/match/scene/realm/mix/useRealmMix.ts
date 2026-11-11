import { createContext, useContext, type RefObject } from "react";
import type { RealmMix } from "./realmMix";

export const RealmMixContext = createContext<RefObject<RealmMix> | null>(null);

/** The live realm mix, read in `useFrame` (it changes without re-rendering). */
export function useRealmMix(): RefObject<RealmMix> {
  const mix = useContext(RealmMixContext);
  if (!mix) throw new Error("useRealmMix needs a <RealmAtmosphere> above it");
  return mix;
}
