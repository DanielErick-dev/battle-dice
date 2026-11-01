import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, Color, Vector3 } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { BURN_SECONDS, clamp01, EMBERS, SCROLLS, SHEET_HEIGHT, SHEET_WIDTH, SPARK_LIFE, SPARKS } from "./introLayout";

/** The ink sparks: a ring of points shed at the fingertip, drifting and fading, some dripping. */
export function useSparks() {
  const sparks = useMemo(() => createSparks(), []);
  useEffect(() => () => sparks.geometry.dispose(), [sparks]);
  return sparks;
}

function createSparks() {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(SPARKS * 3);
  const colours = new Float32Array(SPARKS * 3);
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colours, 3));
  const sparks = Array.from({ length: SPARKS }, () => ({
    origin: new Vector3(),
    velocity: new Vector3(),
    born: -Infinity,
    drips: false,
    unit: 1,
  }));
  const random = seededRandom(3);
  let next = 0;
  const emit = (at: Vector3, t: number, unit: number) => {
    const spark = sparks[next];
    next = (next + 1) % SPARKS;
    spark.origin.copy(at);
    spark.born = t;
    spark.drips = random() < 0.35;
    spark.unit = unit;
    spark.velocity.set((random() - 0.5) * 0.06, spark.drips ? -0.02 : 0.05 * random(), (random() - 0.5) * 0.06);
    spark.velocity.multiplyScalar(unit);
  };
  const update = (t: number, glow: Color) => {
    sparks.forEach((spark, index) => {
      const age = t - spark.born;
      const life = Math.max(0, 1 - age / SPARK_LIFE);
      // Drips fall like blood: slowly at first, a share of his height per second squared.
      const fall = spark.drips ? -0.5 * 0.25 * age * age * spark.unit : 0;
      positions[index * 3] = spark.origin.x + spark.velocity.x * age;
      positions[index * 3 + 1] = spark.origin.y + spark.velocity.y * age + fall;
      positions[index * 3 + 2] = spark.origin.z + spark.velocity.z * age;
      const brightness = life * life;
      colours[index * 3] = glow.r * brightness;
      colours[index * 3 + 1] = glow.g * brightness;
      colours[index * 3 + 2] = glow.b * brightness;
    });
    geometry.getAttribute("position").needsUpdate = true;
    geometry.getAttribute("color").needsUpdate = true;
  };
  return { geometry, emit, update };
}

/** Embers rising off each scroll as it burns, scattered over its sheet. */
export function useEmbers() {
  const state = useMemo(() => {
    const random = seededRandom(9);
    const ember = new Color("#ff7a2a").multiplyScalar(2.2);
    const scrolls = SCROLLS.map(() => {
      const geometry = new BufferGeometry();
      const seeds = Array.from({ length: EMBERS }, () => ({
        x: (random() - 0.5) * SHEET_WIDTH,
        y: -random() * SHEET_HEIGHT,
        delay: random() * 0.7,
        rise: 0.08 + random() * 0.12,
        drift: (random() - 0.5) * 0.05,
      }));
      geometry.setAttribute("position", new BufferAttribute(new Float32Array(EMBERS * 3), 3));
      geometry.setAttribute("color", new BufferAttribute(new Float32Array(EMBERS * 3), 3));
      return { geometry, seeds };
    });
    const update = (index: number, burn: number, t: number) => {
      const { geometry, seeds } = scrolls[index];
      const positions = geometry.getAttribute("position") as BufferAttribute;
      const colours = geometry.getAttribute("color") as BufferAttribute;
      seeds.forEach((seed, point) => {
        const local = clamp01((burn * BURN_SECONDS - seed.delay) / 0.6);
        const on = local > 0 && local < 1 ? Math.sin(local * Math.PI) * (0.7 + 0.3 * Math.sin(t * 20 + point)) : 0;
        positions.setXYZ(point, seed.x + seed.drift * local, seed.y + seed.rise * local, 0.01);
        colours.setXYZ(point, ember.r * on, ember.g * on, ember.b * on);
      });
      positions.needsUpdate = true;
      colours.needsUpdate = true;
    };
    return { geometries: scrolls.map(({ geometry }) => geometry), update };
  }, []);
  useEffect(() => () => state.geometries.forEach((geometry) => geometry.dispose()), [state]);
  return state;
}
