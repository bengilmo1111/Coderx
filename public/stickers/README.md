# Sticker art (optional)

The sticker wall is the prize. Henry said what motivates him is levels and
collecting, and right now the collection is nineteen emoji on a wall — which is a
weaker reward than nineteen things somebody drew for him. This is the single
biggest remaining art win in the app.

## Dropping art in

Same contract as the cast: put a PNG in this folder named after the sticker id
and it appears. Anything missing keeps its emoji, so **you can draw one at a
time** and nothing ever looks half-finished. No manifest, no code change.

```
public/stickers/sniff-badge.png   →  Sniff's Badge
public/stickers/dragon-scale.png  →  Dragon Scale
```

## Specs

- **Square**, 256x256. Drawn at 48px on the wall and 44px in the reward pop-up,
  so detail below that is wasted weight.
- **Transparent PNG.** They sit on cream paper cards.
- Under ~40KB each. There are nineteen; the whole set wants to stay smaller than
  the cast.
- These are **stickers**, so the house look is a thick pale outline around the
  shape — like something peeled off a sheet — rather than a picture in a frame.
  Slightly wonky and hand-cut beats neat.

## Style

Same as the cast: Dav Pilkey meets Aaron Blabey, on the gilmore.games palette.

> Children's comic sticker, thick uneven black outlines with a white sticker
> border, flat bright colour with no gradients, slightly wonky hand-drawn feel,
> plain white background, no text.

Palette to stay inside: sky `#6ec5e9`, hill green `#67b85a`, sun `#ffd166`,
red `#e84a5f`, purple `#8e5ccb`, orange `#f28c45`, ink `#15314b`.

## The nineteen

| File | Now | Name | What it is |
|---|---|---|---|
| `sniff-badge.png` | 🎖️ | **Sniff's Badge** | Slightly chewed. He is very sorry. |
| `street-sign.png` | 🪧 | **Kea Street Sign** | Stolen by a kea within the hour. |
| `kea-feather.png` | 🪶 | **Kea Feather** | Left behind at the scene. On purpose. |
| `weka-mugshot.png` | 📸 | **Weka Mugshot** | He is holding a chip packet. He says it is not his. |
| `nan-wanted-poster.png` | 📜 | **WANTED: Nan McSnap** | Armed with a thermos. Considered delightful. |
| `bin-day-medal.png` | 🥇 | **Bin Day Medal** | Kea Street is spotless. For about ten minutes. |
| `typing-trophy.png` | ⌨️ | **Typing Trophy** | You typed real code with your own fingers. |
| `first-sword.png` | 🗡️ | **First Sword** | Slightly blunt. Enormously exciting. |
| `kea-recruited.png` | 🦜 | **Kea, Recruited** | Takes orders now. Under protest. |
| `named-number.png` | 🏷️ | **A Number With a Name** | You told the computer to remember something. |
| `sword-tally.png` | 🧮 | **Sword Tally** | You counted things nobody had counted for you. |
| `dragon-scale.png` | 🐲 | **Dragon Scale** | Still slightly warm. |
| `dragon-slayer.png` | 🏅 | **Dragon Sorter-Outer** | The dragon is fine. It just needed a lie down. |
| `first-cog.png` | ⚙️ | **First Cog** | Found by counting. Column 3, row 2. |
| `drill-mode.png` | 🪛 | **Drill Mode** | Walls are a suggestion. |
| `jet-mode.png` | 🚀 | **Jet Mode** | The floor is optional. |
| `nested-loop.png` | 🌀 | **A Loop Inside a Loop** | Most grown-ups find this hard. |
| `own-command.png` | 🏗️ | **Your Own Command** | You invented a word and the computer learned it. |
| `rebuilt.png` | 🤖 | **Fully Rebuilt** | Now only 12% toaster. |

## Also worth drawing, in priority order

1. **The five rank badges** (`progress/xp.ts`). They sit in the header on every
   screen, so they are seen more often than any sticker: Rookie, Sidekick,
   Agent, Chief, Legend. Currently paw print, bone, sunglasses, medal, trophy.
   These would need the same drop-in support adding — ask and it is ten minutes.
2. **A coderX wordmark.** The home screen sign currently says the HQ name under
   a laptop emoji, and the card on gilmore.games uses two emoji. A proper
   hand-lettered coderX logo would serve both.
3. **Club card stamps** (`curriculum/bridgeCards.ts`, nine of them). Lower
   value — those cards are mostly text and the text is the point.
