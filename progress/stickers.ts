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
};

export function stickerList(ids: string[]): Sticker[] {
  return ids.map((id) => STICKERS[id]).filter(Boolean);
}
