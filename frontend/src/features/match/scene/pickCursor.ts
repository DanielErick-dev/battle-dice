/** Whose ability is being placed on the board, which picks the pointer's look. */
export type PickCursor = "seals" | "specters" | "flames";

/** Each placement's glow: the scribe's seals, the warden's apparitions, Kage Rubra's black fire. */
const GLOW: Record<PickCursor, string> = {
  seals: "#e879f9",
  specters: "#7dd3fc",
  flames: "#fb923c",
};

/**
 * An enchanted hand pointing (fingertip at the top left, the hotspot) wreathed in sparks of the
 * placement's colour: over a tile that can be picked, the pointer says "place it here".
 */
function handSvg(glow: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs>
    <filter id="g" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#g)">
    <path d="M7 3.5c1.2 0 2 .9 2 2v8.2l.9-.4c1-.4 2.1 0 2.6.9l.4-.2c1-.4 2.2 0 2.6 1l.3-.1c1-.4 2.1.1 2.5 1.1l1.8 4.6c.9 2.4.2 5.1-1.8 6.7l-1 .8c-1 .8-2.2 1.2-3.5 1.2h-3c-1.7 0-3.3-.8-4.3-2.2L2.3 20.9c-.6-.9-.4-2.1.5-2.7.8-.6 2-.5 2.6.3l-.4-13c0-1.1.9-2 2-2z"
      fill="#1e1b2e" stroke="${glow}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M9.9 13.3v4.2M13.3 14.2v3.6M16.4 15.4v3" stroke="${glow}" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>
  </g>
  <path d="M25 3l.9 2.3 2.3.9-2.3.9L25 9.4l-.9-2.3-2.3-.9 2.3-.9z" fill="${glow}"/>
  <path d="M28 12l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill="#fff"/>
  <path d="M19.5 7l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z" fill="${glow}"/>
</svg>`;
}

/** The CSS cursor for a placement, falling back to the plain pointer where SVG cursors aren't drawn. */
export function pickCursor(kind: PickCursor): string {
  return `url("data:image/svg+xml,${encodeURIComponent(handSvg(GLOW[kind]))}") 7 3, pointer`;
}
