import { ReplayGameClient, type MatchRecording } from "@/game/application/replayGameClient";
import { MatchStore } from "./matchStore";

/** A beat between replayed moves, once the last one's animation is over. */
const REPLAY_PAUSE_MS = 450;

export interface Replay {
  store: MatchStore;
  stop: () => void;
}

/** Watches a recorded match again: a spectator store fed one command each time the previous one has played out. */
export function startReplay(recording: MatchRecording): Replay {
  const client = new ReplayGameClient(recording);
  const store = new MatchStore(client, undefined, { spectator: true });
  let timer: ReturnType<typeof setTimeout> | null = null;
  const advance = () => {
    const view = store.getSnapshot();
    if (!view || view.isAnimating || client.done || timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      client.step();
    }, REPLAY_PAUSE_MS);
  };
  const unsubscribe = store.subscribe(advance);
  void store.open().then(advance);
  return {
    store,
    stop: () => {
      if (timer !== null) clearTimeout(timer);
      unsubscribe();
      store.close();
    },
  };
}
