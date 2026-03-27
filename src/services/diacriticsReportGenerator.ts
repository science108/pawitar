import type { DiacriticsResult, TermComparison } from '../diacriticsTypes';

const SECTION_LABELS: Record<string, string> = {
  verse: 'Werset',
  synonyms: 'Synonimy',
  translation: 'Tłumaczenie',
  purport: 'Objaśnienie',
};

const STATUS_LABELS: Record<string, string> = {
  zgodny: 'Zgodny',
  niezgodny: 'Niezgodny',
  brak: 'Brak',
  do_weryfikacji: 'Do weryfikacji',
};

function escapeCSV(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatCharDiff(c: TermComparison): string {
  if (c.charDiffs.length === 0) return '';
  return c.charDiffs
    .map(d => `pos ${d.position}: '${d.expected}' → '${d.actual}'`)
    .join('; ');
}

export function generateCSV(result: DiacriticsResult): string {
  const BOM = '\uFEFF';
  const header = ['Werset', 'Sekcja', 'Termin EN', 'Termin PL', 'Status', 'Różnice znaków'];
  const rows = result.comparisons.map(c => [
    c.verseRef,
    SECTION_LABELS[c.section] ?? c.section,
    c.enTerm,
    c.plTerm ?? '(brak)',
    STATUS_LABELS[c.status] ?? c.status,
    formatCharDiff(c),
  ]);

  const csvLines = [header, ...rows].map(row => row.map(escapeCSV).join(','));
  return BOM + csvLines.join('\r\n');
}

export function generateTXT(result: DiacriticsResult): string {
  const BOM = '\uFEFF';
  const lines: string[] = [];

  lines.push('RAPORT WERYFIKACJI DIAKRYTYKÓW');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Wersetów EN: ${result.enVerseCount}`);
  lines.push(`Wersetów PL: ${result.plVerseCount}`);
  lines.push(`Dopasowanych: ${result.matchedVerseCount}`);
  lines.push('');
  lines.push(`Łącznie terminów: ${result.stats.total}`);
  lines.push(`  Zgodnych: ${result.stats.zgodny}`);
  lines.push(`  Niezgodnych: ${result.stats.niezgodny}`);
  lines.push(`  Brakujących: ${result.stats.brak}`);
  lines.push(`  Do weryfikacji: ${result.stats.do_weryfikacji}`);
  lines.push('');
  lines.push('-'.repeat(60));

  const issues = result.comparisons.filter(c => c.status !== 'zgodny');
  if (issues.length === 0) {
    lines.push('Nie znaleziono żadnych rozbieżności.');
  } else {
    for (const c of issues) {
      lines.push('');
      lines.push(`[${c.verseRef}] ${SECTION_LABELS[c.section] ?? c.section}`);
      lines.push(`  EN: ${c.enTerm}`);
      lines.push(`  PL: ${c.plTerm ?? '(brak)'}`);
      lines.push(`  Status: ${STATUS_LABELS[c.status] ?? c.status}`);
      if (c.charDiffs.length > 0) {
        lines.push(`  Różnice: ${formatCharDiff(c)}`);
      }
    }
  }

  return BOM + lines.join('\n');
}

export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
