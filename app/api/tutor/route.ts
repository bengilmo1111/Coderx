/**
 * Bolt, the tutor.
 *
 * Four fixed intents, no free-text chat box. That is a safety decision (an
 * 8-year-old and an open conversation are a different product) and a cost one:
 * the request shape is small, cacheable and capped.
 *
 * Two rules hold above everything else:
 *   1. The key is server-side only. It never reaches the browser bundle.
 *   2. Bolt NEVER goes silent on a stuck child. Any failure — no key, a bad
 *      response, a timeout, the cap — falls through to the level's handwritten
 *      hint ladder. coderX must never look broken because a third party is.
 */

import { NextResponse } from 'next/server';
import { getLevel } from '@/curriculum/chapter1/levels';
import { nzDay } from '@/progress/streak';
import { tutorConfig } from '@/lib/tutorConfig';
import { tidyForAChild } from '@/lib/tutorText';

export const runtime = 'nodejs';

const INTENTS = ['stuck', 'broke', 'sillier', 'learned'] as const;
type Intent = (typeof INTENTS)[number];

interface TutorRequest {
  intent: Intent;
  levelId: string;
  code: string;
  error?: string;
  hintsUsed?: number;
}

export interface TutorResponse {
  text: string;
  source: 'written' | 'ai';
}

const TIMEOUT_MS = 8000;
const MAX_CODE_CHARS = 2000;

/** Best-effort per-instance cap. Serverless instances don't share this, which
 *  is fine for one child — it is a seatbelt against a runaway loop, not billing. */
const calls = { day: '', count: 0 };

const cache = new Map<string, string>();

function dailyCapReached(cap: number): boolean {
  const today = nzDay();
  if (calls.day !== today) {
    calls.day = today;
    calls.count = 0;
  }
  if (calls.count >= cap) return true;
  calls.count += 1;
  return false;
}

/** Bolt's voice, and the rules that keep him a tutor rather than an answer key. */
function systemPrompt(level: NonNullable<ReturnType<typeof getLevel>>, intent: Intent, hintsUsed: number) {
  return [
    'You are BOLT: a friendly robot in a comic book who is mostly a toaster.',
    'You are helping one 8-year-old boy in New Zealand learn to code. His name is not known to you; call him "you".',
    '',
    'HARD RULES:',
    '- Reply in at most 30 words. ONE short paragraph, never two. He reads Dog Man, so keep it simple but never babyish.',
    '- Write PLAIN TEXT ONLY. No markdown, no backticks, no asterisks, no code blocks, no bullet points. Your words appear in a speech bubble.',
    '- Ask at most one question. Do not ask a question and then answer it yourself.',
    '- NEVER write out his whole solution. Never give more than ONE line of code, and only at the highest hint level.',
    '- Always mention one specific thing he actually did in his code before you nudge him.',
    '- Use New Zealand spelling (colour, practise, maths).',
    '- No emoji spam: at most one.',
    '- Never mention that he is doing maths or reading. He does not know, and it stays that way.',
    '- If his code contains words he wrote in a speech bubble, do not repeat them back.',
    '- Never scold, never mention being behind, never compare him to anyone.',
    '',
    `THE LEVEL: "${level.title}" — ${level.goalText}`,
    `WHAT IT TEACHES: ${level.skills.join(', ')}`,
    '',
    `HINT LEVEL: ${Math.min(hintsUsed, 2)} of 2. At 0 give the gentlest possible nudge (a question).`,
    'At 1 be more concrete about what to change. At 2 you may show ONE line of code.',
    '',
    intentBrief(intent),
  ].join('\n');
}

function intentBrief(intent: Intent): string {
  switch (intent) {
    case 'stuck':
      return 'HE TAPPED: "I\'m stuck". Nudge him toward the next step. Do not solve it.';
    case 'broke':
      return 'HE TAPPED: "Why did it break?". Explain the error in his own code, in plain words, and what to try.';
    case 'sillier':
      return [
        'HE TAPPED: "Make it sillier".',
        'This is NOT a request for help. Do NOT hint at the goal, mention what is missing, or help him finish the level in any way.',
        'Dare him to add one funny, pointless thing using commands he already has — a bark in the wrong place, a silly line of dialogue, a wildly too-big repeat.',
        'Be playful and specific, and make it sound like a dare he would be daft not to take.',
      ].join(' ');
    case 'learned':
      return 'HE TAPPED: "What did I just learn?". Name the one idea in plain words and why it is useful. Be proud of him.';
  }
}

/** The always-available fallback: the level's own handwritten ladder. */
function writtenHint(levelId: string, intent: Intent, hintsUsed: number, error?: string): string {
  const level = getLevel(levelId);
  if (!level) return "My toaster brain has gone blank. Try running it and see what happens!";

  switch (intent) {
    case 'broke':
      return error ?? "It didn't break — nothing has gone wrong yet. Try running it!";
    case 'sillier':
      return 'Dare you: make Sniff bark in the middle of your loop. Then run it and see how daft it looks.';
    case 'learned':
      return `You just practised: ${level.skills
        .filter((s) => s.startsWith('code.'))
        .map((s) => s.replace('code.', ''))
        .join(' and ')}. That is a real programming idea, and you used it.`;
    case 'stuck':
    default:
      return level.hints[Math.min(hintsUsed, level.hints.length - 1)];
  }
}

/**
 * Is the AI tutor actually wired up?
 *
 * The whole route is built to degrade silently — a missing key or a wrong model
 * slug just means handwritten hints, and nothing looks broken. That is right for
 * Henry and useless for whoever configured it, so the parent view asks here.
 * Reports only whether a key is present and which model is configured; never
 * the key itself.
 */
export async function GET() {
  const config = tutorConfig();
  return NextResponse.json({
    ai: Boolean(config.key),
    // The model actually used, after defaults — never the raw variable, so a
    // blank one can't look like a configured one.
    model: config.model,
    dailyCap: config.dailyCap,
    usedToday: calls.day === nzDay() ? calls.count : 0,
  });
}

export async function POST(request: Request) {
  let body: TutorRequest;
  try {
    body = (await request.json()) as TutorRequest;
  } catch {
    return NextResponse.json({ text: 'I did not catch that. Try again?', source: 'written' } satisfies TutorResponse);
  }

  const intent = INTENTS.includes(body.intent) ? body.intent : 'stuck';
  const hintsUsed = Math.max(0, Math.min(9, Number(body.hintsUsed ?? 0)));
  const level = getLevel(body.levelId);
  const fallback: TutorResponse = {
    text: writtenHint(body.levelId, intent, hintsUsed, body.error),
    source: 'written',
  };

  const config = tutorConfig();
  if (!config.key || !level) return NextResponse.json(fallback);

  const code = String(body.code ?? '').slice(0, MAX_CODE_CHARS);
  const cacheKey = `${body.levelId}|${intent}|${hintsUsed}|${code}|${body.error ?? ''}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json({ text: cached, source: 'ai' } satisfies TutorResponse);

  if (dailyCapReached(config.dailyCap)) return NextResponse.json(fallback);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        ...(config.siteUrl ? { 'HTTP-Referer': config.siteUrl } : {}),
        ...(config.siteName ? { 'X-Title': config.siteName } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 120,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt(level, intent, hintsUsed) },
          {
            role: 'user',
            content: [
              'His code right now:',
              '```',
              code || '(nothing yet)',
              '```',
              body.error ? `The error he got: ${body.error}` : 'It ran without an error.',
            ].join('\n'),
          },
        ],
      }),
    });

    if (!res.ok) return NextResponse.json(fallback);

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return NextResponse.json(fallback);

    const clean = tidyForAChild(text);
    if (!clean) return NextResponse.json(fallback);
    cache.set(cacheKey, clean);
    return NextResponse.json({ text: clean, source: 'ai' } satisfies TutorResponse);
  } catch {
    return NextResponse.json(fallback);
  } finally {
    clearTimeout(timer);
  }
}
