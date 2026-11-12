import { useEffect, useState } from "react";
import { JoinRefusedError, joinPartyOnChannel, type JoinRefusal, type Presence } from "@/game/application/party";

export type RoomPeek =
  { kind: "loading" } | { kind: "ready"; presence: Presence | null } | { kind: "error"; reason: JoinRefusal | null };

/** Looks into a room as a spectator to list its seats; leaves as soon as the phone picks one (unmount). */
export function useRoomPeek(room: string | null, clientId: string, name: string): RoomPeek {
  const [peek, setPeek] = useState<{ room: string | null; value: RoomPeek }>({ room, value: { kind: "loading" } });

  useEffect(() => {
    if (!room) return;
    let live = true;
    const client = joinPartyOnChannel(room, { clientId, role: "spectator", name });
    const stop = client.subscribePresence((presence) => {
      if (live) setPeek({ room, value: { kind: "ready", presence } });
    });
    client.connect().then(
      () => {
        // Presence follows the snapshot, so it may already be in; keep it rather than overwrite with null.
        if (!live) return;
        setPeek((current) =>
          current.room === room && current.value.kind === "ready"
            ? current
            : { room, value: { kind: "ready", presence: client.presence } },
        );
      },
      (error: unknown) => {
        const reason = error instanceof JoinRefusedError ? error.reason : null;
        if (live) setPeek({ room, value: { kind: "error", reason } });
      },
    );
    const leave = () => client.close();
    window.addEventListener("pagehide", leave);
    return () => {
      live = false;
      window.removeEventListener("pagehide", leave);
      stop();
      client.close();
    };
  }, [room, clientId, name]);

  return peek.room === room ? peek.value : { kind: "loading" };
}
