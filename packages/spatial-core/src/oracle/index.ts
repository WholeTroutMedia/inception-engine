/**
 * @spatial/core — oracle/index.ts
 * 
 * ORACLE context signal compositor.
 * Framework-agnostic (no React). Works in any JS environment.
 * 
 * @example
 * import { createOracleSignal } from '@spatial/core/oracle';
 * const signal = await createOracleSignal();
 * document.documentElement.setAttribute('data-time', signal.time.phase);
 */

export type TimePhase    = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';
export type WeatherLabel = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';
export type Season       = 'spring' | 'summer' | 'autumn' | 'winter';

export interface OracleSignal {
  time: {
    hour:   number;
    phase:  TimePhase;
    season: Season;
  };
  weather: {
    code:      number;
    label:     WeatherLabel;
    intensity: number;   // 0–1
    tempC?:    number | undefined;
  };
  location: {
    city: string;
    lat:  number;
    lon:  number;
    tz:   string;
  };
  light: {
    lux:    number;
    source: 'sensor' | 'estimated';
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getTimePhase(hour: number): TimePhase {
  if (hour < 6)  return 'night';
  if (hour < 8)  return 'dawn';
  if (hour < 12) return 'morning';
  if (hour < 15) return 'midday';
  if (hour < 18) return 'afternoon';
  if (hour < 21) return 'dusk';
  return 'night';
}

export function getSeason(month: number): Season {
  if (month < 3 || month === 11) return 'winter';
  if (month < 6)                  return 'spring';
  if (month < 9)                  return 'summer';
  return 'autumn';
}

export function wmoToLabel(code: number): { label: WeatherLabel; intensity: number } {
  if (code === 0)  return { label: 'clear',  intensity: 0.0 };
  if (code <= 3)   return { label: 'cloudy', intensity: 0.3 };
  if (code <= 49)  return { label: 'fog',    intensity: 0.5 };
  if (code <= 67)  return { label: 'rain',   intensity: code >= 65 ? 0.9 : 0.5 };
  if (code <= 77)  return { label: 'snow',   intensity: 0.7 };
  if (code <= 82)  return { label: 'rain',   intensity: 0.6 };
  if (code >= 95)  return { label: 'storm',  intensity: 1.0 };
  return { label: 'clear', intensity: 0 };
}

export function estimateLux(hour: number, weather: WeatherLabel): number {
  const base = (hour >= 6 && hour <= 18)
    ? Math.sin(((hour - 6) / 12) * Math.PI) * 50000 : 10;
  const mod: Record<WeatherLabel, number> = {
    clear: 1.0, cloudy: 0.4, rain: 0.25, snow: 0.35, storm: 0.15, fog: 0.20,
  };
  return base * (mod[weather] ?? 1);
}

// ── Core factory ───────────────────────────────────────────────────────────────

export interface OracleOptions {
  /** Skip network geo/weather fetch (use local time only) */
  offline?:     boolean;
  /** Custom fetch implementation (for SSR environments) */
  fetchFn?:     typeof fetch;
  /** Interval in ms for signal refresh (default: 15 minutes) */
  refreshMs?:   number;
}

export async function createOracleSignal(
  opts: OracleOptions = {}
): Promise<OracleSignal> {
  const { offline = false, fetchFn = typeof fetch !== 'undefined' ? fetch : undefined } = opts;

  const now    = new Date();
  const hour   = now.getHours();
  const month  = now.getMonth();
  const phase  = getTimePhase(hour);
  const season = getSeason(month);

  let lat = 0, lon = 0, city = '';
  let weatherCode = 0;
  let tempC: number | undefined;

  if (!offline && fetchFn) {
    try {
      const geo = await fetchFn('https://ipapi.co/json/').then(r => r.json()) as {
        latitude?: number; longitude?: number; city?: string;
      };
      lat  = geo.latitude  ?? 0;
      lon  = geo.longitude ?? 0;
      city = geo.city      ?? '';
    } catch { /* offline */ }

    if (lat !== 0) {
      try {
        const w = await fetchFn(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m&forecast_days=1`
        ).then(r => r.json()) as { current?: { weather_code?: number; temperature_2m?: number } };
        weatherCode = w.current?.weather_code ?? 0;
        tempC       = w.current?.temperature_2m;
      } catch { /* stay clear */ }
    }
  }

  const { label, intensity } = wmoToLabel(weatherCode);
  const lux = estimateLux(hour, label);

  return {
    time:     { hour, phase, season },
    weather:  { code: weatherCode, label, intensity, tempC },
    location: { city, lat, lon, tz: typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC' },
    light:    { lux, source: 'estimated' },
  };
}

// ── DOM integration ────────────────────────────────────────────────────────────

/**
 * Applies oracle signal to HTML element via data-attributes.
 * Drives aurora.css token system automatically.
 */
export function applyOracleToDOM(
  signal: OracleSignal,
  el: HTMLElement = document.documentElement
): void {
  el.setAttribute('data-time',    signal.time.phase);
  el.setAttribute('data-weather', signal.weather.label);
  el.setAttribute('data-season',  signal.time.season);
}

// ── Watcher ────────────────────────────────────────────────────────────────────

export type OracleWatcher = { stop: () => void };

/**
 * Starts an ORACLE signal watcher that refreshes on interval and updates the DOM.
 * @returns { stop } — call to clean up
 */
export function watchOracle(
  callback: (signal: OracleSignal) => void,
  opts: OracleOptions & { applyToDOM?: boolean; domTarget?: HTMLElement } = {}
): OracleWatcher {
  const { refreshMs = 15 * 60 * 1000, applyToDOM = true, domTarget } = opts;
  let timer: ReturnType<typeof setInterval> | null = null;

  const run = async () => {
    const signal = await createOracleSignal(opts);
    if (applyToDOM && typeof document !== 'undefined') {
      applyOracleToDOM(signal, domTarget);
    }
    callback(signal);
  };

  run(); // immediate first fire
  timer = setInterval(run, refreshMs);

  return { stop: () => { if (timer) clearInterval(timer); } };
}
