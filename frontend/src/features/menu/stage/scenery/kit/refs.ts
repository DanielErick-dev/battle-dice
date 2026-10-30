import { useCallback, useRef, type RefObject } from "react";

/** Refs to a list of rendered objects, filled by `bind(index)` and read in useFrame. */
export function useRefList<T>(): [RefObject<(T | null)[]>, (index: number) => (item: T | null) => void] {
  const list = useRef<(T | null)[]>([]);
  const bind = useCallback(
    (index: number) => (item: T | null) => {
      list.current[index] = item;
    },
    [],
  );
  return [list, bind];
}
