import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { FACES, restingRotation } from "./DiceThrow";

describe("3D die faces", () => {
  it("pairs opposite faces so they add up to 7", () => {
    for (let value = 1; value <= 6; value++) {
      const opposite = FACES[7 - value].normal.clone().negate();
      expect(FACES[value].normal.equals(opposite)).toBe(true);
    }
  });

  it.each([1, 2, 3, 4, 5, 6])("rests with %i facing up, whatever the yaw", (value) => {
    for (const yaw of [0, 1.1, 2.7, 4.4]) {
      const up = FACES[value].normal.clone().applyQuaternion(restingRotation(value, yaw));
      expect(up.distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-6);
    }
  });
});
