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

He talks to Bolt through four fixed buttons, not a chat box: *I'm stuck*, *Why
did it break?*, *Make it sillier*, *What did I learn?*. That's a safety decision
(an 8-year-old and an open conversation are a different product) and a cost one.
"Make it sillier" is the important one — it's the only button that invites him
*past* the level rather than through it.

## Deploying

Vercel, as planned — the tutor route is exactly what its serverless functions
are for, and the free tier covers one child comfortably.

```bash
vercel
```

Set the environment variables above in the Vercel project settings. No database
is needed yet: progress lives in `localStorage` behind the single interface in
`progress/store.ts`.

---

## New Zealand specifics

- NZ spelling throughout, including in the language itself (`colour`, not `color`).
- Year levels, not US grades. Pitched at about Year 4.
- Half the cast is endemic: a kea that dismantles machinery for fun, a weka that
  steals the evidence.
- **Streak day boundaries are `Pacific/Auckland`, never UTC.** A UTC boundary
  would roll his streak over at about 1pm on a school day and silently break it.
  There's a regression test for this, and one for the NZDT changeover.

Streaks are deliberately forgiving: the flame dims but never shows a zero,
freezes are spent silently, and there is no scolding message anywhere. A broken
streak must not become one more thing he is failing at.

---

## What's next

**Build 2** — cross-device sync via Supabase with an **emoji password**
(🍕🚀🐶🍕). He uses a shared family computer and a phone, so no device is truly
his and progress has to follow him. `progress/store.ts` is already the single
seam this goes behind.

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
