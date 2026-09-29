import { CircleAlert } from "lucide-react";
import type { MatchView } from "../../model/matchView";

/** A refused move, shown for a moment at the top of the arena, clear of the dice and the hand. */
export function ErrorToast({ error }: { error: MatchView["error"] }) {
  if (!error) return null;
  return (
    <p
      key={error.id}
      role="alert"
      className="hud-panel animate-toast pointer-events-none flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-200"
    >
      <CircleAlert className="size-4 shrink-0 text-red-400" />
      {error.message}
    </p>
  );
}
