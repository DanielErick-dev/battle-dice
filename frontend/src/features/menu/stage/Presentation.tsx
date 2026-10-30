"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Vector3, type Group } from "three";
import {
  CHARACTERS,
  type CharacterClip,
  type CharacterDefinition,
  type CharacterId,
  type ClipLengths,
} from "@/features/match/characters";
import { CharacterModel } from "@/features/match/scene/character/CharacterModel";
import { HeldVial, PourStream, SmokeCloud } from "@/features/match/scene/character/AlchemyVial";
import { Wings } from "@/features/match/scene/character/Wings";
import { HeadCrown } from "@/features/match/scene/character/HeadCrown";
import { FrostWand } from "@/features/match/scene/character/FrostWand";
import { JusticeScale } from "@/features/match/scene/character/JusticeScale";
import { EnergyBlades } from "@/features/match/scene/character/EnergyBlades";
import { ArcherIntro } from "@/features/match/scene/character/ArcherIntro";
import { BoneRise } from "@/features/match/scene/character/BoneRise";
import { FrostSlam } from "@/features/match/scene/character/FrostSlam";
import { DESCENT_SECONDS, HeavenDescent, descentHeight } from "@/features/match/scene/character/HeavenDescent";
import { ScribeIntro } from "@/features/match/scene/character/ScribeIntro";
import { JesterCards } from "@/features/match/scene/character/JesterCards";
import { LimbLightning } from "@/features/match/scene/character/LimbLightning";
import {
  LevitationAura,
  LevitationBurst,
  levitationLift,
  stepLevitation,
} from "@/features/match/scene/character/Levitation";
import { WitchStaff } from "@/features/match/scene/character/WitchStaff";
import { useAge } from "@/features/match/scene/useAge";
import type { StageSounds } from "../audio/stageSounds";
import { FIGURE_HEIGHT, FLOOR_Y } from "./layout";
import { GUSTS, gustAt, wingStroke } from "./seraphEntrance";
import { WindGusts, type WingTips } from "./WindGusts";

/** The intro's last pose is held this long before the showcase. */
const INTRO_HOLD_MS = 700;
/** A levitating character's hover over the pedestal (on top of its float clip's own lift) and bob. */
const HOVER_HEIGHT = 0.36;
const HOVER_BOB = 0.035;
/** Without an intro, a levitating character stands a moment before rising, so the lift reads. */
const RISE_DELAY_MS = 600;
// Intro pour (CharacterDefinition.introPourSeconds): tip, pour, and the drops' fall to the floor.
const POUR_TIP_MS = 300;
const POUR_MS = 1000;
const POUR_DROP_MS = 550;
const TIP_RATE = 7;

/** The figure's intro once (when it has one), then its showcase loop; a levitating one rises off the pedestal. */
export function Presentation({
  characterId,
  sounds,
  gustRef,
}: {
  characterId: CharacterId;
  sounds: StageSounds;
  /** Set every frame to how hard the entrance's wind blows (see seraphEntrance). */
  gustRef: RefObject<number>;
}) {
  const character: CharacterDefinition = CHARACTERS[characterId];
  const frost = character.introFrost;
  const showcase: CharacterClip = character.levitates ? "float" : "showcase";
  const pourSeconds = character.introPourSeconds;
  const clip = useRef<CharacterClip>("intro");
  const hovering = useRef(false);
  const hover = useRef<Group>(null);
  /** 0 on the pedestal, 1 hovering at HOVER_HEIGHT. */
  const rise = useRef(0);
  const [burst, setBurst] = useState<number | null>(null);
  const tilt = useRef(0);
  const tipped = useRef(false);
  const pouring = useRef(false);
  const mouth = useRef(new Vector3());
  const [smoke, setSmoke] = useState<number | null>(null);
  const descent = useRef<Group>(null);
  const age = useAge();
  // A winged descent ends in mighty wingbeats whose swing is driven from here (see seraphEntrance).
  const entrance = character.descends === true && character.wings !== undefined;
  const stroke = useRef<number | null>(null);
  /** Kept up to date by the wings: what the downstrokes shake off flies from there. */
  const [tips] = useState<WingTips>(() => ({ left: new Vector3(), right: new Vector3() }));
  useEffect(() => {
    if (!character.descends) return;
    sounds.heavenDescent();
    const landing = window.setTimeout(sounds.heavenLanding, DESCENT_SECONDS * 1000);
    const beats = entrance
      ? GUSTS.map(({ at, strength }) => window.setTimeout(() => sounds.wingBeat(strength), (at - 0.1) * 1000))
      : [];
    return () => [landing, ...beats].forEach((timer) => window.clearTimeout(timer));
  }, [character.descends, entrance, sounds]);
  useEffect(
    () => () => {
      gustRef.current = 0;
    },
    [gustRef],
  );
  useFrame((state, delta) => {
    const since = age(state.clock.elapsedTime);
    if (character.descends && descent.current) descent.current.position.y = descentHeight(since) * FIGURE_HEIGHT;
    if (entrance) {
      stroke.current = wingStroke(since);
      gustRef.current = gustAt(since);
    }
    tilt.current += ((tipped.current ? 1 : 0) - tilt.current) * (1 - Math.exp(-TIP_RATE * delta));
    if (!hover.current) return;
    rise.current = stepLevitation(rise.current, hovering.current, delta);
    const lift = levitationLift(rise.current);
    hover.current.position.y = lift * HOVER_HEIGHT + Math.sin(state.clock.elapsedTime * 1.6) * HOVER_BOB * lift;
  });
  const inIntro = useRef(false);
  /** A hand prop is out through the intro and the showcase, not the plain idle. */
  const propOut = useRef(false);
  const timers = useRef<number[]>([]);
  const onClipLengths = useCallback(
    (lengths: ClipLengths) => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      // Without an intro, straight to the showcase (a levitating one after a beat, to rise).
      const introMs = (lengths.intro ?? 0) * 1000;
      const floats = showcase === "float";
      inIntro.current = introMs > 0;
      propOut.current = introMs > 0;
      timers.current = [
        window.setTimeout(() => {
          inIntro.current = false;
          propOut.current = lengths.showcase !== undefined;
        }, introMs),
        window.setTimeout(
          () => {
            clip.current = showcase;
            hovering.current = floats;
            if (floats) setBurst(performance.now());
          },
          introMs > 0 ? introMs + INTRO_HOLD_MS : floats ? RISE_DELAY_MS : 0,
        ),
      ];
      if (introMs > 0 && frost) timers.current.push(window.setTimeout(sounds.groundBreak, frost.impactSeconds * 1000));
      const pourAt = (pourSeconds ?? Infinity) * 1000;
      if (introMs > 0 && pourAt < introMs) {
        timers.current.push(
          window.setTimeout(() => (tipped.current = true), pourAt),
          window.setTimeout(() => (pouring.current = true), pourAt + POUR_TIP_MS),
          window.setTimeout(() => setSmoke(performance.now()), pourAt + POUR_TIP_MS + POUR_DROP_MS),
          window.setTimeout(
            () => {
              pouring.current = false;
              tipped.current = false;
            },
            pourAt + POUR_TIP_MS + POUR_MS,
          ),
        );
      }
    },
    [showcase, pourSeconds, frost, sounds],
  );
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  return (
    <group position-y={FLOOR_Y}>
      {character.levitates && (
        <>
          <LevitationAura size={FIGURE_HEIGHT} color={character.color} progress={rise} height={HOVER_HEIGHT} />
          {burst !== null && <LevitationBurst key={burst} size={FIGURE_HEIGHT} color={character.color} />}
        </>
      )}
      {character.handProp === "vial" && (
        <>
          <PourStream size={FIGURE_HEIGHT} color={character.color} mouth={mouth} pouring={pouring} />
          {smoke !== null && <SmokeCloud key={smoke} size={FIGURE_HEIGHT} color={character.color} />}
        </>
      )}
      {character.descends && <HeavenDescent size={FIGURE_HEIGHT} color={character.color} />}
      {entrance && <WindGusts tips={tips} />}
      <group ref={descent} position-y={character.descends ? descentHeight(0) * FIGURE_HEIGHT : 0}>
        <group ref={hover}>
          <CharacterModel
            url={character.model}
            height={FIGURE_HEIGHT}
            clip={clip}
            onClipLengths={onClipLengths}
            introSpeed={character.introSpeed}
          >
            {(figure) => (
              <>
                {character.energyBlades && <EnergyBlades figure={figure} color={character.color} active={inIntro} />}
                {character.levitates && <WitchStaff figure={figure} color={character.color} active={hovering} />}
                {character.introCards && (
                  <JesterCards
                    figure={figure}
                    size={FIGURE_HEIGHT}
                    color={character.color}
                    beats={character.introCards}
                    active={inIntro}
                  />
                )}
                {character.introArrows && (
                  <ArcherIntro
                    figure={figure}
                    size={FIGURE_HEIGHT}
                    color={character.color}
                    beats={character.introArrows}
                    active={inIntro}
                  />
                )}
                {character.introSeals && (
                  <ScribeIntro figure={figure} size={FIGURE_HEIGHT} beats={character.introSeals} active={inIntro} />
                )}
                {character.introBones && (
                  <BoneRise figure={figure} size={FIGURE_HEIGHT} beats={character.introBones} active={inIntro} />
                )}
                {character.introFrost && (
                  <FrostSlam figure={figure} size={FIGURE_HEIGHT} beats={character.introFrost} active={inIntro} />
                )}
                {character.limbLightning && (
                  <LimbLightning
                    figure={figure}
                    size={FIGURE_HEIGHT}
                    color={character.color}
                    active={inIntro}
                    strikeSeconds={
                      character.introStrikeSeconds === undefined
                        ? undefined
                        : character.introStrikeSeconds / (character.introSpeed ?? 1)
                    }
                  />
                )}
                {character.wand && (
                  <FrostWand
                    figure={figure}
                    active={inIntro}
                    hand={character.introWand?.hand}
                    flourish={character.introWand}
                  />
                )}
                {character.wings && (
                  <Wings figure={figure} wings={character.wings} stroke={stroke} tips={entrance ? tips : undefined} />
                )}
                {character.crown && <HeadCrown figure={figure} crown={character.crown} />}
                {character.holdsScale && <JusticeScale figure={figure} />}
                {character.handProp === "vial" && (
                  <HeldVial figure={figure} color={character.color} active={propOut} tilt={tilt} mouth={mouth} />
                )}
              </>
            )}
          </CharacterModel>
        </group>
      </group>
    </group>
  );
}
