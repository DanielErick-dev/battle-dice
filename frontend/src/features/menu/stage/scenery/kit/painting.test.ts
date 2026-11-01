import { describe, expect, it } from "vitest";
import { shade } from "./painting";

describe("shade", () => {
  it("scales each channel", () => {
    expect(shade("#804020", 0.5)).toBe("rgb(64,32,16)");
  });

  it("clamps lightened channels at 255", () => {
    expect(shade("#c08040", 2)).toBe("rgb(255,255,128)");
  });
});
