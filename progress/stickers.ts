/** The collection. Cheap to produce, endlessly motivating, and the reason to come back. */

export interface Sticker {
  id: string;
  name: string;
  glyph: string;
  blurb: string;
}

export const STICKERS: Record<string, Sticker> = {
  'sniff-badge': { id: 'sniff-badge', name: "Sniff's Badge", glyph: '🎖️', blurb: 'Slightly chewed. He is very sorry.' },
  'street-sign': { id: 'street-sign', name: 'Kea Street Sign', glyph: '🪧', blurb: 'Stolen by a kea within the hour.' },
  'kea-feather': { id: 'kea-feather', name: 'Kea Feather', glyph: '🪶', blurb: 'Left behind at the scene. On purpose.' },
  'weka-mugshot': { id: 'weka-mugshot', name: 'Weka Mugshot', glyph: '📸', blurb: 'He is holding a chip packet. He says it is not his.' },
  'nan-wanted-poster': { id: 'nan-wanted-poster', name: 'WANTED: Nan McSnap', glyph: '📜', blurb: 'Armed with a thermos. Considered delightful.' },
  'bin-day-medal': { id: 'bin-day-medal', name: 'Bin Day Medal', glyph: '🥇', blurb: 'Kea Street is spotless. For about ten minutes.' },
  'typing-trophy': { id: 'typing-trophy', name: 'Typing Trophy', glyph: '⌨️', blurb: 'You typed real code with your own fingers.' },

  'first-sword': { id: 'first-sword', name: 'First Sword', glyph: '🗡️', blurb: 'Slightly blunt. Enormously exciting.' },
  'kea-recruited': { id: 'kea-recruited', name: 'Kea, Recruited', glyph: '🦜', blurb: 'Takes orders now. Under protest.' },
  'named-number': { id: 'named-number', name: 'A Number With a Name', glyph: '🏷️', blurb: 'You told the computer to remember something.' },
  'sword-tally': { id: 'sword-tally', name: 'Sword Tally', glyph: '🧮', blurb: 'You counted things nobody had counted for you.' },
  'dragon-scale': { id: 'dragon-scale', name: 'Dragon Scale', glyph: '🐲', blurb: 'Still slightly warm.' },
  'dragon-slayer': { id: 'dragon-slayer', name: 'Dragon Sorter-Outer', glyph: '🏅', blurb: 'The dragon is fine. It just needed a lie down.' },

  'first-cog': { id: 'first-cog', name: 'First Cog', glyph: '⚙️', blurb: 'Found by counting. Column 3, row 2.' },
  'drill-mode': { id: 'drill-mode', name: 'Drill Mode', glyph: '🪛', blurb: 'Walls are a suggestion.' },
  'jet-mode': { id: 'jet-mode', name: 'Jet Mode', glyph: '🚀', blurb: 'The floor is optional.' },
  'nested-loop': { id: 'nested-loop', name: 'A Loop Inside a Loop', glyph: '🌀', blurb: 'Most grown-ups find this hard.' },
  'own-command': { id: 'own-command', name: 'Your Own Command', glyph: '🏗️', blurb: 'You invented a word and the computer learned it.' },
  rebuilt: { id: 'rebuilt', name: 'Fully Rebuilt', glyph: '🤖', blurb: 'Now only 12% toaster.' },
};

export function stickerList(ids: string[]): Sticker[] {
  return ids.map((id) => STICKERS[id]).filter(Boolean);
}
