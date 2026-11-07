import { BufferGeometry, Float32BufferAttribute } from "three";

/** The pair as two geometries: the triangles left of the middle (x < 0), and those right of it. */
export function splitDownTheMiddle(geometry: BufferGeometry): { left: BufferGeometry; right: BufferGeometry } {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const sides = { left: new Map<string, number[]>(), right: new Map<string, number[]>() };
  const names = Object.keys(source.attributes);
  for (const name of names) {
    sides.left.set(name, []);
    sides.right.set(name, []);
  }
  const position = source.getAttribute("position");
  for (let first = 0; first < position.count; first += 3) {
    const middle = position.getX(first) + position.getX(first + 1) + position.getX(first + 2);
    const side = middle < 0 ? sides.left : sides.right;
    for (const name of names) {
      const attribute = source.getAttribute(name);
      const values = side.get(name)!;
      for (let vertex = first; vertex < first + 3; vertex++) {
        for (let component = 0; component < attribute.itemSize; component++) {
          values.push(attribute.getComponent(vertex, component));
        }
      }
    }
  }
  const build = (side: Map<string, number[]>) => {
    const half = new BufferGeometry();
    for (const name of names) {
      half.setAttribute(name, new Float32BufferAttribute(side.get(name)!, source.getAttribute(name).itemSize));
    }
    return half;
  };
  const halves = { left: build(sides.left), right: build(sides.right) };
  if (source !== geometry) source.dispose();
  return halves;
}
