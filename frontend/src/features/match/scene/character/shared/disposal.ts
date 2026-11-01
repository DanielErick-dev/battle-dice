import { useEffect } from "react";

export interface Disposable {
  dispose(): void;
}

type DisposableGroup =
  | readonly (Disposable | readonly Disposable[])[]
  | Readonly<Record<string, Disposable | readonly Disposable[]>>;

/** Frees a memoized GPU resource when it's replaced or the component unmounts; returns it for chaining. */
export function useDisposable<T extends Disposable>(resource: T): T {
  useEffect(() => () => resource.dispose(), [resource]);
  return resource;
}

/** Frees every resource of a memoized group (an array or an object, arrays inside it included). */
export function useDisposables(group: DisposableGroup): void {
  useEffect(() => () => disposeAll(group), [group]);
}

export function disposeAll(group: DisposableGroup): void {
  for (const item of Object.values(group)) {
    if (isList(item)) item.forEach((resource) => resource.dispose());
    else item.dispose();
  }
}

function isList(item: Disposable | readonly Disposable[]): item is readonly Disposable[] {
  return Array.isArray(item);
}
