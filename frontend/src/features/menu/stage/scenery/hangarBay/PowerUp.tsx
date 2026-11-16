"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { SpriteMaterial, type Sprite } from "three";
import { useCanvasTexture, type CanvasLook } from "@/features/shared/three/canvasTexture";
import { FIGURE_HEIGHT } from "../../layout";
import { DARK_LIGHT, POWER_OFF_SECONDS, powerAt } from "./layout";

/** Seconds the ON sign stays up once powered, then fades. */
const ON_SIGN_SECONDS = 2.6;
const SIGN_SIZE = 0.32;

/** A round power sign with its state written under it, red for off and green for on. */
function powerSign(color: string, label: string): CanvasLook {
  return {
    size: 256,
    draw: (context, size) => {
      const centre = size / 2;
      context.strokeStyle = color;
      context.fillStyle = color;
      context.lineCap = "round";
      context.lineWidth = size * 0.06;
      context.shadowColor = color;
      context.shadowBlur = size * 0.06;
      context.beginPath();
      context.arc(centre, size * 0.4, size * 0.22, -Math.PI / 2 + 0.6, (3 * Math.PI) / 2 - 0.6);
      context.stroke();
      context.beginPath();
      context.moveTo(centre, size * 0.12);
      context.lineTo(centre, size * 0.38);
      context.stroke();
      context.font = `900 ${size * 0.18}px sans-serif`;
      context.textAlign = "center";
      context.fillText(label, centre, size * 0.9);
    },
  };
}
const OFF_SIGN = powerSign("#ff4b5c", "OFF");
const ON_SIGN = powerSign("#4ade80", "ON");

/**
 * Unidade Alva switched off and powering up through her intro: the bay's lights down, an OFF sign over her, then
 * a flicker, the lights up and the sign turned ON. `onPower` gets the level (0 off, 1 on) every frame.
 */
export function PowerUp({
  setLights,
  introSeconds,
  onPower,
}: {
  setLights: (level: number) => void;
  introSeconds: () => number | null;
  onPower: (level: number) => void;
}) {
  const offTexture = useCanvasTexture(OFF_SIGN);
  const onTexture = useCanvasTexture(ON_SIGN);
  const materials = useMemo(
    () => ({
      off: new SpriteMaterial({ map: offTexture, transparent: true, depthWrite: false, toneMapped: false }),
      on: new SpriteMaterial({ map: onTexture, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }),
    }),
    [offTexture, onTexture],
  );
  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
      // Back to full light for whoever's stage comes next.
      setLights(1);
    },
    [materials, setLights],
  );
  const offSign = useRef<Sprite>(null);
  const onSign = useRef<Sprite>(null);

  useFrame(() => {
    // Dark until her intro starts, timed from it so the lights come up as she lifts her head.
    const since = introSeconds() ?? 0;
    const level = powerAt(since);
    onPower(level);
    setLights(DARK_LIGHT + (1 - DARK_LIGHT) * level);
    // The OFF sign blinks slowly while she's dark, then gives way to ON, which fades after a moment.
    if (offSign.current) {
      offSign.current.visible = since < POWER_OFF_SECONDS;
      offSign.current.material.opacity = 0.55 + 0.45 * Math.sin(since * 4);
    }
    const onSince = since - POWER_OFF_SECONDS;
    if (onSign.current) {
      onSign.current.material.opacity =
        onSince < 0 ? 0 : Math.max(0, Math.min(1, (ON_SIGN_SECONDS - onSince) / 0.4)) * level;
    }
  });

  return (
    <group>
      <sprite ref={offSign} material={materials.off} position-y={FIGURE_HEIGHT + 0.22} scale={SIGN_SIZE} />
      <sprite ref={onSign} material={materials.on} position-y={FIGURE_HEIGHT + 0.22} scale={SIGN_SIZE} />
    </group>
  );
}
