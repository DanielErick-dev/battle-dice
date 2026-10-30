"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, SpriteMaterial, SRGBColorSpace } from "three";

/** The tag's height as a share of the screen's; it keeps that size however far the camera is. */
const SCREEN_HEIGHT = 0.012;
const CANVAS_HEIGHT = 48;

/**
 * A short tag over something on the board (a player's name, a seal's or an apparition's): a dark
 * pill edged in `color`, always drawn on top and the same size on screen at any distance. Dimmer
 * when not `active` (not the player whose turn it is).
 */
export function NameTag({
  text,
  color,
  active = true,
  y,
  size = 1,
}: {
  text: string;
  color: string;
  active?: boolean;
  y: number;
  /** Multiplies the tag's size, to make up for a parent's scale (the token's effects are scaled up). */
  size?: number;
}) {
  const { texture, aspect } = useMemo(() => drawTag(text, color), [text, color]);
  const material = useMemo(
    () =>
      new SpriteMaterial({
        map: texture,
        opacity: active ? 1 : 0.7,
        sizeAttenuation: false,
        depthTest: false,
        transparent: true,
      }),
    [texture, active],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <sprite
      material={material}
      position-y={y}
      scale={[SCREEN_HEIGHT * size * aspect, SCREEN_HEIGHT * size, 1]}
      center-y={0}
      renderOrder={20}
    />
  );
}

function drawTag(text: string, color: string) {
  const font = `900 ${Math.round(CANVAS_HEIGHT * 0.46)}px system-ui, sans-serif`;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;
  const label = text.toUpperCase();
  const width = Math.ceil(measure.measureText(label).width + CANVAS_HEIGHT * 0.9);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext("2d")!;
  const radius = CANVAS_HEIGHT / 2 - 2;
  context.beginPath();
  context.roundRect(2, 2, width - 4, CANVAS_HEIGHT - 4, radius);
  context.fillStyle = "rgba(0,0,0,0.7)";
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = color;
  context.stroke();
  context.font = font;
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, width / 2, CANVAS_HEIGHT / 2 + 1);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return { texture, aspect: width / CANVAS_HEIGHT };
}
