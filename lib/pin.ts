/**
 * The emoji password.
 *
 * Four emoji from a set of twelve is about 20,000 combinations. That is a guard
 * against a sibling, not against an attacker, and it should never be described
 * as more than that — it is proportionate to what it protects, which is one
 * child's sticker collection. What it buys instead is enormous: an 8-year-old
 * with no email address can sign in on a second device in four taps.
 */

export const PIN_EMOJI = ['🍕', '🚀', '🐶', '🦜', '⚽️', '🍌', '🤖', '🐉', '🧀', '🎸', '🦖', '🍦'] as const;

export const PIN_LENGTH = 4;

/** The stored form: indexes, so we never depend on emoji byte encoding. */
export function pinToCode(pin: string[]): string {
  return pin.map((e) => PIN_EMOJI.indexOf(e as (typeof PIN_EMOJI)[number])).join('-');
}

export function isValidPin(pin: unknown): pin is string[] {
  return (
    Array.isArray(pin) &&
    pin.length === PIN_LENGTH &&
    pin.every((e) => PIN_EMOJI.includes(e as (typeof PIN_EMOJI)[number]))
  );
}
