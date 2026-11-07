import { useCallback, useState } from "react";
import type { CameraFraming } from "../../scene/camera/CameraRig";

/** The viewer's camera: the framing they picked, and whether they dragged it away to look around. */
export function useCameraChoice(activePlayerId: string) {
  const [framing, setFraming] = useState<CameraFraming>("close");
  /**
   * Whose turn it was when the viewer dragged the camera away to look around: it follows nobody
   * until they ask for their character again, pick a framing, or the turn passes.
   */
  const [lookingAroundOn, setLookingAroundOn] = useState<string | null>(null);
  const freeLook = lookingAroundOn !== null && lookingAroundOn === activePlayerId;
  const onFreeLook = useCallback(() => setLookingAroundOn(activePlayerId), [activePlayerId]);
  const follow = () => setLookingAroundOn(null);
  const pickFraming = (option: CameraFraming) => {
    setFraming(option);
    setLookingAroundOn(null);
  };
  return { framing, pickFraming, freeLook, onFreeLook, follow };
}
