import { Quaternion, Vector3, type Object3D } from "three";

const scratch = { quaternion: new Quaternion(), scale: new Vector3() };

/** For effects bound inside a scaled, turned figure but laid out in world units. */
export function placeInWorld(
  object: Object3D,
  parent: Object3D,
  position: Vector3,
  size = 1,
  quaternion?: Quaternion,
): void {
  object.position.copy(parent.worldToLocal(scratch.scale.copy(position)));
  const parentScale = parent.getWorldScale(scratch.scale).x || 1;
  object.scale.setScalar(size / parentScale);
  if (quaternion) {
    parent.getWorldQuaternion(scratch.quaternion).invert();
    object.quaternion.copy(scratch.quaternion).multiply(quaternion);
  }
}
