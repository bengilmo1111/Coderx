'use client';

import { SPEEDS, type Playback } from '@/lib/usePlayback';

/**
 * Run controls. Step and slow-motion sit next to Run rather than hidden away,
 * because watching the highlighted line crawl through a loop is the lesson,
 * not a debugging afterthought.
 */
export function RunBar({
  playback,
  hasCode,
  onRun,
  onStop,
}: {
  playback: Playback;
  hasCode: boolean;
  onRun: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={!hasCode}
        onClick={playback.playing ? onStop : onRun}
        className={`chunk flex-1 py-3 text-lg ${playback.playing ? 'bg-danger text-white' : 'bg-hill'}`}
      >
        {playback.playing ? '■ Stop' : '▶︎ Run it'}
      </button>
      <button
        type="button"
        disabled={!hasCode}
        onClick={playback.stepOnce}
        title="One statement at a time"
        className="chunk bg-paper px-4"
      >
        ⏭
      </button>
      <select
        value={playback.speed}
        onChange={(e) => playback.setSpeed(Number(e.target.value))}
        className="chunk bg-paper px-2 text-sm"
        aria-label="Speed"
      >
        {SPEEDS.map((s) => (
          <option key={s.label} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
