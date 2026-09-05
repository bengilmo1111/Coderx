/**
 * Environment variables, read defensively.
 *
 * A hosting dashboard will happily store a variable with an empty value, and
 * `??` does not catch that — it only falls back on undefined. That bit us in
 * production once already: an empty TUTOR_MODEL sent `model: ""` to OpenRouter
 * and an empty cap became 0, which silently disabled the AI tutor while it
 * reported itself configured. Blank means "unset", exactly like absent.
 */

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
