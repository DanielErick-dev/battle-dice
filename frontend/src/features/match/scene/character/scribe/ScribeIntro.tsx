"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointsMaterial,
  Quaternion,
  Vector3,
  type Group,
  type Object3D,
} from "three";
import type { IntroSealBeats } from "../../../characters";
import { useAge } from "../../useAge";
import { BLOOD_INK } from "../shared/parchment";
import { useSoftDisc } from "../shared/softDisc";
import { findBone } from "../core/bones";
import { placeInWorld } from "../core/worldPlacement";
import {
  BLOOD_GLOW,
  BURN_SECONDS,
  CIRCLE_EXTRA_SECONDS,
  CIRCLE_SIZE,
  clamp01,
  easeOut,
  FLY_SECONDS,
  PAGE_BURN_SECONDS,
  PAGE_HEIGHT,
  PAGE_UNROLL_SECONDS,
  PAGE_WIDTH,
  SCROLLS,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  UNROLL_SECONDS,
} from "./introLayout";
import { PAGE_STROKES, CIRCLE_STROKES, useWriting, useParchment, usePages, useBurnMask, curledSheet } from "./writing";
import { useSparks, useEmbers } from "./particles";
import { Rod } from "./Rod";

const scratch = {
  tip: new Vector3(),
  point: new Vector3(),
  target: new Vector3(),
  position: new Vector3(),
  facing: new Quaternion(),
  local: new Vector3(),
};
const UP = new Vector3(0, 1, 0);

/**
 * The Flesh Scribe's intro. A page of parchment unrolls in the air before his hand and, as he
 * writes, runes of blood appear on it, glowing, ink sparking and dripping off the pen; meanwhile
 * a ritual circle of blood writes itself on the floor round him. When he throws his arms up the
 * circle flares and the page tears into four scrolls (his four seals) that fly out round him,
 * unrolling: aged parchment between dark wooden rods with brass ends, written in dried blood
 * whose runes smoulder red, each closed with a wax seal. As his arms come down they
 * burn away from the edges in, shedding embers, and the circle fades. Placed in world space round
 * him; mounted fresh with every intro.
 */
export function ScribeIntro({
  figure,
  size,
  beats,
  active,
}: {
  figure: Object3D;
  size: number;
  beats: IntroSealBeats;
  active: RefObject<boolean>;
}) {
  const root = useRef<Group>(null);
  const page = useRef<Group>(null);
  const pageSheet = useRef<Group>(null);
  const pageLowerRod = useRef<Group>(null);
  const circle = useRef<Group>(null);
  const scrolls = useRef<(Group | null)[]>([]);
  const lowerRods = useRef<(Group | null)[]>([]);
  const sheets = useRef<(Group | null)[]>([]);
  const fingertip = useMemo(() => findBone(figure, "RightHandMiddle4") ?? findBone(figure, "RightHand"), [figure]);
  const hips = useMemo(() => findBone(figure, "Hips"), [figure]);
  const glow = BLOOD_GLOW;

  const pageWriting = useWriting(PAGE_STROKES, 192, 256, 4.5);
  const circleWriting = useWriting(CIRCLE_STROKES, 512, 512, 5);
  const blankPage = useParchment(192, 256, 77);
  const pages = usePages();
  const burnMask = useBurnMask();
  const disc = useSoftDisc();
  const sheetGeometry = useMemo(() => curledSheet(SHEET_WIDTH, SHEET_HEIGHT), []);
  const pageGeometry = useMemo(() => curledSheet(PAGE_WIDTH, PAGE_HEIGHT), []);
  useEffect(
    () => () => [sheetGeometry, pageGeometry].forEach((geometry) => geometry.dispose()),
    [sheetGeometry, pageGeometry],
  );

  const materials = useMemo(() => {
    const parchment = (map: CanvasTexture) =>
      // A tiny alphaTest from the start, so raising it as the sheets burn never recompiles them.
      new MeshStandardMaterial({ map, alphaMap: burnMask, alphaTest: 0.001, roughness: 0.92, side: DoubleSide });
    const ink = (map: CanvasTexture) =>
      new MeshBasicMaterial({
        map,
        alphaMap: burnMask,
        alphaTest: 0.001,
        color: BLOOD_INK,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      });
    const glowing = (map: CanvasTexture) =>
      new MeshBasicMaterial({
        map,
        alphaMap: burnMask,
        alphaTest: 0.001,
        color: glow,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        side: DoubleSide,
      });
    return {
      page: parchment(blankPage),
      pageInk: ink(pageWriting.texture),
      pageGlow: glowing(pageWriting.texture),
      circleInk: new MeshBasicMaterial({
        map: circleWriting.texture,
        color: BLOOD_INK,
        transparent: true,
        depthWrite: false,
      }),
      circleGlow: new MeshBasicMaterial({
        map: circleWriting.texture,
        color: glow,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      parchment: pages.map(({ parchment: map }) => parchment(map)),
      runes: pages.map(({ runes }) => glowing(runes)),
      wood: new MeshStandardMaterial({ color: "#2e1b10", roughness: 0.55 }),
      brass: new MeshStandardMaterial({ color: "#8a6a2c", metalness: 0.85, roughness: 0.35 }),
      wax: new MeshStandardMaterial({ color: "#5c0b10", roughness: 0.28, metalness: 0.1 }),
      sparks: new PointsMaterial({
        map: disc,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    };
  }, [pageWriting.texture, circleWriting.texture, blankPage, pages, burnMask, disc, glow]);
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );

  const sparks = useSparks();
  const embers = useEmbers();
  const age = useAge();
  /** Where the page hangs (world space, its top edge) and which way it faces, fixed as it appears. */
  const anchor = useRef<{ top: Vector3; facing: Quaternion } | null>(null);
  const lastSpark = useRef(0);

  useFrame(({ clock }) => {
    const group = root.current;
    if (!group || !fingertip || !hips) return;
    const t = age(clock.elapsedTime);
    const parentScale = group.getWorldScale(scratch.local).x || 1;
    const floorY = group.getWorldPosition(scratch.local).y;
    const presence = active.current ? 1 : 0;
    const pageIn = easeOut(clamp01((t - beats.writeSeconds + PAGE_UNROLL_SECONDS) / PAGE_UNROLL_SECONDS));
    const written = clamp01((t - beats.writeSeconds) / (beats.writtenSeconds - beats.writeSeconds));
    const flare = clamp01((t - beats.raiseSeconds) / 0.35);
    const pageBurn = clamp01((t - beats.raiseSeconds - 0.1) / PAGE_BURN_SECONDS);
    const burn = Math.max(clamp01((t - beats.releaseSeconds) / BURN_SECONDS), 1 - presence);

    hips.getWorldPosition(scratch.point);
    fingertip.getWorldPosition(scratch.tip);
    if (t >= beats.writeSeconds - PAGE_UNROLL_SECONDS && !anchor.current) {
      // Facing the way he faces, out beside his writing hand (so it doesn't hide him), a little in
      // front of his fingertip and hanging so the finger writes about its middle.
      figure.getWorldQuaternion(scratch.facing);
      const forward = new Vector3(0, 0, 1).applyQuaternion(scratch.facing).setY(0).normalize();
      const across = new Vector3().crossVectors(UP, forward);
      const side = Math.sign(across.dot(scratch.tip.clone().sub(scratch.point))) || 1;
      anchor.current = {
        top: scratch.tip
          .clone()
          .addScaledVector(forward, 0.08 * size)
          .addScaledVector(across, side * PAGE_WIDTH * 0.15 * size)
          .setY(scratch.tip.y + PAGE_HEIGHT * 0.35 * size),
        facing: new Quaternion().setFromAxisAngle(UP, Math.atan2(forward.x, forward.z)),
      };
    }

    // The page unrolls in the air, is written on, flares as he throws his arms up, and burns.
    pageWriting.drawUpTo(written);
    if (page.current && anchor.current) {
      page.current.visible = pageIn > 0 && pageBurn < 1;
      placeInWorld(page.current, group, anchor.current.top, size, anchor.current.facing);
      if (pageSheet.current) pageSheet.current.scale.y = Math.max(0.001, pageIn);
      if (pageLowerRod.current) pageLowerRod.current.position.y = -PAGE_HEIGHT * pageIn;
      const cut = 0.001 + pageBurn * 0.999;
      materials.page.setValues({ alphaTest: cut });
      materials.pageInk.setValues({ alphaTest: cut });
      materials.pageGlow.setValues({ alphaTest: cut, opacity: (0.6 + 0.25 * Math.sin(t * 7)) * (1 + flare * 2) });

      // Ink sparks off the pen, where the writing has got to.
      if (written > 0 && written < 1 && t - lastSpark.current > 1 / 70) {
        lastSpark.current = t;
        const [u, v] = pageWriting.penAt(written);
        page.current.updateWorldMatrix(true, false);
        page.current.localToWorld(scratch.position.set((u - 0.5) * PAGE_WIDTH, -v * PAGE_HEIGHT, 0.01));
        sparks.emit(group.worldToLocal(scratch.position), t, size / parentScale);
      }
    }
    sparks.update(t, glow);
    // Points are sized in world units, whatever their parent's scale.
    materials.sparks.setValues({ size: 0.012 * size });

    // The circle writes itself on the floor, flares as his arms go up, and fades with the scrolls.
    circleWriting.drawUpTo(
      clamp01((t - beats.writeSeconds) / (beats.writtenSeconds + CIRCLE_EXTRA_SECONDS - beats.writeSeconds)),
    );
    if (circle.current) {
      placeInWorld(
        circle.current,
        group,
        scratch.position.set(scratch.point.x, floorY + 0.004 * size, scratch.point.z),
        size,
      );
    }
    const circleFade = 1 - burn;
    const surge = flare * (1 - clamp01((t - beats.raiseSeconds - 0.35) / 0.8));
    materials.circleInk.setValues({ opacity: 0.85 * circleFade });
    materials.circleGlow.setValues({ opacity: (0.35 + 0.15 * Math.sin(t * 2.5) + surge * 1.5) * circleFade });

    // The scrolls fly out of the page to hang round him, unroll, then burn away.
    SCROLLS.forEach(({ angle, radius, height }, index) => {
      const scroll = scrolls.current[index];
      if (!scroll || !anchor.current) return;
      const start = beats.raiseSeconds + index * 0.08;
      const fly = easeOut(clamp01((t - start) / FLY_SECONDS));
      const unroll = easeOut(clamp01((t - start - 0.3) / UNROLL_SECONDS));
      scroll.visible = t >= start && burn < 1;
      const at = angle + Math.sin(t * 0.8 + index * 1.7) * 0.06;
      scratch.target.set(
        scratch.point.x + Math.sin(at) * radius * size,
        floorY + (height + Math.sin(t * 1.4 + index) * 0.015) * size,
        scratch.point.z + Math.cos(at) * radius * size,
      );
      const position = scratch.position
        .copy(anchor.current.top)
        .setY(anchor.current.top.y - PAGE_HEIGHT * 0.5 * size)
        .lerp(scratch.target, fly);
      // Facing out from him, turned halfway towards the front so the writing reads.
      scratch.facing.setFromAxisAngle(UP, at * 0.5);
      placeInWorld(scroll, group, position, size, scratch.facing);
      scroll.rotateZ(Math.sin(t * 1.1 + index) * 0.05);

      const sheet = sheets.current[index];
      if (sheet) sheet.scale.y = Math.max(0.001, unroll);
      const lower = lowerRods.current[index];
      if (lower) lower.position.y = -SHEET_HEIGHT * unroll;

      materials.parchment[index].setValues({ alphaTest: 0.001 + burn * 0.999 });
      materials.runes[index].setValues({
        alphaTest: 0.001 + burn * 0.999,
        opacity: unroll * (0.55 + 0.3 * Math.sin(t * 3 + index * 2)),
      });
      embers.update(index, burn, t);
    });
  });

  return (
    <group ref={root}>
      <group ref={circle}>
        <mesh material={materials.circleInk} rotation-x={-Math.PI / 2} renderOrder={1}>
          <planeGeometry args={[CIRCLE_SIZE, CIRCLE_SIZE]} />
        </mesh>
        <mesh material={materials.circleGlow} rotation-x={-Math.PI / 2} position-y={0.002} renderOrder={2}>
          <planeGeometry args={[CIRCLE_SIZE, CIRCLE_SIZE]} />
        </mesh>
      </group>
      <group ref={page} visible={false}>
        <Rod width={PAGE_WIDTH} wood={materials.wood} brass={materials.brass} />
        <group ref={pageSheet}>
          <mesh geometry={pageGeometry} material={materials.page} />
          <mesh geometry={pageGeometry} material={materials.pageInk} position-z={0.002} />
          <mesh geometry={pageGeometry} material={materials.pageGlow} position-z={0.003} />
        </group>
        <group ref={pageLowerRod}>
          <Rod width={PAGE_WIDTH} wood={materials.wood} brass={materials.brass} />
        </group>
      </group>
      <points geometry={sparks.geometry} material={materials.sparks} frustumCulled={false} />
      {SCROLLS.map((_, index) => (
        <group
          key={index}
          ref={(group) => {
            scrolls.current[index] = group;
          }}
          visible={false}
        >
          <Rod width={SHEET_WIDTH} wood={materials.wood} brass={materials.brass} />
          <group
            ref={(group) => {
              sheets.current[index] = group;
            }}
          >
            <mesh geometry={sheetGeometry} material={materials.parchment[index]} />
            {/* The runes' glow, a hair in front of the parchment. */}
            <mesh geometry={sheetGeometry} material={materials.runes[index]} position-z={0.002} />
          </group>
          <group
            ref={(group) => {
              lowerRods.current[index] = group;
            }}
          >
            <Rod width={SHEET_WIDTH} wood={materials.wood} brass={materials.brass} />
            {/* The wax seal hanging off the lower rod. */}
            <mesh material={materials.wax} position={[0, -0.022, 0.006]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.017, 0.019, 0.006, 20]} />
            </mesh>
          </group>
          <points geometry={embers.geometries[index]} material={materials.sparks} frustumCulled={false} />
        </group>
      ))}
    </group>
  );
}
