'use client';

import Link from 'next/link';
import { BRIDGE_CARDS } from '@/curriculum/bridgeCards';
import { STICKERS } from '@/progress/stickers';
import type { Award } from '@/progress/xp';

/**
 * The payoff screen. Collecting and levelling up is what he said motivates him,
 * so this is deliberately loud — and the Club Card lands here, at the moment he
 * feels good, which is when a link to school is worth making.
 */
export function RewardPanel({
  awards,
  sticker,
  bridgeCard,
  nextHref,
  onReplay,
}: {
  awards: Award[];
  sticker?: string;
  bridgeCard?: string;
  nextHref?: string;
  onReplay: () => void;
}) {
  const total = awards.reduce((n, a) => n + a.xp, 0);
  const card = bridgeCard ? BRIDGE_CARDS[bridgeCard] : undefined;
  const badge = sticker ? STICKERS[sticker] : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="panel pop-in w-full max-w-md p-5">
        <h2 className="title mb-1 text-center text-3xl">Nailed it!</h2>
        <p className="mb-4 text-center text-4xl font-black">+{total} XP</p>

        <ul className="mb-4 space-y-1">
          {awards.map((a) => (
            <li key={a.label} className="flex justify-between border-b border-dashed border-black/15 pb-1 text-sm font-bold">
              <span>{a.label}</span>
              <span className="opacity-60">+{a.xp}</span>
            </li>
          ))}
        </ul>

        {badge && (
          <div className="panel mb-4 flex items-center gap-3 bg-pop/40 p-3">
            <span className="text-4xl">{badge.glyph}</span>
            <div>
              <p className="text-xs font-black uppercase opacity-50">New sticker</p>
              <p className="font-black">{badge.name}</p>
              <p className="text-xs opacity-70">{badge.blurb}</p>
            </div>
          </div>
        )}

        {card && (
          <div className="panel mb-4 bg-sky-100 p-3">
            <p className="title mb-1 text-sm">{card.title}</p>
            <p className="mb-2 text-sm font-bold leading-snug">{card.body}</p>
            <p className="text-xs font-bold opacity-60">
              In Scratch this is: <span className="font-black">{card.scratchBlock}</span>
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onReplay} className="chunk bg-white px-4">
            Again
          </button>
          {nextHref ? (
            <Link href={nextHref} className="chunk flex flex-1 items-center justify-center bg-emerald-400 py-3 text-lg">
              Next caper →
            </Link>
          ) : (
            <Link href="/" className="chunk flex flex-1 items-center justify-center bg-emerald-400 py-3 text-lg">
              Back to HQ
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
