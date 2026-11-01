import { CatmullRomCurve3, LatheGeometry, Object3D, Quaternion, Shape, ShapeGeometry, SphereGeometry, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { seededRandom } from "@/game/domain/random";

/** Rose bushes around the circle: `radius` of the mound, how many `roses` bloom on it. */
export const BUSHES = [
  { x: -0.72, z: -0.42, radius: 0.15, roses: 4 },
  { x: -0.36, z: -0.82, radius: 0.13, roses: 3 },
  { x: 0.08, z: -0.92, radius: 0.1, roses: 2 },
  { x: 0.38, z: -0.8, radius: 0.14, roses: 4 },
  { x: 0.74, z: -0.36, radius: 0.13, roses: 3 },
  { x: -0.84, z: 0.14, radius: 0.08, roses: 2 },
  { x: 0.84, z: 0.18, radius: 0.07, roses: 1 },
];
const LEAVES_PER_RADIUS = 160;
/** Thorny vines crawling out from the bushes over the soil, as [x, z] points. */
export const VINES: [number, number][][] = [
  [
    [-0.72, -0.42],
    [-0.6, -0.22],
    [-0.68, -0.02],
    [-0.58, 0.14],
    [-0.48, 0.1],
  ],
  [
    [0.74, -0.36],
    [0.6, -0.16],
    [0.68, 0.02],
    [0.56, 0.22],
  ],
  [
    [-0.36, -0.82],
    [-0.18, -0.68],
    [-0.04, -0.74],
    [0.08, -0.62],
  ],
  [
    [0.38, -0.8],
    [0.5, -0.58],
    [0.36, -0.5],
  ],
];
const THORNS_PER_VINE = 14;

/** Where every leaf, rose and thorn goes; fixed by a seed so the garden never rearranges. */
export function gardenLayout() {
  const random = seededRandom(101);
  const place = (position: Vector3, rotation: [number, number, number], scale: [number, number, number]) => {
    const placement = new Object3D();
    placement.position.copy(position);
    placement.rotation.set(...rotation);
    placement.scale.set(...scale);
    placement.updateMatrix();
    return placement;
  };
  // A point on a bush's dome, `lift` keeping it off the bottom rim.
  const onDome = (x: number, z: number, radius: number, lift: number) => {
    const angle = random() * Math.PI * 2;
    const rise = lift + random() * (1 - lift);
    const out = Math.sqrt(1 - rise * rise);
    return new Vector3(x + Math.cos(angle) * out * radius, rise * radius * 0.75, z + Math.sin(angle) * out * radius);
  };
  const leaves = BUSHES.flatMap(({ x, z, radius }) =>
    Array.from({ length: Math.round(radius * LEAVES_PER_RADIUS) }, () =>
      place(
        onDome(x, z, radius * 1.02, 0.05),
        [random() * Math.PI, random() * Math.PI * 2, random() * Math.PI],
        [0.014, 0.004, 0.028].map((size) => size * (0.7 + random() * 0.6)) as [number, number, number],
      ),
    ),
  );
  const roses = BUSHES.flatMap(({ x, z, radius, roses }) =>
    Array.from({ length: roses }, () => {
      const at = onDome(x, z, radius * 1.05, 0.35);
      // Blooms face out from the bush and up a little, towards the light.
      const lean = Math.atan2(Math.hypot(at.x - x, at.z - z), radius * 0.6);
      const heading = Math.atan2(at.x - x, at.z - z);
      const size = 0.05 + random() * 0.025;
      return place(at, [lean * Math.cos(heading), 0, -lean * Math.sin(heading)], [size, size, size]);
    }),
  );
  const up = new Vector3(0, 1, 0);
  const thorns = VINES.flatMap((points) => {
    const curve = vineCurve(points);
    return Array.from({ length: THORNS_PER_VINE }, (_, index) => {
      const u = (index + 0.5) / THORNS_PER_VINE;
      const tangent = curve.getTangentAt(u);
      const side = tangent
        .clone()
        .cross(new Vector3(random() - 0.5, random() - 0.5, random() - 0.5))
        .normalize();
      const placement = new Object3D();
      placement.position.copy(curve.getPointAt(u));
      placement.quaternion.copy(new Quaternion().setFromUnitVectors(up, side));
      placement.updateMatrix();
      return placement;
    });
  });
  return { leaves, roses, thorns };
}

/** A vine through its [x, z] points, crawling low and arching up a little between them. */
export function vineCurve(points: [number, number][]) {
  return new CatmullRomCurve3(
    points.map(([x, z], index) => new Vector3(x, index % 2 ? 0.035 : 0.01, z)),
    false,
    "catmullrom",
    0.4,
  );
}

/** A rose about 1 across: three cups of petals, scalloped and opening outwards, round a tight bud. */
export function roseGeometry() {
  const cups = [
    { radius: 0.5, height: 0.5, lobes: 5 },
    { radius: 0.36, height: 0.6, lobes: 4 },
    { radius: 0.22, height: 0.68, lobes: 3 },
  ].map(({ radius, height, lobes }, layer) => {
    const profile = [
      new Vector2(0.03, 0),
      new Vector2(radius * 0.55, height * 0.2),
      new Vector2(radius * 0.92, height * 0.6),
      new Vector2(radius, height),
    ];
    const cup = new LatheGeometry(profile, 15);
    const position = cup.getAttribute("position");
    for (let index = 0; index < position.count; index++) {
      const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
      const petal = Math.cos(Math.atan2(z, x) * lobes + layer * 0.9);
      // Petal tips rise and flare at the rim, the gaps between them dip.
      const rim = y / height;
      const flare = 1 + 0.18 * petal * rim;
      position.setXYZ(index, x * flare, y * (1 + 0.15 * petal * rim), z * flare);
    }
    cup.computeVertexNormals();
    return cup;
  });
  const bud = new SphereGeometry(0.12, 10, 8).scale(1, 1.4, 1).translate(0, 0.5, 0);
  const merged = mergeGeometries([...cups, bud]);
  [...cups, bud].forEach((part) => part.dispose());
  return merged;
}

/** A small rounded petal, about 0.035 long. */
export function petalGeometry() {
  const shape = new Shape();
  shape.moveTo(0, -0.017);
  shape.bezierCurveTo(0.016, -0.01, 0.014, 0.012, 0, 0.018);
  shape.bezierCurveTo(-0.014, 0.012, -0.016, -0.01, 0, -0.017);
  return new ShapeGeometry(shape, 6);
}
