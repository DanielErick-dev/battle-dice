"use client";

import { RoundedBox, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, SRGBColorSpace, type Group } from "three";
import type { CardId } from "@/game/domain/cards";
import { CARD_PALETTE } from "../ui/cards/CardArt";
import { CARD_TEXT } from "../ui/cards/cardText";
import { TILE_HEIGHT } from "./boardLayout";

const CARD_WIDTH = 0.78;
const CARD_DEPTH = 1.08;

/**
 * One of heaven's divine cards lying on its tile, face up: a gold-framed card with its colours, a
 * star and its name, breathing a little over the floor in a glow of light. Whoever stops here
 * takes that very card.
 */
export function RelicCard({ cardId }: { cardId: CardId }) {
  const card = useRef<Group>(null);
  const face = useRelicFace(cardId);

  useFrame(({ clock }) => {
    if (!card.current) return;
    card.current.position.y = TILE_HEIGHT / 2 + 0.1 + Math.sin(clock.elapsedTime * 1.8) * 0.03;
  });

  return (
    <group>
      <group ref={card} rotation-y={0.35}>
        <RoundedBox args={[CARD_WIDTH, 0.03, CARD_DEPTH]} radius={0.012} smoothness={2} castShadow>
          <meshStandardMaterial
            color="#facc15"
            metalness={0.7}
            roughness={0.3}
            emissive="#a16207"
            emissiveIntensity={0.5}
          />
        </RoundedBox>
        <mesh rotation-x={-Math.PI / 2} position-y={0.017}>
          <planeGeometry args={[CARD_WIDTH * 0.94, CARD_DEPTH * 0.95]} />
          <meshBasicMaterial map={face} toneMapped={false} />
        </mesh>
      </group>
      <Sparkles count={14} scale={[1.2, 0.8, 1.2]} position-y={0.5} size={2.5} speed={0.4} color="#fef9c3" />
    </group>
  );
}

/** The relic's face: its art colours, a radiant star and its name across the bottom. */
function useRelicFace(cardId: CardId): CanvasTexture {
  const texture = useMemo(() => {
    const [width, height] = [256, 352];
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d")!;
    const { from, to } = CARD_PALETTE[cardId];
    const background = context.createRadialGradient(
      width / 2,
      height * 0.38,
      10,
      width / 2,
      height * 0.38,
      height * 0.7,
    );
    background.addColorStop(0, from);
    background.addColorStop(1, to);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    // A star of light in the middle, rays round it.
    const [cx, cy] = [width / 2, height * 0.4];
    context.strokeStyle = "rgba(255,255,255,0.75)";
    context.lineWidth = 5;
    context.lineCap = "round";
    for (let ray = 0; ray < 12; ray++) {
      const angle = (ray / 12) * Math.PI * 2;
      context.beginPath();
      context.moveTo(cx + Math.cos(angle) * 46, cy + Math.sin(angle) * 46);
      context.lineTo(cx + Math.cos(angle) * 84, cy + Math.sin(angle) * 84);
      context.stroke();
    }
    context.fillStyle = "#fffbeb";
    context.beginPath();
    for (let point = 0; point < 10; point++) {
      const angle = -Math.PI / 2 + (point * Math.PI) / 5;
      const radius = point % 2 === 0 ? 40 : 17;
      context.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    }
    context.closePath();
    context.fill();

    context.fillStyle = "rgba(0,0,0,0.45)";
    context.fillRect(0, height - 92, width, 92);
    context.fillStyle = "#ffffff";
    context.font = "900 30px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(CARD_TEXT[cardId].name.toUpperCase(), width / 2, height - 56, width - 24);
    context.fillStyle = "#fde68a";
    context.font = "800 18px system-ui, sans-serif";
    context.fillText("DIVINA", width / 2, height - 22);

    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [cardId]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
