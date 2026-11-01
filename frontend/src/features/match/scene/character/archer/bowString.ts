import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Line,
  LineBasicMaterial,
  TubeGeometry,
  Vector3,
  type Mesh,
  type Object3D,
} from "three";

/** The bow, as shares of the figure's height: half its length, and how far its limbs bow forward. */
export const BOW_HALF = 0.28;
export const BOW_BULGE = 0.09;

/** The bow of light: grip at the origin, limbs bowing forward (+X) and back to the tips behind it. */
export function bowGeometry(): TubeGeometry {
  const points = Array.from({ length: 17 }, (_, i) => {
    const y = (i / 16 - 0.5) * 2 * BOW_HALF;
    return new Vector3(BOW_BULGE * (1 - (y / BOW_HALF) ** 2) - BOW_BULGE, y, 0);
  });
  return new TubeGeometry(new CatmullRomCurve3(points), 32, 0.006, 6, false);
}

/** The bowstring: a glowing line through three points (top tip, nock, bottom tip), laid out every frame. */
export interface BowString {
  line: Line<BufferGeometry, LineBasicMaterial>;
  material: LineBasicMaterial;
  dispose: () => void;
}

export function bowString(): BowString {
  const geometry = new BufferGeometry().setFromPoints([new Vector3(), new Vector3(), new Vector3()]);
  const material = new LineBasicMaterial({
    color: new Color("#f7fff0").multiplyScalar(1.5),
    transparent: true,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  return {
    line: new Line(geometry, material),
    material,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Lays the bowstring through `points` (world space: top tip, nock, bottom tip), at `opacity`. */
export function pullString(string: BowString, group: Object3D, points: readonly Vector3[], opacity: number) {
  const positions = string.line.geometry.attributes.position;
  points.forEach((point, index) => {
    const local = group.worldToLocal(point.clone());
    positions.setXYZ(index, local.x, local.y, local.z);
  });
  positions.needsUpdate = true;
  string.material.opacity = opacity;
}

/** Swaps the trail's tube for one through `points` (world space), `radius` thick in `group`'s units. */
export function retrace(trail: Mesh, group: Object3D, points: readonly Vector3[], radius: number) {
  trail.geometry.dispose();
  trail.geometry = new TubeGeometry(
    new CatmullRomCurve3(points.map((point) => group.worldToLocal(point.clone()))),
    points.length * 2,
    radius,
    6,
    false,
  );
}
