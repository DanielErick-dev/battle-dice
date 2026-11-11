import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from "three";

/** A piece's mesh from the pack, its node's placement (and quantization) baked into plain float geometry. */
export function bakedPiece(node: Object3D | undefined): { geometry: BufferGeometry; material: Material } | null {
  let mesh: Mesh | undefined;
  node?.traverse((child) => {
    if (!mesh && (child as Mesh).isMesh) mesh = child as Mesh;
  });
  if (!mesh || !node) return null;
  node.updateMatrixWorld(true);
  const source = mesh.geometry;
  const geometry = new BufferGeometry();
  for (const name of ["position", "normal", "uv"] as const) {
    const attribute = source.getAttribute(name);
    if (!attribute) continue;
    const values = new Float32Array(attribute.count * attribute.itemSize);
    for (let index = 0; index < attribute.count; index++) {
      for (let part = 0; part < attribute.itemSize; part++) {
        values[index * attribute.itemSize + part] = attribute.getComponent(index, part);
      }
    }
    geometry.setAttribute(name, new Float32BufferAttribute(values, attribute.itemSize));
  }
  if (source.index) geometry.setIndex(Array.from(source.index.array));
  // Relative to the pack's root, which sits at the origin.
  geometry.applyMatrix4(mesh.matrixWorld);
  return { geometry, material: mesh.material as Material };
}

/** A copy of the material with its colour multiplied by `tint`. */
export function tinted(material: Material, tint: string): Material {
  const copy = material.clone() as MeshStandardMaterial;
  copy.color?.multiply(new Color(tint));
  return copy;
}
