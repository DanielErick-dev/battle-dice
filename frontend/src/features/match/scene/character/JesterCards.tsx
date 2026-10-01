"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type Object3D,
} from "three";
import type { IntroCardBeats } from "../../characters";
import { useAge } from "../useAge";

const CARD_COUNT = 9;
/** Playing card proportions, as a share of the figure's height. */
const CARD_HEIGHT = 0.13;
const CARD_WIDTH = CARD_HEIGHT * 0.68;
/** The ring around the figure: radius and height, as shares of the figure's height. */
const RING_RADIUS = 0.42;
const RING_HEIGHT = 0.55;
/** Seconds between two cards appearing, and for each to snap in. */
const APPEAR_STAGGER = 0.09;
const APPEAR_SECONDS = 0.25;
/** Turns per second of the ring: calm at first, a whirl through the pirouette. */
const CALM_SPIN = 0.18;
const WHIRL_SPIN = 1.4;
/** How long the whirl takes to build up, and how high the spiral climbs by the reveal. */
const WHIRL_RAMP = 0.35;
const SPIRAL_CLIMB = 0.25;
/** The cards flying into the hand, and the flash as they meet. */
const GATHER_SECONDS = 0.35;
const FLASH_SECONDS = 0.6;
/**
 * The kept card: past the fingertips (the hand bone sits at the wrist), along the forearm's line,
 * and drawn a little towards the camera so the fingers never cut through it; bigger than the
 * others, and how fast it fades once put away. Distances are shares of the figure's height.
 */
const HELD_REACH = 0.1;
const HELD_LIFT = 0.03;
const HELD_TOWARDS_CAMERA = 0.06;
const HELD_SCALE = 1.35;
const HELD_FADE = 3;

/** Working vectors for the frame loop (frames run one at a time, so instances can share them). */
const scratch = { hand: new Vector3(), centre: new Vector3(), point: new Vector3(), world: new Vector3() };

const SUITS = [
  { symbol: "♥", color: "#c8102e" },
  { symbol: "♠", color: "#1b1b24" },
  { symbol: "♦", color: "#c8102e" },
  { symbol: "♣", color: "#1b1b24" },
] as const;

/**
 * The Jester's intro, like the cards sewn on her costume come alive: a ring of playing cards
 * appears around her, whirls up in a spiral through her pirouette and, as she strikes her pose,
 * gathers into whichever hand she holds up. One card stays there, an ace she looks at, until the
 * intro is over (`active` false). Everything is placed in world space from her bones, so it
 * follows the figure wherever it stands. Mounted fresh with every intro.
 */
export function JesterCards({
  figure,
  size,
  color,
  beats,
  active,
}: {
  figure: Object3D;
  size: number;
  color: string;
  beats: IntroCardBeats;
  active: RefObject<boolean>;
}) {
  const root = useRef<Group>(null);
  const cards = useRef<(Mesh | null)[]>([]);
  const held = useRef<Group>(null);
  const heldMaterial = useRef<MeshBasicMaterial>(null);
  const heldGlow = useRef<MeshBasicMaterial>(null);
  const flash = useRef<Mesh>(null);
  const flashMaterial = useRef<MeshBasicMaterial>(null);
  const textures = useCardTextures();
  const glow = useMemo(() => new Color(color).multiplyScalar(2.2), [color]);
  const hands = useMemo(() => [findBone(figure, "RightHand"), findBone(figure, "LeftHand")], [figure]);
  const hips = useMemo(() => findBone(figure, "Hips"), [figure]);
  const age = useAge();
  /** The hand held up at the reveal, picked once then; the kept card's opacity. */
  const raised = useRef<Object3D | null>(null);
  const heldOpacity = useRef(0);

  useFrame(({ clock, camera }, delta) => {
    const group = root.current;
    if (!group) return;
    const t = age(clock.elapsedTime);
    const scale = group.getWorldScale(scratch.point).x || 1;
    const unit = size / scale;

    // The ring turns around her hips, on the floor she stands on.
    group.getWorldPosition(scratch.centre);
    if (hips) {
      const floorY = scratch.centre.y;
      hips.getWorldPosition(scratch.centre);
      scratch.centre.y = floorY;
    }

    if (t >= beats.revealSeconds && !raised.current) {
      raised.current = higherOf(hands, scratch.point) ?? hands[0];
    }
    const hand = raised.current ?? higherOf(hands, scratch.point);
    if (hand) hand.getWorldPosition(scratch.hand);

    const whirl = Math.min(1, Math.max(0, (t - beats.spinSeconds) / WHIRL_RAMP));
    const climb = Math.min(1, Math.max(0, (t - beats.spinSeconds) / (beats.revealSeconds - beats.spinSeconds)));
    const gather = Math.min(1, Math.max(0, (t - beats.revealSeconds) / GATHER_SECONDS));

    cards.current.forEach((card, index) => {
      if (!card) return;
      const appear = Math.min(1, Math.max(0, (t - index * APPEAR_STAGGER) / APPEAR_SECONDS));
      card.visible = appear > 0 && gather < 1;
      if (!card.visible) return;

      // Calm turns first, then the whirl: the angle is the integral of the spin speed.
      const calm = CALM_SPIN * t;
      const whirled = WHIRL_SPIN * Math.max(0, t - beats.spinSeconds - WHIRL_RAMP / 2) * whirl;
      const angle = (index / CARD_COUNT) * Math.PI * 2 + (calm + whirled) * Math.PI * 2;
      const radius = size * RING_RADIUS * (1 - 0.25 * climb);
      const bob = Math.sin(t * 2.4 + index) * 0.03 * size;
      const height = size * (RING_HEIGHT + SPIRAL_CLIMB * climb) + bob + (index % 3) * 0.04 * size * climb;
      const world = scratch.world.set(
        scratch.centre.x + Math.cos(angle) * radius,
        scratch.centre.y + height,
        scratch.centre.z + Math.sin(angle) * radius,
      );
      // Gathering: each card flies from the ring into the raised hand, shrinking as it goes.
      if (gather > 0) world.lerp(scratch.hand, gather * gather);
      // Faces outwards, away from her, with a flutter.
      scratch.point.set(2 * world.x - scratch.centre.x, world.y, 2 * world.z - scratch.centre.z);
      card.position.copy(group.worldToLocal(world));
      card.lookAt(scratch.point);
      card.rotateY(Math.sin(t * 3 + index) * 0.35);
      card.scale.setScalar(unit * easeOutBack(appear) * (1 - gather * 0.8));
    });

    // The flash where the cards meet, then the kept card, held until the intro is over.
    const sinceGather = t - beats.revealSeconds - GATHER_SECONDS;
    if (flash.current && flashMaterial.current) {
      const f = Math.min(1, Math.max(0, sinceGather / FLASH_SECONDS));
      flash.current.visible = sinceGather >= 0 && f < 1;
      flash.current.position.copy(group.worldToLocal(scratch.point.copy(scratch.hand)));
      flash.current.scale.setScalar(unit * (0.03 + f * 0.12));
      flash.current.quaternion.copy(camera.quaternion);
      flashMaterial.current.opacity = 0.9 * (1 - f);
    }
    const holding = sinceGather >= 0 && active.current;
    heldOpacity.current += ((holding ? 1 : 0) - heldOpacity.current) * Math.min(1, delta * HELD_FADE * 3);
    if (held.current) {
      held.current.visible = heldOpacity.current > 0.01;
      const spot = heldSpot(raised.current, size, camera.position);
      held.current.position.copy(group.worldToLocal(spot));
      held.current.scale.setScalar(unit * HELD_SCALE * (0.6 + 0.4 * heldOpacity.current));
      // Faces the camera, turning slowly, so the ace reads as she looks at it.
      held.current.quaternion.copy(camera.quaternion);
      held.current.rotateY(Math.sin(t * 1.3) * 0.5);
      held.current.rotateZ(0.15);
    }
    if (heldMaterial.current) heldMaterial.current.opacity = heldOpacity.current;
    if (heldGlow.current) heldGlow.current.opacity = heldOpacity.current * (0.55 + 0.25 * Math.sin(t * 4));
  });

  return (
    <group ref={root}>
      {Array.from({ length: CARD_COUNT }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            cards.current[index] = mesh;
          }}
          visible={false}
        >
          <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
          <meshBasicMaterial map={textures[index % textures.length]} side={DoubleSide} transparent />
        </mesh>
      ))}
      <mesh ref={flash} visible={false}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial
          ref={flashMaterial}
          color={glow}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <group ref={held} visible={false}>
        {/* A glow of her colour behind the ace, so it stands out against her. */}
        <mesh position-z={-0.002}>
          <planeGeometry args={[CARD_WIDTH * 1.5, CARD_HEIGHT * 1.35]} />
          <meshBasicMaterial
            ref={heldGlow}
            color={glow}
            transparent
            opacity={0}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh>
          <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
          <meshBasicMaterial ref={heldMaterial} map={textures[0]} side={DoubleSide} transparent opacity={0} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Where the kept card floats: from the wrist on along the forearm, past the fingertips, a little
 * up and towards the camera. Writes into `scratch.world` (the hand is in `scratch.hand`).
 */
function heldSpot(hand: Object3D | null, size: number, cameraPosition: Vector3): Vector3 {
  const spot = scratch.world.copy(scratch.hand);
  const elbow = hand?.parent;
  if (elbow) {
    elbow.getWorldPosition(scratch.point);
    spot.addScaledVector(scratch.point.subVectors(scratch.hand, scratch.point).normalize(), HELD_REACH * size);
  }
  spot.y += HELD_LIFT * size;
  const towards = scratch.point.subVectors(cameraPosition, spot).normalize();
  return spot.addScaledVector(towards, HELD_TOWARDS_CAMERA * size);
}

/** The hand that's higher in the world right now. */
function higherOf(hands: readonly (Object3D | null)[], scratch: Vector3): Object3D | null {
  let best: Object3D | null = null;
  let bestY = -Infinity;
  for (const hand of hands) {
    if (!hand) continue;
    const y = hand.getWorldPosition(scratch).y;
    if (y > bestY) {
      best = hand;
      bestY = y;
    }
  }
  return best;
}

/** Overshoots a little before settling: cards snap into being. */
function easeOutBack(x: number): number {
  const c = 1.70158;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
}

/** Aces of the four suits, drawn like the cards on her costume: white, a red rim, a big pip. */
function useCardTextures(): CanvasTexture[] {
  const textures = useMemo(
    () =>
      SUITS.map(({ symbol, color }) => {
        const canvas = document.createElement("canvas");
        canvas.width = 136;
        canvas.height = 200;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#f6f1e7";
        roundedRect(context, 2, 2, 132, 196, 14);
        context.fill();
        context.lineWidth = 5;
        context.strokeStyle = "#a3122a";
        roundedRect(context, 8, 8, 120, 184, 10);
        context.stroke();
        context.fillStyle = color;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = "bold 30px serif";
        context.fillText("A", 26, 30);
        context.fillText(symbol, 26, 58);
        context.font = "bold 84px serif";
        context.fillText(symbol, 68, 104);
        const texture = new CanvasTexture(canvas);
        texture.colorSpace = SRGBColorSpace;
        return texture;
      }),
    [],
  );
  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);
  return textures;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  context.beginPath();
  context.roundRect(x, y, w, h, r);
}

/** The rig's bone ending in `name` (the loader drops the "mixamorig:" colon). */
function findBone(figure: Object3D, name: string): Object3D | null {
  let bone: Object3D | null = null;
  figure.traverse((node) => {
    if (!bone && "isBone" in node && node.name.endsWith(name)) bone = node;
  });
  return bone;
}
