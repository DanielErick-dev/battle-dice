import { BufferAttribute, BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import { floatCopy } from "./floatCopy";

/** A quantized column from y -1 to 1, as the built props store it (normalized int16). */
function quantizedColumn(): BufferGeometry {
  const geometry = new BufferGeometry();
  const top = 32767;
  geometry.setAttribute("position", new BufferAttribute(new Int16Array([0, -top, 0, 0, top, 0, top, 0, 0]), 3, true));
  return geometry;
}

describe("floatCopy", () => {
  it("lets a quantized prop be stood on its base without clamping its top", () => {
    const copy = floatCopy(quantizedColumn()).translate(0, 1, 0);
    copy.computeBoundingBox();
    expect(copy.boundingBox?.max.y).toBeCloseTo(2);
  });

  it("leaves the original untouched", () => {
    const original = quantizedColumn();
    floatCopy(original).translate(0, 1, 0);
    expect(original.getAttribute("position").getY(1)).toBeCloseTo(1);
  });
});
