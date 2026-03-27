import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import type { DiacriticsResult, ComparisonStatus, TermComparison } from '../diacriticsTypes';
import { generateCSV, generateTXT, downloadBlob } from '../services/diacriticsReportGenerator';

const STATUS_CONFIG: Record<ComparisonStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  zgodny: { label: 'Zgodny', color: 'text-emerald-400', icon: CheckCircle2 },
  niezgodny: { label: 'Niezgodny', color: 'text-red-400', icon: XCircle },
  brak: { label: 'Brak', color: 'text-amber-400', icon: AlertTriangle },
  do_weryfikacji: { label: 'Do weryfikacji', color: 'text-blue-400', icon: HelpCircle },
};

const SECTION_LABELS: Record<string, string> = {
  verse: 'Werset',
  synonyms: 'Synonimy',
  translation: 'Tłumaczenie',
  purport: 'Objaśnienie',
};

interface Props {
  result: DiacriticsResult;
}

type FilterKey = ComparisonStatus | 'all';

export function DiacriticsReport({ result }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'all') return result.comparisons;
    return result.comparisons.filter(c => c.status === filter);
  }, [result.comparisons, filter]);

  const issuesOnly = useMemo(
    () => result.comparisons.filter(c => c.status !== 'zgodny'),
    [result.comparisons],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Wersetów dopasowanych" value={result.matchedVerseCount} sub={`EN: ${result.enVerseCount} / PL: ${result.plVerseCount}`} />
        <StatCard label="Terminów łącznie" value={result.stats.total} />
        <StatCard label="Zgodnych" value={result.stats.zgodny} accent="text-emerald-400" />
        <StatCard label="Problemów" value={result.stats.niezgodny + result.stats.brak + result.stats.do_weryfikacji} accent="text-red-400" />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label={`Wszystkie (${result.stats.total})`} />
        <FilterChip active={filter === 'niezgodny'} onClick={() => setFilter('niezgodny')} label={`Niezgodne (${result.stats.niezgodny})`} color="text-red-400" />
        <FilterChip active={filter === 'brak'} onClick={() => setFilter('brak')} label={`Brakujące (${result.stats.brak})`} color="text-amber-400" />
        <FilterChip active={filter === 'do_weryfikacji'} onClick={() => setFilter('do_weryfikacji')} label={`Do weryfikacji (${result.stats.do_weryfikacji})`} color="text-blue-400" />
        <FilterChip active={filter === 'zgodny'} onClick={() => setFilter('zgodny')} label={`Zgodne (${result.stats.zgodny})`} color="text-emerald-400" />
      </div>

      {/* Download buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => downloadBlob(generateCSV(result), 'diakrytyki_raport.csv', 'text/csv')}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
        <button
          onClick={() => downloadBlob(generateTXT(result), 'diakrytyki_raport.txt', 'text/plain')}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> TXT
        </button>
        {issuesOnly.length > 0 && (
          <button
            onClick={() => {
              const onlyIssues = { ...result, comparisons: issuesOnly };
              downloadBlob(generateCSV(onlyIssues), 'diakrytyki_problemy.csv', 'text/csv');
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-900/30 text-red-300 hover:bg-red-900/50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Tylko problemy (CSV)
          </button>
        )}
      </div>

      {/* Collapsible results list */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden">
        <button
          onClick={() => setListOpen(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
        >
          {listOpen
            ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
          <span className="text-sm font-medium text-slate-200">
            {filtered.length} {pluralize(filtered.length, 'wynik', 'wyniki', 'wyników')}
          </span>
        </button>

        {listOpen && (
          <div className="border-t border-slate-700/50 max-h-[70vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500 text-center">Brak wyników dla wybranego filtra.</p>
            ) : (
              filtered.map((comp, idx) => (
                <ComparisonRow
                  key={idx}
                  comp={comp}
                  expanded={expandedIdx === idx}
                  onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonRow({ comp, expanded, onToggle }: { comp: TermComparison; expanded: boolean; onToggle: () => void }) {
  const cfg = STATUS_CONFIG[comp.status];
  const Icon = cfg.icon;

  return (
    <div className="border-b border-slate-800/50 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-800/30 transition-colors"
      >
        <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
        <span className="text-xs text-slate-500 font-mono w-16 shrink-0">{comp.verseRef}</span>
        <span className="text-xs text-slate-500 w-24 shrink-0">{SECTION_LABELS[comp.section] ?? comp.section}</span>
        <span className="text-sm text-slate-200 font-mono truncate">{comp.enTerm}</span>
        {comp.plTerm && comp.plTerm !== comp.enTerm && (
          <span className="text-sm text-slate-400 font-mono truncate ml-1">→ {comp.plTerm}</span>
        )}
        <span className={`ml-auto text-xs font-medium ${cfg.color} shrink-0`}>{cfg.label}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 bg-slate-800/20">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 mb-1">Angielski (EN)</p>
              <p className="font-mono text-slate-200">{comp.enTerm}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Polski (PL)</p>
              <p className="font-mono text-slate-200">{comp.plTerm ?? <span className="text-amber-400 italic">brak</span>}</p>
            </div>
          </div>
          {comp.charDiffs.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-1.5">Różnice znaków</p>
              <CharDiffDisplay enTerm={comp.enTerm} plTerm={comp.plTerm ?? ''} charDiffs={comp.charDiffs} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CharDiffDisplay({ enTerm, plTerm, charDiffs }: { enTerm: string; plTerm: string; charDiffs: TermComparison['charDiffs'] }) {
  const diffPositions = new Set(charDiffs.map(d => d.position));

  return (
    <div className="flex flex-col gap-1.5 font-mono text-sm">
      <div className="flex flex-wrap gap-0">
        {[...enTerm].map((ch, i) => (
          <span key={i} className={diffPositions.has(i) ? 'bg-red-500/30 text-red-300 rounded px-0.5' : 'text-slate-300'}>{ch}</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-0">
        {[...plTerm].map((ch, i) => (
          <span key={i} className={diffPositions.has(i) ? 'bg-red-500/30 text-red-300 rounded px-0.5' : 'text-slate-300'}>{ch}</span>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-3">
      <p className={`text-2xl font-bold ${accent ?? 'text-slate-100'}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 rounded-full text-xs font-medium transition-colors
        ${active
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          : `bg-slate-800 ${color ?? 'text-slate-400'} border border-slate-700/50 hover:bg-slate-700`
        }
      `}
    >
      {label}
    </button>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
