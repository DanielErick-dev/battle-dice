import { ShaderMaterial } from "three";
import { describe, expect, it } from "vitest";
import { uniform } from "./uniform";

describe("uniform", () => {
  it("returns the named uniform and throws on a missing one", () => {
    const material = new ShaderMaterial({ uniforms: { uTime: { value: 0 } } });
    uniform(material, "uTime").value = 2;
    expect(material.uniforms.uTime?.value).toBe(2);
    expect(() => uniform(material, "uNope")).toThrow();
  });
});
