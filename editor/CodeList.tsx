'use client';

import { printProgram, type CodeLine } from '@/lang/printer';
import type { Program } from '@/lang/types';
import type { Selection } from './program';

/**
 * The code, as real text he can tap.
 *
 * Everything here is a large touch target: the line itself selects, the values
 * and holes inside it open pickers. Selecting a line is what tells the next
 * brick tap where to go, so the selected line is loudly obvious.
 */
export function CodeList({
  program,
  selection,
  onSelect,
  onTapArg,
  runningStmtId,
  errorStmtId,
}: {
  program: Program;
  selection: Selection | null;
  onSelect: (sel: Selection | null) => void;
  onTapArg: (stmtId: string, index: number | 'count' | 'cond') => void;
  runningStmtId?: string | null;
  errorStmtId?: string | null;
}) {
  const lines = printProgram(program);

  if (lines.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="max-w-xs text-base font-bold opacity-55">
          Nothing here yet. Tap a brick from the bar below to write your first line of code.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-1 p-2 font-[family-name:var(--font-code)] text-[15px] leading-tight sm:text-base">
      {lines.map((line) => (
        <Line
          key={`${line.stmtId}-${line.isCloser ? 'end' : 'start'}`}
          line={line}
          selected={selection?.stmtId === line.stmtId && selection.closer === line.isCloser}
          running={runningStmtId === line.stmtId}
          errored={errorStmtId === line.stmtId}
          onSelect={onSelect}
          onTapArg={onTapArg}
        />
      ))}
    </ol>
  );
}

function Line({
  line,
  selected,
  running,
  errored,
  onSelect,
  onTapArg,
}: {
  line: CodeLine;
  selected: boolean;
  running: boolean;
  errored: boolean;
  onSelect: (sel: Selection | null) => void;
  onTapArg: (stmtId: string, index: number | 'count' | 'cond') => void;
}) {
  return (
    <li
      style={{ marginLeft: line.indent * 20 }}
      className={[
        'flex min-h-[42px] cursor-pointer items-center gap-1 rounded-lg border-2 px-2 py-1',
        selected ? 'border-ink bg-pop/60' : 'border-transparent hover:bg-black/5',
        running ? 'running' : '',
        errored ? 'border-danger bg-danger/10 shake' : '',
      ].join(' ')}
      onClick={() => onSelect(selected ? null : { stmtId: line.stmtId, closer: line.isCloser })}
    >
      <span className="w-5 shrink-0 select-none text-right text-[11px] font-bold opacity-30">
        {line.line}
      </span>
      <span className="flex flex-wrap items-center gap-x-0.5">
        {line.segments.map((seg, i) => {
          if (seg.kind === 'hole') {
            return (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTapArg(seg.argPath.stmtId, seg.argPath.index);
                }}
                className="mx-0.5 rounded-md border-2 border-dashed border-ink bg-pop px-2 py-0.5 text-[13px] font-black"
              >
                {seg.label}
              </button>
            );
          }
          if (seg.kind === 'value') {
            return (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTapArg(seg.argPath.stmtId, seg.argPath.index);
                }}
                className="mx-0.5 rounded-md bg-black/8 px-1.5 py-0.5 font-bold underline decoration-dotted underline-offset-4"
              >
                {seg.text}
              </button>
            );
          }
          const colour =
            seg.kind === 'keyword' ? 'text-amber-700 font-black' : seg.kind === 'command' ? 'text-sky-800 font-black' : 'opacity-60';
          return (
            <span key={i} className={colour}>
              {seg.text}
            </span>
          );
        })}
      </span>
    </li>
  );
}
