import { Quaternion, Vector3, type Object3D } from "three";

const scratch = { quaternion: new Quaternion(), scale: new Vector3() };

/**
 * Puts `object` (a child of `parent`) at a pose given in world space: `position`, optionally
 * `quaternion`, and a world-space `size` multiplier. For effects mounted inside a scaled, turned
 * figure (bound to its skeleton) but laid out in world units.
 */
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

/** The rig's bone ending in `name` (the loader drops the "mixamorig:" colon). */
export function findBone(figure: Object3D, name: string): Object3D | null {
  let bone: Object3D | null = null;
  figure.traverse((node) => {
    if (!bone && "isBone" in node && node.name.endsWith(name)) bone = node;
  });
  return bone;
}
