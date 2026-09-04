# The memory loop (Build 2)

**Status:** design note, not built. Depends on Supabase, which arrives with
cross-device sync in Build 2.

## What it's for

Right now coderX adapts to Henry in exactly one way: hint escalation. Everything
else — the order of levels, their difficulty, the jokes, what Bolt says — is the
same for him as it would be for any child.

The memory loop closes that gap. coderX watches what he does, keeps a profile of
what he likes, avoids, finds easy and finds hard, and feeds that back into two
places: **what the game gives him next**, and **what Bolt already knows when he
asks for help**.

## The trap, first

A memory that concludes *"Henry is bad at loops"* is the coding club problem
rebuilt inside the thing meant to fix it. A stored label is far stickier than a
bad afternoon, and it will quietly shape every hint he gets for months.

Four rules keep this a memory rather than a verdict:

1. **Store observations, not character.** `struggled_with: code.loops, 3 attempts,
   2026-09-04` — never `weak_at_loops: true`. Judgements get derived at read
   time, from evidence that can age out.
2. **Decay everything.** Evidence older than about six weeks weighs close to
   nothing. An 8-year-old changes fast, and the profile has to be able to be
   wrong about him in his favour.
3. **Asymmetric thresholds.** Two good sessions should promote him; two bad ones
   should not demote him. Drifting slightly too easy is a much cheaper error
   than confirming he can't do it.
4. **Never show him the profile.** Not as a "your strengths" screen, not as a
   levelling badge. He sees capers. The profile is for the game and his dad.

## What we already capture for free

Build 1 records more than it currently uses. All of it is already in
`progress/types.ts`:

| Signal | What it tells us |
|---|---|
| `mastery[skill].attempts` / `.successes` | Where he is fluent and where he grinds |
| `levels[id].attempts`, `.hintsUsed` | Which levels cost him, and how much help |
| `levels[id].bestSize` | Whether he goes back to make things tidier — a strong engagement signal |
| `typedLines` | Readiness to move off tapping toward real typing |
| `sessions[day]` | When he actually plays, and for how long |
| `streak` | Rhythm, and whether a gap is a blip or a drift |

## What's worth adding

The interesting signals are the ones he gives without being asked:

- **Which bricks he reaches for first**, and which he ignores even when they'd help.
- **Whether he presses "Make it sillier"** — the single best proxy for *enjoying*
  this rather than completing it.
- **Words he picks in the `say` word bank**, and words he types himself. This is
  a direct read on his interests, in his own vocabulary.
- **Replays of finished levels.** Nobody replays a level they didn't like.
- **Time-to-first-hint.** Falling fast means the level is over-pitched; never
  asking might mean it's too easy, or that asking feels costly.
- **Where he abandons.** The level he closes without finishing matters more than
  the one he finishes slowly.
- **Time of day and session length**, so pacing can suit a tired Tuesday
  differently from a Saturday morning.

## Schema sketch

```sql
-- Append-only. The raw record of what happened.
create table observations (
  id           bigserial primary key,
  profile_id   uuid not null references profiles(id) on delete cascade,
  at           timestamptz not null default now(),
  nz_day       date not null,                -- Pacific/Auckland, as everywhere else
  kind         text not null,                -- 'level_attempt' | 'hint' | 'dare' | 'replay' | 'word_chosen' | 'abandon'
  level_id     text,
  skill_ids    text[],
  payload      jsonb not null default '{}'
);

-- Derived, rewritten by the rollup. Safe to delete and rebuild at any time.
create table learner_profile (
  profile_id     uuid primary key references profiles(id) on delete cascade,
  updated_at     timestamptz not null default now(),
  skill_state    jsonb not null default '{}',  -- skill -> { confidence, evidence_count, last_seen }
  interests      jsonb not null default '{}',  -- topic -> weight, from word/brick/replay choices
  pacing         jsonb not null default '{}',  -- typical session length, best time of day
  typing_ramp    int  not null default 0,      -- how far toward the keyboard he has come
  notes_for_bolt text                          -- <=280 chars, regenerated, injected into the tutor prompt
);
```

`learner_profile` being fully derivable from `observations` is the important
property: if the model of him goes wrong, delete the row and rebuild.

RLS as everywhere else — a profile row is readable only by that child's account
and the parent account above it.

## The two loops

**Fast (every session, in-process).** Read `learner_profile`, drop
`notes_for_bolt` into the tutor system prompt, and pick the next level. Costs one
query. No AI involved.

The tutor prompt gains a short block:

```
WHAT YOU KNOW ABOUT HIM (do not mention any of this to him):
Solid on: sequences, parameters. Still landing: loops — 3 attempts on the last
loop level, got there without help. Likes: making things bark. Has started
typing lines himself. Prefers short sessions after school.
```

That's the whole win. Bolt stops giving a stranger's hint.

**Slow (nightly, or on session end).** Roll up recent observations into
`learner_profile` with the decay and asymmetry above. Start with plain
arithmetic — weighted counts, no model. Only reach for an LLM to write
`notes_for_bolt`, and even then keep the numbers authoritative. A model that
freely writes its own opinion of a child into durable storage is exactly what
rule 1 forbids.

## What it should actually change

1. **Bolt's hints** — the fast loop above. Highest value, lowest effort.
2. **Difficulty of the next level** — pick the variant pitched at where he is,
   rather than a fixed ladder. Needs levels to be parameterised first.
3. **Content he'll like** — if the word bank says dinosaurs and the replays say
   he loves the chaotic ones, later chapters lean that way.
4. **Pacing** — if his sessions are eleven minutes, a chapter should have a
   natural stopping point at about ten.
5. **The parent view** — "he's ready for typing", "he's replayed level 4 three
   times, he likes that one", "loops needed three goes but he got there alone".

## Privacy

This is a behavioural profile of a child, and it should be treated as such.

- Everything under his profile row; delete the profile, it all goes.
- **A visible wipe control in `/grownups`** — rebuild the model from scratch, or
  erase the observations entirely.
- Never send raw observation history to the tutor. Only the derived
  `notes_for_bolt` summary goes into a prompt, and it is capped and inspectable.
- Free text he wrote in `say()` is his. Use it for interest signals in
  aggregate; don't store it verbatim any longer than it takes to extract those,
  and never echo it back to him through Bolt.

## Build order

1. Supabase, profiles, emoji password, sync — this can't start before that.
2. Write `observations` from the events Build 1 already produces. Change nothing
   about the game. Just watch, for a couple of weeks.
3. Build the rollup and the parent-facing read. **Check it against what Ben
   already knows about his own son** — if the profile disagrees with the parent,
   the profile is wrong, and that's the cheapest possible time to find out.
4. Only then wire `notes_for_bolt` into the tutor prompt.
5. Adaptive level selection last, once there is enough evidence to trust it.

Step 3 is the one to not skip. A memory that quietly models him wrong is worse
than no memory at all.
