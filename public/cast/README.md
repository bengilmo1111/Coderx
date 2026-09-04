# Character art (optional)

coderX draws its cast as emoji by default. That is deliberate — it costs nothing,
loads instantly, and renders on every device. Real artwork is a straight upgrade
that needs no code change.

## Dropping art in

1. Put square PNGs with **transparent backgrounds** in this folder.
2. Create `manifest.json` mapping character keys to paths:

```json
{
  "sniff": "/cast/sniff.png",
  "kea": "/cast/kea.png",
  "weka": "/cast/weka.png",
  "bolt": "/cast/bolt.png",
  "nan": "/cast/nan.png",
  "meatball": "/cast/meatball.png"
}
```

Anything missing from the manifest keeps using its emoji, so you can add the
cast one at a time.

## Specs

- **Square**, 256×256 or 512×512. They are drawn at roughly 0.62 of a grid cell,
  so about 90px on a phone — detail below that is wasted weight.
- **Transparent PNG.** The character sits on grass, path and bin tiles.
- Facing **right**, standing, full body in frame with a little margin. The
  renderer adds its own contact shadow, so don't bake one in.
- Keep each file under ~80KB. Six characters at that size is half a megabyte on
  a phone connection, which is already the biggest asset in the app.

## Style prompt

If you are generating these, the house style is Dav Pilkey meets Aaron Blabey:

> Children's comic book character, thick uneven black outlines, flat bright
> colour with no gradients, slightly wonky hand-drawn feel, simple expressive
> face, full body facing right, plain white background, no shadow, no text.

The cast (`runtime/world.ts` has the canonical descriptions):

| Key | Who |
|---|---|
| `sniff` | An over-earnest police bloodhound who eats the evidence |
| `kea` | A New Zealand alpine parrot who dismantles machinery for fun |
| `weka` | A flightless NZ bird, small-time thief, denies everything |
| `bolt` | A friendly robot that is visibly about 40% toaster |
| `nan` | A tiny elderly master criminal with a thermos |
| `meatball` | A sentient meatball. Allegiance unclear |

One caution worth keeping: whatever you generate becomes what Henry pictures
when he thinks about coding. Warm and daft beats slick.
