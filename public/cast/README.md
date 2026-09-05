# Character and item art (optional)

coderX draws everything as emoji by default. That is deliberate — it costs
nothing, loads instantly, and renders on every device. Real artwork is a
straight upgrade that needs no code change.

## Dropping art in

1. Put square PNGs with **transparent backgrounds** in this folder.
2. Create `manifest.json` mapping keys to paths.
3. Anything missing keeps its emoji, so **you can add one piece at a time** and
   nothing ever looks half-finished.

```json
{
  "sniff": "/cast/sniff.png",
  "bolt": "/cast/bolt.png",
  "bolt:drill": "/cast/bolt-drill.png",
  "item:sword": "/cast/sword.png"
}
```

## Specs

- **Square**, 256×256 or 512×512. Drawn at roughly 0.62 of a grid cell — about
  90px on a phone, less on a grid level — so detail below that is wasted weight.
- **Transparent PNG.** Characters sit on grass, path, bin, brick and hole tiles.
- Facing **right**, standing, full body in frame with a little margin. The
  renderer adds its own contact shadow, so don't bake one in.
- Under ~80KB each. There are a lot of keys below; the whole set is the biggest
  asset in the app, and it loads on a phone connection.

## The cast

`runtime/world.ts` (`CHARACTERS`) has the canonical descriptions.

| Key | Who |
|---|---|
| `sniff` | An over-earnest police bloodhound who eats the evidence |
| `kea` | A New Zealand alpine parrot who dismantles machinery for fun |
| `weka` | A flightless NZ bird, small-time thief, denies everything |
| `bolt` | A friendly robot that is visibly about 40% toaster |
| `nan` | A tiny elderly master criminal with a thermos |
| `meatball` | A sentient meatball. Allegiance unclear |
| `dragon` | Enormous, grumpy, reportedly ticklish. Gets a health bar drawn above it |

## Bolt's modes — the best thing to draw

Chapter 3 is the Transformers chapter, and Bolt changes shape. Each mode can
have **its own picture**, which is the single biggest visual win available:
right now a mode is only a small badge in the corner of the sprite.

| Key | What he becomes | Power |
|---|---|---|
| `bolt` | Normal robot, 40% toaster | Walks about |
| `bolt:drill` | A drill | Goes straight through brick walls |
| `bolt:jet` | A jet | Flies over holes in the floor |
| `bolt:magnet` | A magnet | Grabs things from the next square |

They should read as **the same robot, rebuilt** — same colours, same face if you
can manage it, obviously different shape. That recognition is the whole appeal
of a transformer.

## Items

| Key | What it is |
|---|---|
| `item:rubbish` | Street litter — banana skin, drink cup, pizza slice, newspaper |
| `item:sword` | A sword, for Chapter 2's dragon |
| `item:part` | A cog or robot part, for Chapter 3 |

Rubbish currently varies per piece so a messy street looks messy; a single
`item:rubbish` picture replaces all of them, so only do it if one piece of
litter can carry the job.

## Style prompt

The house style is Dav Pilkey meets Aaron Blabey:

> Children's comic book character, thick uneven black outlines, flat bright
> colour with no gradients, slightly wonky hand-drawn feel, simple expressive
> face, full body facing right, plain white background, no shadow, no text.

One caution worth keeping: whatever you generate becomes what Henry pictures
when he thinks about coding. Warm and daft beats slick.

## What is NOT art

Tiles (grass, path, bin, brick wall, hole), the dragon's health bar, the
variables display and the POW bursts are all drawn in code in
`runtime/render.ts`. If those need to look better, that is a code change rather
than an asset.
