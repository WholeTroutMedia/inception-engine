/**
 * @inception/live-animate — NBA Stats Adapter
 *
 * OMNIBUS Vertical: Sports → NBA
 *
 * Polls the NBA Stats API (stats.nba.com) — no auth required.
 * Emits InceptionEvents for live play-by-play actions and player positions.
 *
 * The NBA publishes real-time game data via their public endpoints.
 * Player tracking XY positions come from their SportVU system data.
 *
 * Endpoints used (all public, no key):
 *   Live scoreboard:  https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json
 *   Play-by-play:     https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_{gameId}.json
 *   Box score:        https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{gameId}.json
 */

import { OmnibusAdapter, type OmnibusAdapterConfig } from '../omnibus/adapter.js';
import { makeEvent, type InceptionEvent, type SportsPlayerEvent } from '../types/inception-event.js';

// ─── Court Geometry ─────────────────────────────────────────────────────────
// NBA court: 94ft × 50ft. Normalize to 0-1 space for renderer.
const COURT_WIDTH_FT = 94;
const COURT_HEIGHT_FT = 50;

function normalizeCourt(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(1, x / COURT_WIDTH_FT)),
    y: Math.max(0, Math.min(1, y / COURT_HEIGHT_FT)),
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NbaAdapterConfig extends OmnibusAdapterConfig {
  /** Poll interval in milliseconds (default: 2000) */
  pollIntervalMs?: number;
  /** Specific game ID to follow (default: first live game) */
  gameId?: string;
}

interface NbaScoredEvent {
  actionNumber: string;
  clock: string;
  description: string;
  actionType: string;
  personId?: number;
  playerName?: string;
  playerNameI?: string;
  teamId?: number;
  teamTricode?: string;
  scoreHome?: string;
  scoreAway?: string;
  xLegacy?: number;
  yLegacy?: number;
}

// ─── NBA Stats Adapter ────────────────────────────────────────────────────────

export class NbaAdapter extends OmnibusAdapter {
  private readonly pollIntervalMs: number;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private currentGameId: string | null;
  private lastActionNumber = -1;

  constructor(config: NbaAdapterConfig = {} as NbaAdapterConfig) {
    super({
      maxFps: 5,           // NBA data updates ~1-2s, no need to hammer
      autoReconnect: true,
      ...config,
      vertical: 'sports',   // Always sports — cannot be overridden
    });
    this.pollIntervalMs = config.pollIntervalMs ?? 2500;
    this.currentGameId = config.gameId ?? null;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  protected async connect(): Promise<void> {
    console.log('[nba-adapter] 🏀 Connecting to NBA Stats API (no auth required)...');

    if (!this.currentGameId) {
      this.currentGameId = await this.fetchLiveGameId();
      if (!this.currentGameId) {
        console.log('[nba-adapter] 📅 No live games found. Will retry...');
      } else {
        console.log(`[nba-adapter] 🎮 Following game: ${this.currentGameId}`);
      }
    }

    this.pollTimer = setInterval(() => this.poll(), this.pollIntervalMs);
    await this.poll(); // Immediate first poll
  }

  protected async disconnect(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ─── Polling ───────────────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    try {
      if (!this.currentGameId) {
        // Try to find a live game
        this.currentGameId = await this.fetchLiveGameId();
        return;
      }
      await this.fetchPlayByPlay(this.currentGameId);
    } catch (err) {
      await this.handleError(err as Error);
    }
  }

  private async fetchLiveGameId(): Promise<string | null> {
    const res = await fetch(
      'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json',
      { headers: { 'User-Agent': 'CreativeLiberationEngine/1.0 (+https://github.com/Creative Liberation Engine Community)' } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { scoreboard?: { games?: Array<{ gameId: string; gameStatus: number }> } };
    const games = data?.scoreboard?.games ?? [];
    // gameStatus: 1=pre, 2=live, 3=final
    const live = games.find(g => g.gameStatus === 2);
    return live?.gameId ?? null;
  }

  private async fetchPlayByPlay(gameId: string): Promise<void> {
    const res = await fetch(
      `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`,
      { headers: { 'User-Agent': 'CreativeLiberationEngine/1.0 (+https://github.com/Creative Liberation Engine Community)' } }
    );
    if (!res.ok) return;

    const data = await res.json() as { game?: { actions?: NbaScoredEvent[] } };
    const actions = data?.game?.actions ?? [];

    // Only process new actions since last poll
    const newActions = actions.filter(
      a => parseInt(a.actionNumber) > this.lastActionNumber
    );

    for (const action of newActions) {
      this.lastActionNumber = Math.max(
        this.lastActionNumber,
        parseInt(action.actionNumber)
      );
      const event = this.mapActionToEvent(action, gameId);
      if (event) this.emitEvent(event);
    }
  }

  // ─── Mapping ───────────────────────────────────────────────────────────────

  private mapActionToEvent(action: NbaScoredEvent, gameId: string): InceptionEvent | null {
    const actionType = this.mapActionType(action.actionType);
    if (!actionType) return null;

    const position = (action.xLegacy !== undefined && action.yLegacy !== undefined)
      ? normalizeCourt(action.xLegacy, action.yLegacy)
      : undefined;

    const scoreHome = action.scoreHome ? parseInt(action.scoreHome) : 0;
    const scoreAway = action.scoreAway ? parseInt(action.scoreAway) : 0;

    const sportsPayload: SportsPlayerEvent = {
      league: 'nba',
      sport: 'basketball',
      gameId,
      period: this.parsePeriod(action.clock),
      clockSeconds: this.parseClockSeconds(action.clock),
      playerId: String(action.personId ?? 'unknown'),
      playerName: action.playerNameI ?? action.playerName ?? 'Unknown',
      teamId: String(action.teamId ?? 'unknown'),
      teamName: action.teamTricode ?? 'UNK',
      action: actionType,
      ballPosition: position,
      score: { home: scoreHome, away: scoreAway },
    };

    return makeEvent({
      vertical: 'sports',
      type: `nba.${actionType}`,
      source: 'nba-stats',
      eventTime: new Date().toISOString(),
      normalizedPosition: position ? { x: position.x, y: position.y } : undefined,
      entityId: String(action.personId ?? 'ball'),
      entityName: action.playerNameI ?? action.playerName,
      groupId: String(action.teamId),
      payload: sportsPayload,
    });
  }

  private mapActionType(nbaType: string): SportsPlayerEvent['action'] | null {
    const map: Record<string, SportsPlayerEvent['action']> = {
      '2pt': 'shot',
      '3pt': 'shot',
      'freethrow': 'shot',
      'rebound': 'possession',
      'foul': 'foul',
      'steal': 'possession',
      'block': 'tackle',
      'turnover': 'possession',
      'substitution': 'substitution',
      'timeout': 'timeout',
      'jumpball': 'possession',
    };
    const normalized = nbaType.toLowerCase().replace(/\s+/g, '');
    for (const [key, val] of Object.entries(map)) {
      if (normalized.includes(key)) return val;
    }
    return 'other';
  }

  private parsePeriod(clock: string): string {
    // NBA clock format: "PT12M34.00S"
    return clock || 'unknown';
  }

  private parseClockSeconds(clock: string): number {
    // Parse ISO 8601 duration: PT12M34.00S
    const match = clock?.match(/PT(\d+)M([\d.]+)S/);
    if (!match) return 0;
    return parseInt(match[1]) * 60 + parseFloat(match[2]);
  }
}
