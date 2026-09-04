/**
 * Cleaning Bolt's replies before they reach a speech bubble.
 *
 * Bolt speaks in a comic panel, not a terminal. Models reach for markdown
 * however firmly you ask them not to, and an 8-year-old reading stray backticks
 * and asterisks just sees the app being broken. So the prompt instruction is
 * the belt and this is the braces.
 *
 * Code fences are unwrapped rather than deleted, because at the top hint level
 * Bolt is allowed to show one line of code.
 */

export const MAX_REPLY_CHARS = 240;

export function tidyForAChild(text: string): string {
  let out = text
    .replace(/```[a-zA-Z]*\r?\n?([\s\S]*?)```/g, '$1')
    .replace(/[`*_#>]/g, '')
    .replace(/\s*\r?\n+\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  if (out.length > MAX_REPLY_CHARS) {
    // Trim at a sentence end where we can, rather than mid-word.
    const cut = out.slice(0, MAX_REPLY_CHARS);
    const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    out = lastStop > 80 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}…`;
  }
  return out;
}
