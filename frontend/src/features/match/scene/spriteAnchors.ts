import type { PlayerId } from "@/game/domain/types";

/**
 * Bridges DOM sprites (animated GIFs) with 3D tokens: the DOM layer registers an
 * element per player and the scene moves it every frame, without React re-renders.
 */
export class SpriteAnchors {
  private readonly elements = new Map<PlayerId, HTMLElement>();

  bind = (playerId: PlayerId) => (element: HTMLElement | null) => {
    if (element) this.elements.set(playerId, element);
    else this.elements.delete(playerId);
  };

  get(playerId: PlayerId): HTMLElement | undefined {
    return this.elements.get(playerId);
  }
}
