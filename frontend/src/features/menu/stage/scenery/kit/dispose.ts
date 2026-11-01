import { useEffect } from "react";

/** Anything holding GPU memory: geometries, materials, textures, instanced meshes. */
export interface Disposable {
  dispose(): void;
}

/** A disposable, or arrays and records of them nested any way (a habitat's `materials`, `geometries`). */
export type DisposableTree = Disposable | readonly DisposableTree[] | { readonly [key: string]: DisposableTree };

function isDisposable(tree: DisposableTree): tree is Disposable {
  return typeof (tree as Partial<Disposable>).dispose === "function";
}

export function disposeAll(tree: DisposableTree): void {
  if (isDisposable(tree)) tree.dispose();
  else if (Array.isArray(tree)) tree.forEach(disposeAll);
  else Object.values(tree).forEach(disposeAll);
}

/** Frees everything in `tree` when it's replaced or the component unmounts; pass it straight from a useMemo. */
export function useDisposal(tree: DisposableTree): void {
  useEffect(() => () => disposeAll(tree), [tree]);
}
