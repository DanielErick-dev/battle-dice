"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useRef, useState } from "react";
import type { Group, Mesh, Vector3 } from "three";
import { isFallen } from "@/game/domain/seraph";
import type { Player } from "@/game/domain/types";
import type { CharacterClip, CharacterDefinition, ClipLengths } from "../characters";
import type { Vec3 } from "./boardLayout";
import { CharacterModel } from "./character/core/CharacterModel";
import { EFFECT_SCALE, FIGURE_HEIGHT, LEVITATE_HEIGHT } from "./character/core/figure";
import { levitationLift, stepLevitation } from "./character/witch/levitation";
import { NameTag } from "./character/shared/NameTag";
import { RestChair } from "./character/accessories/RestChair";
import { TOKEN_EFFECTS } from "./effects";
import type { TokenEffect, TokenFx, TokenSignals } from "./effects/types";
import { advanceMotion, createTokenMotion, easeInOut, followTarget, turnTowards } from "./token/motion";
import { actTraits, createTokenActs, stepPose } from "./token/pose";

interface PlayerTokenProps {
  player: Player;
  character: CharacterDefinition | null;
  /** Ring and placeholder colour. */
  color: string;
  target: Vec3;
  /** Which way the path runs at the target tile: the figure faces it after a leap or a knock-back. */
  pathDirection: Vec3;
  signals: TokenSignals;
  /** Filled every frame with the frost wand's tip (her snow streams from there). */
  wandTip?: Vector3;
  /** "J2 Bruxa" over the head; the seat lifts tags of figures sharing a tile apart. */
  nameTag?: { text: string; seat: number };
  /** Where the one their reaction answers stands (Themis points at whoever her verdict judges). */
  faceToward?: Vec3 | null;
}

/** Name tag height in the effects' units (a figure stands 1.9 tall), raised per seat so shared tiles don't pile up. */
const TAG_HEIGHT = 2;
const TAG_STAGGER = 0.32;
const TURN_RATE = 12;
const HOP_HEIGHT = 0.9;
const LEVITATE_BOB = 0.12;
/** Sent flying without a knocked clip: how far back the figure reels (radians). */
const KNOCKED_TILT = 0.9;
const SINK_DEPTH = FIGURE_HEIGHT * 1.1;

/**
 * A player's figure: follows its target tile by tile (queued as waypoints so a long move reads as
 * one run), picks the clip to play, and mounts the effects in TOKEN_EFFECTS around it.
 */
export function PlayerToken({
  player,
  character,
  color,
  target,
  pathDirection,
  signals,
  wandTip,
  nameTag,
  faceToward = null,
}: PlayerTokenProps) {
  const { isTeleporting, isArriving, isDashing, isFuryAwake, isActive } = signals;
  const isLevitating = player.levitating > 0;
  const traits = actTraits(character);
  const fallen = isFallen(player);
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  /** Rises with the figure when it levitates. */
  const effects = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const motion = useRef(createTokenMotion());
  const acts = useRef(createTokenActs());
  const clip = useRef<CharacterClip>("idle");
  const clipLengths = useRef<ClipLengths>({});
  const [{ canRest, hasShoveClip }, setClipsHad] = useState({ canRest: false, hasShoveClip: false });
  const onClipLengths = useCallback((lengths: ClipLengths) => {
    setClipsHad({ canRest: lengths.rest !== undefined, hasShoveClip: lengths.shove !== undefined });
    clipLengths.current = lengths;
  }, []);
  // Latched as each act starts, so its burst fires once and outlives the signal.
  const [hopBurst, setHopBurst] = useState<number | null>(null);
  const [shoveAt, setShoveAt] = useState<number | null>(null);
  const [landing, setLanding] = useState<number | null>(null);
  /** Facing without the ability spin on top. */
  const yaw = useRef(0);
  // Read by the effects every frame (TokenLive).
  const rise = useRef(0);
  const levitating = useRef(false);
  const seated = useRef(false);
  const bladesOut = useRef(false);
  const crackling = useRef(false);
  const charged = useRef(false);
  const propHeld = useRef(false);
  const wandOut = useRef(false);

  useFrame((state, delta) => {
    levitating.current = isLevitating;
    const node = group.current;
    if (!node) return;

    const way = motion.current;
    followTarget(way, node.position, target, pathDirection, {
      travel: isDashing ? "dash" : isTeleporting ? "teleport" : "walk",
      seated: seated.current,
      arriving: isArriving,
    });
    const travelled = advanceMotion(way, node.position, delta);

    if (ring.current) {
      ring.current.scale.setScalar(isActive ? 1 + Math.sin(state.clock.elapsedTime * 4) * 0.08 : 1);
    }

    const now = state.clock.elapsedTime;
    const pose = stepPose(acts.current, {
      now,
      delta,
      signals,
      levitating: isLevitating,
      traits,
      lengths: clipLengths.current,
      canRest,
      motion: travelled,
      heading: way.heading,
      path: pathDirection,
      position: [node.position.x, node.position.y, node.position.z],
      faceToward,
    });
    way.heading = pose.heading;
    if (pose.landingAt !== null) setLanding(pose.landingAt);
    if (pose.shoveAt !== null) setShoveAt(pose.shoveAt);
    if (pose.hopBurst !== null) setHopBurst(pose.hopBurst);
    clip.current = pose.clip;
    seated.current = pose.seated;
    crackling.current = pose.crackling;
    charged.current = isFuryAwake;
    bladesOut.current = pose.bladesOut;
    propHeld.current = pose.propHeld;
    wandOut.current = pose.wandOut;
    if (body.current) body.current.visible = !pose.hidden && !pose.gone;
    if (ring.current) ring.current.visible = !pose.hidden;
    if (effects.current) effects.current.visible = !pose.hidden;

    rise.current = stepLevitation(rise.current, isLevitating, delta);
    const lift = levitationLift(rise.current);
    const hover = lift * LEVITATE_HEIGHT + Math.sin(now * 1.6) * LEVITATE_BOB * lift;

    if (way.heading !== null) yaw.current = turnTowards(yaw.current, way.heading, delta * TURN_RATE);
    if (body.current) {
      body.current.position.y = Math.sin(Math.PI * pose.spin) * HOP_HEIGHT + hover - pose.sunk * SINK_DEPTH;
      body.current.rotation.y = yaw.current + easeInOut(pose.spin) * Math.PI * 2;
      body.current.position.x = Math.sin(yaw.current) * pose.lunge;
      body.current.position.z = Math.cos(yaw.current) * pose.lunge;
      // Yaw first, then the tilt back.
      body.current.rotation.order = "YXZ";
      body.current.rotation.x = -pose.reel * KNOCKED_TILT;
    }
    if (effects.current) effects.current.position.y = hover;
  });

  const token: TokenFx = {
    ...signals,
    player,
    character,
    color,
    charred: fallen && !character?.fallenModel,
    wandTip,
    live: { rise, levitating, seated, bladesOut, crackling, charged, propHeld, wandOut },
    hopBurst,
    shoveAt,
    landing,
    hasShoveClip,
  };
  const model = character && (fallen && character.fallenModel ? character.fallenModel : character.model);

  return (
    <group ref={group}>
      <group ref={effects} scale={EFFECT_SCALE}>
        {nameTag && (
          <NameTag text={nameTag.text} color={color} active={isActive} y={TAG_HEIGHT + nameTag.seat * TAG_STAGGER} />
        )}
        <TokenEffects effects={TOKEN_EFFECTS.aura} token={token} />
      </group>
      <TokenEffects effects={TOKEN_EFFECTS.ground} token={token} />
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.62, 0.75, 48]} />
        <meshBasicMaterial color={color} transparent opacity={isActive ? 0.9 : 0.35} toneMapped={false} />
      </mesh>

      <group ref={body}>
        <TokenEffects effects={TOKEN_EFFECTS.body} token={token} />
        {model ? (
          <Suspense fallback={<Placeholder color={color} />}>
            <CharacterModel
              url={model}
              height={FIGURE_HEIGHT}
              clip={clip}
              onClipLengths={onClipLengths}
              fallen={token.charred}
            >
              {(figure) =>
                TOKEN_EFFECTS.figure.map((Effect, index) => (
                  <Suspense key={index} fallback={null}>
                    <Effect token={token} figure={figure} />
                  </Suspense>
                ))
              }
            </CharacterModel>
          </Suspense>
        ) : (
          <Placeholder color={color} />
        )}
        {canRest && (
          <Suspense fallback={null}>
            <RestChair
              seated={seated}
              chair={fallen ? character?.fallenChair : character?.chair}
              seat={fallen ? undefined : character?.seat}
            />
          </Suspense>
        )}
      </group>
    </group>
  );
}

/** Each effect waits for its own models apart: one still loading never blanks the figure or the scene. */
function TokenEffects({ effects, token }: { effects: readonly TokenEffect[]; token: TokenFx }) {
  return effects.map((Effect, index) => (
    <Suspense key={index} fallback={null}>
      <Effect token={token} />
    </Suspense>
  ));
}

/** Stand-in figure while a model loads, or for a player without one. */
function Placeholder({ color }: { color: string }) {
  return (
    <mesh position-y={0.55} castShadow>
      <capsuleGeometry args={[0.24, 0.5, 8, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.35} />
    </mesh>
  );
}
