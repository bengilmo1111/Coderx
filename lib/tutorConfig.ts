/**
 * Tutor configuration, read defensively from the environment.
 *
 * A hosting dashboard will happily store a variable with an empty value, and
 * `??` does not catch that — it only falls back on undefined. That bit us in
 * production: an empty TUTOR_MODEL sent `model: ""` to OpenRouter, and an empty
 * TUTOR_DAILY_CALL_CAP became Number('') === 0, so the daily cap was reached on
 * the first request of every day. Bolt was silently using handwritten hints
 * while reporting himself configured.
 *
 * Blank now means "unset", exactly like absent.
 */

export const DEFAULT_MODEL = 'anthropic/claude-haiku-4.5';
export const DEFAULT_DAILY_CAP = 200;

export function envText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function envCount(value: string | undefined, fallback: number): number {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export interface TutorConfig {
  key: string;
  model: string;
  dailyCap: number;
  siteUrl: string;
  siteName: string;
}

export function tutorConfig(): TutorConfig {
  return {
    key: envText(process.env.OPENROUTER_API_KEY, ''),
    model: envText(process.env.TUTOR_MODEL, DEFAULT_MODEL),
    dailyCap: envCount(process.env.TUTOR_DAILY_CALL_CAP, DEFAULT_DAILY_CAP),
    siteUrl: envText(process.env.OPENROUTER_SITE_URL, ''),
    siteName: envText(process.env.OPENROUTER_SITE_NAME, ''),
  };
}
