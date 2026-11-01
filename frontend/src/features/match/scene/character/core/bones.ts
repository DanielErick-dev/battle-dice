import { useMemo } from "react";
import type { Object3D } from "three";

/** The Mixamo bones the effects hold on to (Meshy rigs; `headfront` is its joint at the front of the face). */
export type BoneName =
  | "Hips"
  | "Spine2"
  | "Head"
  | "HeadTop_End"
  | "headfront"
  | "LeftHand"
  | "RightHand"
  | "RightHandMiddle4"
  | "LeftFoot"
  | "RightFoot";

/** The rig's bone ending in `name` (the loader drops the "mixamorig:" colon). */
export function findBone(figure: Object3D, name: BoneName): Object3D | null {
  let bone: Object3D | null = null;
  figure.traverse((node) => {
    if (!bone && "isBone" in node && node.name.endsWith(name)) bone = node;
  });
  return bone;
}

/** `findBone`, looked up again only when the figure changes. */
export function useBone(figure: Object3D, name: BoneName): Object3D | null {
  return useMemo(() => findBone(figure, name), [figure, name]);
}
