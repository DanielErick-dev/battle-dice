"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  MeshStandardMaterial,
  ShaderMaterial,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
  type Mesh,
  type Sprite,
} from "three";
import { useCanvasTexture, type CanvasLook } from "@/features/shared/three/canvasTexture";
import { uniform } from "@/features/shared/three/uniform";
import { FIGURE_HEIGHT } from "../../layout";
import { DARK_LIGHT, POWER_OFF_SECONDS, powerAt } from "./layout";

/** Seconds the ON sign stays up once powered, then fades. */
const ON_SIGN_SECONDS = 1.6;
const SIGN_SIZE = 0.32;

/** Each cable from a machine's socket, along the deck, into a port on the pad's rim. */
const CABLES: readonly (readonly [number, number, number])[][] = [
  [
    [-0.82, 0.22, -0.6],
    [-0.74, 0.02, -0.5],
    [-0.5, 0.012, -0.36],
    [-0.36, 0.012, -0.28],
  ],
  [
    [0.78, 0.18, -0.55],
    [0.7, 0.02, -0.45],
    [0.5, 0.012, -0.34],
    [0.36, 0.012, -0.28],
  ],
  [
    [0.3, 0.16, -0.9],
    [0.26, 0.02, -0.78],
    [0.12, 0.012, -0.6],
    [0.02, 0.012, -0.47],
  ],
];
const CABLE_RADIUS = 0.011;

const FLOW_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Energy running down the cable from the machine (u = 0) to the pad, a surge as it powers up, then a steady trickle.
const FLOW_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float pulse = pow(0.5 + 0.5 * sin((vUv.x * 3.0 - uTime * 1.6) * 6.2832), 6.0);
    float glow = uPower * (0.25 + 0.9 * pulse);
    gl_FragColor = vec4(uColor * glow, glow);
    #include <colorspace_fragment>
  }
`;

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
 * Unidade Alva switched off and powering up through her intro: the bay's lights down (`lights`), an OFF sign over
 * her, then a flicker, the lights up, the sign turned ON and power surging down the cables into her pad.
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
  const geometries = useMemo(
    () =>
      CABLES.map(
        (points) => new TubeGeometry(new CatmullRomCurve3(points.map((p) => new Vector3(...p))), 32, CABLE_RADIUS, 6),
      ),
    [],
  );
  const glowGeometries = useMemo(
    () =>
      CABLES.map(
        (points) =>
          new TubeGeometry(new CatmullRomCurve3(points.map((p) => new Vector3(...p))), 32, CABLE_RADIUS * 1.35, 6),
      ),
    [],
  );
  const materials = useMemo(
    () => ({
      rubber: new MeshStandardMaterial({ color: "#15181d", roughness: 0.8, metalness: 0.1 }),
      flow: new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPower: { value: 0 }, uColor: { value: new Color("#5fd8ff") } },
        vertexShader: FLOW_VERTEX,
        fragmentShader: FLOW_FRAGMENT,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      off: new SpriteMaterial({ map: offTexture, transparent: true, depthWrite: false, toneMapped: false }),
      on: new SpriteMaterial({ map: onTexture, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }),
    }),
    [offTexture, onTexture],
  );
  useEffect(
    () => () => {
      [...geometries, ...glowGeometries].forEach((geometry) => geometry.dispose());
      Object.values(materials).forEach((material) => material.dispose());
      // Back to full light for whoever's stage comes next.
      setLights(1);
    },
    [geometries, glowGeometries, materials, setLights],
  );
  const offSign = useRef<Sprite>(null);
  const onSign = useRef<Sprite>(null);
  const flow = useRef<Mesh[]>([]);

  useFrame(({ clock }) => {
    // Dark until her intro starts, timed from it so the lights come up as she lifts her head.
    const since = introSeconds() ?? 0;
    const level = powerAt(since);
    onPower(level);
    setLights(DARK_LIGHT + (1 - DARK_LIGHT) * level);
    const cable = flow.current[0]?.material as ShaderMaterial | undefined;
    if (cable) {
      uniform(cable, "uTime").value = clock.elapsedTime;
      uniform(cable, "uPower").value = level;
    }
    // The OFF sign blinks slowly while she's dark, then gives way to ON, which fades after a moment.
    const off = since < POWER_OFF_SECONDS;
    if (offSign.current) {
      offSign.current.visible = off;
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
      {geometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={materials.rubber} />
      ))}
      {glowGeometries.map((geometry, index) => (
        <mesh
          key={index}
          ref={(mesh) => void (mesh && (flow.current[index] = mesh))}
          geometry={geometry}
          material={materials.flow}
        />
      ))}
      <sprite ref={offSign} material={materials.off} position-y={FIGURE_HEIGHT + 0.22} scale={SIGN_SIZE} />
      <sprite ref={onSign} material={materials.on} position-y={FIGURE_HEIGHT + 0.22} scale={SIGN_SIZE} />
    </group>
  );
}
