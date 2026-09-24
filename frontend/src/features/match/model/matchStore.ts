import type { GameClient, GameUpdate } from "@/game/application/gameClient";
import { GameRuleError, type GameCommand, type GameErrorCode } from "@/game/domain/commands";
import type { Board } from "@/game/domain/types";
import { DEFAULT_TIMINGS, type PlaybackTimings } from "../config";
import { canPlayCard, canRoll, createInitialView, type MatchView } from "./matchView";
import { eventToSteps, syncStep, type PlaybackStep } from "./playback";

const ERROR_MESSAGES: Record<GameErrorCode, string> = {
  NOT_YOUR_TURN: "Não é a sua vez.",
  GAME_FINISHED: "A partida já terminou.",
  UNKNOWN_PLAYER: "Jogador desconhecido.",
  DISCARD_PENDING: "Escolha uma carta para descartar primeiro.",
  NO_DISCARD_PENDING: "Não há carta para descartar.",
  UNKNOWN_CARD: "Essa carta não está na sua mão.",
  CARD_ALREADY_PLAYED: "Você já usou uma carta neste turno.",
  NOT_ENOUGH_KI: "Ki insuficiente para essa carta.",
  INVALID_TARGET: "Escolha um oponente como alvo.",
  INVALID_VALUE: "Escolha um valor de 1 a 6.",
  NO_PORTAL_AHEAD: "Não há portal à frente.",
};

/**
 * Presentation store: sends commands to the GameClient and replays the resulting
 * events over time so the scene can animate them. Framework-agnostic; React reads
 * it through useSyncExternalStore.
 */
export class MatchStore {
  readonly board: Board;
  private view: MatchView;
  private queue: PlaybackStep[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly client: GameClient,
    private readonly timings: PlaybackTimings = DEFAULT_TIMINGS,
  ) {
    const state = client.getState();
    this.board = state.board;
    this.view = createInitialView(state);
  }

  connect = (): (() => void) => {
    const unsubscribe = this.client.subscribe(this.enqueue);
    return () => {
      unsubscribe();
      this.stopPlayback();
    };
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): MatchView => this.view;

  rollDice = (): void => {
    if (!canRoll(this.view)) return;
    this.dispatch({ type: "rollDice", playerId: this.view.activePlayerId });
  };

  playCard = (cardUid: string, choice: { targetId?: string; value?: number } = {}): void => {
    if (!canPlayCard(this.view)) return;
    this.dispatch({ type: "playCard", playerId: this.view.activePlayerId, cardUid, ...choice });
  };

  discardCard = (cardUid: string): void => {
    const pending = this.view.pendingDiscard;
    if (!pending || this.view.isAnimating) return;
    this.dispatch({ type: "discardCard", playerId: pending.playerId, cardUid });
  };

  restart = (): void => {
    if (this.view.isAnimating) return;
    this.dispatch({ type: "restart" });
  };

  private dispatch(command: GameCommand): void {
    this.setView({ ...this.view, isAnimating: true, error: null });
    this.client.send(command).catch((error: unknown) => {
      const message =
        error instanceof GameRuleError ? ERROR_MESSAGES[error.code] : "Falha ao enviar a jogada.";
      this.setView({ ...this.view, isAnimating: false, error: message });
    });
  }

  private enqueue = ({ state, events }: GameUpdate): void => {
    this.queue.push(...events.flatMap((event) => eventToSteps(event, this.timings)), syncStep(state));
    if (this.timer === null) this.runNextStep();
  };

  private runNextStep = (): void => {
    const step = this.queue.shift();
    if (!step) {
      this.timer = null;
      this.setView({ ...this.view, isAnimating: false });
      return;
    }
    this.setView(step.apply({ ...this.view, isAnimating: true }));
    this.timer = setTimeout(this.runNextStep, step.durationMs);
  };

  private stopPlayback(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.queue = [];
  }

  private setView(view: MatchView): void {
    this.view = view;
    this.listeners.forEach((listener) => listener());
  }
}
