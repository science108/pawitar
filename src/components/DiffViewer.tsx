import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { SectionDiff, DiffOperation } from '../types';

interface Props {
  diffs: SectionDiff[];
  onToggleDiff: (index: number) => void;
}

const TAG_LABELS: Record<string, string> = {
  p: 'Paragraf',
  p1: 'Objaśnienie',
  translation: 'Tłumaczenie',
  synonyms: 'Synonimy',
  'p-jagati': 'Paragraf (jagati)',
  'p-reference-h': 'Referencja',
};

export function DiffViewer({ diffs, onToggleDiff }: Props) {
  const [listOpen, setListOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (diffs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        Brak wykrytych różnic między plikami.
      </div>
    );
  }

  const enabledCount = diffs.filter(d => d.enabled).length;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden">
      <button
        onClick={() => setListOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
      >
        {listOpen
          ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
          : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        }
        <span className="text-sm font-medium text-slate-200">
          Znaleziono {diffs.length} {pluralize(diffs.length, 'zmianę', 'zmiany', 'zmian')}
        </span>
        <span className="ml-auto text-xs text-slate-500">
          {enabledCount} / {diffs.length} zaznaczonych
        </span>
      </button>

      {listOpen && (
        <div className="border-t border-slate-700/50 px-3 py-2 flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
          {diffs.map((diff, idx) => (
            <DiffItem
              key={idx}
              diff={diff}
              index={idx}
              isExpanded={expandedIdx === idx}
              onToggleExpand={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              onToggleEnabled={() => onToggleDiff(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DiffItem({
  diff,
  index,
  isExpanded,
  onToggleExpand,
  onToggleEnabled,
}: {
  diff: SectionDiff;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleEnabled: () => void;
}) {
  return (
    <div className={`rounded-lg border transition-colors ${
      diff.enabled
        ? 'border-amber-500/20 bg-slate-800/50'
        : 'border-slate-700/50 bg-slate-900/30 opacity-60'
    }`}>
      <div className="flex items-center gap-3 px-3 py-2">
        <input
          type="checkbox"
          checked={diff.enabled}
          onChange={onToggleEnabled}
          className="h-4 w-4 rounded border-slate-600 accent-amber-500"
        />

        <button
          onClick={onToggleExpand}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {isExpanded
            ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
          }
          <span className="text-sm font-medium text-slate-200 truncate">
            {diff.verseLabel}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 shrink-0">
            {TAG_LABELS[diff.sectionType] ?? diff.sectionType}
          </span>
        </button>

        <span className="text-xs text-slate-500">#{index + 1}</span>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          <DiffContent operations={diff.operations} />
        </div>
      )}
    </div>
  );
}

function DiffContent({ operations }: { operations: DiffOperation[] }) {
  return (
    <div className="rounded-lg bg-slate-900 p-3 text-sm font-mono leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">
      {operations.map((op, i) => (
        <span key={i}>
          {op.type === 'keep' && (
            <span className="text-slate-400">{op.words.join(' ')} </span>
          )}
          {op.type === 'delete' && (
            <span className="bg-red-500/20 text-red-300 line-through px-0.5 rounded">
              {op.words.join(' ')}
            </span>
          )}
          {op.type === 'insert' && (
            <span className="bg-green-500/20 text-green-300 px-0.5 rounded">
              {op.words.join(' ')}
            </span>
          )}
          {op.type !== 'keep' && ' '}
        </span>
      ))}
    </div>
  );
}

function pluralize(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  if (count >= 2 && count <= 4) return few;
  return many;
}
