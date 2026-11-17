import { CanvasTexture, type Material, type Texture, Vector4 } from "three";
import { seededRandom } from "@/game/domain/core/random";

/**
 * The warm pools of light the lamp posts throw on the ground, painted once into a map laid over the map's
 * whole extent and added in the materials of the ground, the road and its slabs: no real lights, one lookup.
 */
export const lampGlow = {
  lampGlowMap: { value: null as Texture | null },
  /** The map's extent on the ground: min x, min z, width, depth. */
  lampGlowBounds: { value: new Vector4(0, 0, 1, 1) },
  /** 0 on maps without lamps. */
  lampGlowStrength: { value: 0 },
};

/** Light pools per canvas pixel: a lamp's pool spans a few world units, so this keeps them soft but cheap. */
const PIXELS_PER_UNIT = 8;
const MAX_CANVAS = 2048;
/** A pool stretches along the road and stays narrow across it; a few blobs off its middle break the circle. */
const POOL_STRETCH = { along: 1.5, across: 0.75 };
const POOL_BLOBS = 4;

/** A spot of light on the ground: where its middle falls, and which way the road runs there (radians, in x-z). */
export interface LampPool {
  x: number;
  z: number;
  along: number;
}

/** Paints a soft, uneven warm pool round each spot into a map over `bounds`; overlapping pools never add up. */
export function paintLampPools(
  pools: readonly LampPool[],
  bounds: { minX: number; minZ: number; width: number; depth: number },
  radius: number,
): CanvasTexture {
  const scale = Math.min(PIXELS_PER_UNIT, MAX_CANVAS / Math.max(bounds.width, bounds.depth));
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(bounds.width * scale);
  canvas.height = Math.ceil(bounds.depth * scale);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Opaque black under the pools: on a clear canvas the faint rims are stored unpremultiplied, at full colour,
    // and the pools end in a hard, flickering edge.
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // The brighter of two pools wins where they meet, so a row of lamps never melts into one bright blot.
    ctx.globalCompositeOperation = "lighten";
    const random = seededRandom(71);
    for (const { x, z, along } of pools) {
      for (let blob = 0; blob < POOL_BLOBS; blob++) {
        const main = blob === 0;
        const size = radius * (main ? 1 : 0.45 + random() * 0.35);
        const [ox, oz] = main ? [0, 0] : [(random() - 0.5) * radius * 1.6, (random() - 0.5) * radius * 0.7];
        ctx.save();
        ctx.translate((x - bounds.minX) * scale, (z - bounds.minZ) * scale);
        ctx.rotate(along);
        ctx.translate(ox * scale, oz * scale);
        ctx.scale(POOL_STRETCH.along, POOL_STRETCH.across);
        const r = size * scale;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        const peak = main ? 0.55 : 0.3;
        gradient.addColorStop(0, `rgba(255,190,115,${peak})`);
        gradient.addColorStop(0.45, `rgba(255,165,90,${peak * 0.4})`);
        gradient.addColorStop(1, "rgba(255,150,70,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.restore();
      }
    }
  }
  return new CanvasTexture(canvas);
}

const glowing = new WeakSet<Material>();

/** Lets a standard material take the lamp pools (see lampGlow), before its first render; again is harmless. */
export function withLampGlow<T extends Material>(material: T): T {
  if (glowing.has(material)) return material;
  glowing.add(material);
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    Object.assign(shader.uniforms, lampGlow);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vLampXZ;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vec4 lampWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          lampWorld = instanceMatrix * lampWorld;
        #endif
        vLampXZ = (modelMatrix * lampWorld).xz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vLampXZ;
        uniform sampler2D lampGlowMap;
        uniform vec4 lampGlowBounds;
        uniform float lampGlowStrength;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        if (lampGlowStrength > 0.0) {
          vec2 lampUv = (vLampXZ - lampGlowBounds.xy) / lampGlowBounds.zw;
          vec3 pool = texture2D(lampGlowMap, vec2(lampUv.x, 1.0 - lampUv.y)).rgb;
          // Mostly lighting what lies there, plus a faint haze so even dark earth shows the pool.
          totalEmissiveRadiance += pool * (diffuseColor.rgb * 1.2 + 0.015) * lampGlowStrength;
        }`,
      );
  };
  material.customProgramCacheKey = () => "lampGlow";
  return material;
}
