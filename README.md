# coderX

A coding tutor built for one specific 8-year-old.

Henry is 8, lives in New Zealand, and wants to code. Coding club at school uses
Scratch in a group setting where speed is visible, and he has decided he is
behind. **The problem isn't Scratch — it's the race.**

So coderX is built to do three things at once:

1. Make progress feel **private and inevitable** rather than competitive.
2. Give him something the other kids can't do — he writes **real text code** —
   so he arrives at club with an edge instead of a deficit.
3. **Convert** those private wins into club confidence, with Club Cards that
   name the Scratch block he now understands from the inside.

And a fourth thing, hidden from him: reinforce **maths and reading** without
either word ever appearing on his screen.

---

## The two decisions everything else follows from

### 1. Tap-first, but the output is real code

Henry types with two fingers and half his sessions will be on a phone. So he
**taps** bricks from a bar in the thumb zone, and fills the gaps with a number
wheel, a direction pad or a word bank. What appears on screen is genuine code
text:

```
repeat 5 {
  if rubbishHere(sniff) {
    grab(sniff)
    drop(sniff)
  }
  move(sniff, right, 2)
}
```

He never types a bracket, so a syntax error is structurally impossible from
tapping. **Type-It-Yourself** is the ramp off that: typing a line by hand earns
bonus XP and a Typing Trophy, so learning the keyboard is a reward he chooses
rather than a tax he pays.

### 2. Our own interpreter, not eval'd JavaScript

`lang/` is a small JS-shaped language with a **generator-based step
interpreter**. That buys things real JS can't:

- The running line is highlighted as it executes, with play / pause / **step** /
  slow-motion. Watching the pointer crawl through a loop *is* the mental model.
- Errors are Bolt the robot talking — *"you told me to repeat, but you forgot the
  {squiggly gate}"* — never `SyntaxError: unexpected token`.
- A runaway loop hits a step budget instead of freezing the family computer.

Execution produces **immutable frame snapshots** rather than mutating live, so
step, pause, scrub and replay fall out for free, and a run that ends in an error
keeps its frames — watching Sniff walk cheerfully into the fence is most of the
lesson.

---

## Where the maths and reading actually live

Not in a module. In the mechanics. Henry never sees the word "maths".

| Level | What he sees | What he's practising |
|---|---|---|
| 3 | Cross six squares with a repeat | `repeat 3` × `move 2` — the 3× table |
| 4 | rubbish, bin, rubbish, bin | Skip counting in 2s |
| 5 | Some squares are empty | True/false reasoning |
| 6 | Give Sniff a line to say | Writing dialogue with an audience |

Every level declares the skills it exercises (`curriculum/skills.ts`), progress
tracks **mastery per skill**, and `/grownups` turns that into a sentence a parent
can use. That taxonomy is also the extension point: adding maths or reading
*challenge types* later means adding rows there, not building a second app.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm test             # 59 unit tests
npm run test:e2e     # Playwright, at 390x844 and 1440x900
npm run test:all
```

The most important test is in `tests/levels.test.ts`: **every level is executed
against its own reference solution**, so an unsolvable level cannot ship to a
child who already thinks he is bad at this. The most important e2e test
completes a level **entirely by tapping** at phone size — if that ever fails,
the central design constraint is broken.

## Configuration

Copy `.env.example` to `.env.local`. Everything is optional — with no
configuration at all the app runs fully, using each level's handwritten hints.

| Variable | What it does |
|---|---|
| `OPENROUTER_API_KEY` | Turns on Bolt's AI tutoring. Server-side only. |
| `TUTOR_MODEL` | Defaults to `anthropic/claude-haiku-4.5`. |
| `TUTOR_DAILY_CALL_CAP` | Seatbelt against a runaway loop. Default 200. |
| `GROWNUP_PIN` | PIN for `/grownups`. Default `1234` — change it. |

**Bolt never goes silent on a stuck child.** Missing key, API error, timeout,
cap reached, dead network — every path falls through to the level's handwritten
hint ladder. coderX must never look broken because a third party is.

### Cost

A hint is one small request: a fixed system prompt, his current code, and a
reply capped at 120 tokens. At Haiku pricing that lands around **$0.001 per
hint**, so the default cap of 200 calls a day is roughly **20-30 cents** — well
inside a $3 daily limit at OpenRouter, with a lot of headroom for a child who
gets unusually stuck.

Two backstops sit under that, and they are independent:

- `TUTOR_DAILY_CALL_CAP` in the app. Best-effort only — serverless instances
  don't share the counter, so treat it as a seatbelt against a runaway loop
  rather than a billing control.
- **The daily limit on the OpenRouter key itself**, which is the real one. When
  it is reached OpenRouter returns an error, and the route falls through to the
  handwritten hints exactly as it does for any other failure. Henry notices
  nothing.

Identical requests are cached in-process, so repeatedly tapping "I'm stuck" on
unchanged code costs nothing after the first.

He talks to Bolt through four fixed buttons, not a chat box: *I'm stuck*, *Why
did it break?*, *Make it sillier*, *What did I learn?*. That's a safety decision
(an 8-year-old and an open conversation are a different product) and a cost one.
"Make it sillier" is the important one — it's the only button that invites him
*past* the level rather than through it.

### Bolt is grounded, not guessing

Before asking for a hint, the route **runs his actual code against the actual
level** and hands the result to the model: whether it already solves it, how
much rubbish is binned, where Sniff finished, any error. It also gets the board
layout, the commands that exist in this level, and the level's own handwritten
hint ladder to paraphrase.

This isn't polish. Given only a level title, the model confidently told Henry
that a *correct* solution had "only covered three squares" and suggested moving
down on a board one row tall. Owning the interpreter means we can just tell it
the truth, which leaves the model doing the part it's good at — voice and
personalisation — while the content stays right by construction. When the
simulation says the code already works, the hint ladder is dropped entirely,
because every rung assumes he's stuck and following one would tell a child his
correct answer is wrong.

### Checking it's actually on

`GET /api/tutor` reports whether a key is present, the model in use after
defaults, the daily cap, hints used today, and the commit being served. The
`/grownups` view shows it as a Setup line. This exists because the route
degrades silently by design — and on the first deploy it earned its keep
immediately: blank values for `TUTOR_MODEL` and `TUTOR_DAILY_CALL_CAP` in the
dashboard had disabled the AI tutor entirely while it reported itself
configured (`??` doesn't fall back on `""`, and `Number('')` is `0`).

## Sync

Henry uses a shared family computer and his dad's phone. Without sync those are
two separate games — different XP, different stickers, a different streak — and
the collection he came back for splits in two.

**Local-first, permanently.** `localStorage` is the source of truth while he is
playing; the server is a place the truth also ends up. He plays on a phone in
bed on bad wifi, so nothing ever waits on the network and every failure is
silent and retried on the next load. With no database configured at all, the
whole app runs exactly as before and `/grownups` says sync is off.

**Merge, never last-write-wins.** Progress is monotonic — XP only goes up,
stickers are only collected, a finished level never un-finishes — so when two
devices disagree the answer is "take the best of both". Last-write-wins would
mean a Saturday on the computer erasing Friday night's stickers from the phone.
`progress/merge.ts` is pure, commutative and idempotent, and the push merges
**server-side** too, so a device offline all week cannot roll back the other one.

**Four taps to sign in.** No email, no password, no keyboard: four emoji from a
set of twelve, then the device remembers him. About 20,000 combinations — a
guard against a sibling rather than an attacker, which is the right amount of
security for a sticker collection.

### Schema changes

`supabase/migrations/` is applied by the Supabase GitHub integration on push to
`main`, so migrations must use the `<timestamp>_name.sql` prefix the CLI expects
and should be written idempotently.

### Environment

| Variable | What it does |
|---|---|
| `SUPABASE_URL` | Project URL. Absent means sync is simply off. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Bypasses row-level security.** Server-only, never committed. |
| `SESSION_SECRET` | Signs the session cookie. Blank means nobody is ever signed in. |
| `CRON_SECRET` | Guards the keep-alive route. |

RLS is on for every table with **no policies at all**, which is deliberate: all
access goes through server routes holding the service-role key, so a leaked
anon key reads nothing. Supabase's linter flags this as INFO; it is the intended
posture, not an oversight.

Free-tier projects sleep after about a week idle, so `vercel.json` schedules
`/api/keepalive` daily — Vercel's Hobby plan restricts cron frequency, and daily
leaves margin that a weekly job running late would not. `/grownups` reports when
sync last succeeded, so a failure is visible rather than silent.

## Deploying

Vercel, as planned — the tutor route is exactly what its serverless functions
are for, and the free tier covers one child comfortably.

The repo is the deploy path. `main` carries the app, so:

1. In the Vercel dashboard, **Add New → Project**, and import
   `bengilmo1111/Coderx`.
2. Take every default. It is a stock Next.js App Router project — no build
   settings to change, and no `vercel.json` needed.
3. Add the environment variables above under **Settings → Environment
   Variables**. `OPENROUTER_API_KEY` and `GROWNUP_PIN` are the two that matter;
   set them for Production and Preview both.
4. Redeploy once after adding them — env vars are read at request time for the
   tutor route, but a fresh deploy avoids any doubt.

After that, pushing to `main` deploys, and any other branch gets a preview URL —
which is a good way to try a new chapter before it reaches Henry.

No database is needed yet: progress lives in `localStorage` behind the single
interface in `progress/store.ts`.

---

## New Zealand specifics

- NZ spelling throughout, including in the language itself (`colour`, not `color`).
- Year levels, not US grades. Pitched at about Year 4.
- Half the cast is endemic: a kea that dismantles machinery for fun, a weka that
  steals the evidence. They render as emoji until real artwork is dropped in —
  see [`public/cast/README.md`](public/cast/README.md), which needs no code
  change.
- **Streak day boundaries are `Pacific/Auckland`, never UTC.** A UTC boundary
  would roll his streak over at about 1pm on a school day and silently break it.
  There's a regression test for this, and one for the NZDT changeover.

Streaks are deliberately forgiving: the flame dims but never shows a zero,
freezes are spent silently, and there is no scolding message anywhere. A broken
streak must not become one more thing he is failing at.

---

## What's next

Cross-device sync is **built** — see above. What is recorded but not yet used
is the **memory loop** — see [`docs/memory-loop.md`](docs/memory-loop.md).
coderX watches what he likes, avoids, finds easy and finds hard, and feeds that
back into what the game offers next and what Bolt already knows before he asks.
The design note leads with the trap, because a stored conclusion that "he's bad
at loops" would rebuild the coding club problem inside the thing meant to fix
it.

**Build 3** — Free Play using everything he's collected (a collection he can't
play with is a dead collection), a share link for when *he* chooses to show
someone, Chapters 2–3 for variables and his own functions, and the first
non-coding challenge types riding the skill taxonomy.

## What to watch in his first session

- **Does he use Type-It-Yourself unprompted?** If yes, ramp toward real syntax
  faster than planned. If no, the bonus XP is too small — raise it rather than
  pushing him.
- **Does he press "Make it sillier"?** That button is the acceleration engine.
- **Does he replay a finished level just to watch it?** Then the world is doing
  its job and Chapter 2 can be more ambitious.
