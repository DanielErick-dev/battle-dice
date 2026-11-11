import { describe, expect, it } from "vitest";
import { Color } from "three";
import { blendRealm, stepRealmMix, type RealmMix } from "./realmMix";

describe("the realm mix", () => {
  it("eases towards the current realm and away from the other", () => {
    const mix: RealmMix = { infernal: 0, celestial: 1 };
    stepRealmMix(mix, "infernal", 0.16);
    expect(mix.infernal).toBeCloseTo(0.22);
    expect(mix.celestial).toBeCloseTo(0.78);
  });

  it("settles on the night sea when there is no realm", () => {
    const mix: RealmMix = { infernal: 0.5, celestial: 0.5 };
    for (let frame = 0; frame < 600; frame++) stepRealmMix(mix, null, 1 / 60);
    expect(mix.infernal).toBeCloseTo(0, 3);
    expect(mix.celestial).toBeCloseTo(0, 3);
  });

  it("blends the mortal colour into the realms' by their share", () => {
    const [mortal, infernal, celestial] = [new Color(0, 0, 0), new Color(1, 0, 0), new Color(0, 0, 1)];
    const out = blendRealm(new Color(), mortal, infernal, celestial, { infernal: 0.5, celestial: 0 });
    expect(out.r).toBeCloseTo(0.5);
    expect(blendRealm(new Color(), mortal, infernal, celestial, { infernal: 0, celestial: 1 }).b).toBe(1);
  });
});
