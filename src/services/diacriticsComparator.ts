import type {
  VerseSegment,
  SectionType,
  TermComparison,
  ComparisonStatus,
  CharDiff,
  DiacriticsResult,
  DiacriticsStats,
} from '../diacriticsTypes';

const IAST_CHARS = 'āīūṛṝḷḹṭḍṇśṣñṅṁḥĀĪŪṚṜḶḸṬḌṆŚṢÑṄṀḤ';
const IAST_RE = new RegExp(`[${IAST_CHARS}]`);

// Maps diacritical characters to their "simplified" ASCII equivalents
const DIACRITIC_TO_BASE: Record<string, string> = {
  'ā': 'a', 'ī': 'i', 'ū': 'u', 'ṛ': 'r', 'ṝ': 'r', 'ḷ': 'l', 'ḹ': 'l',
  'ṭ': 't', 'ḍ': 'd', 'ṇ': 'n', 'ś': 's', 'ṣ': 's', 'ñ': 'n', 'ṅ': 'n',
  'ṁ': 'm', 'ḥ': 'h',
  'Ā': 'A', 'Ī': 'I', 'Ū': 'U', 'Ṛ': 'R', 'Ṝ': 'R', 'Ḷ': 'L', 'Ḹ': 'L',
  'Ṭ': 'T', 'Ḍ': 'D', 'Ṇ': 'N', 'Ś': 'S', 'Ṣ': 'S', 'Ñ': 'N', 'Ṅ': 'N',
  'Ṁ': 'M', 'Ḥ': 'H',
};

function stripDiacritics(s: string): string {
  return [...s].map(c => DIACRITIC_TO_BASE[c] ?? c).join('');
}

function isSanskritTerm(word: string): boolean {
  return IAST_RE.test(word);
}

/** Tokenize text into words, keeping only non-empty tokens */
function tokenize(text: string): string[] {
  return text.split(/[\s;,.:()\[\]"'«»„"]+/).filter(w => w.length > 0);
}

function extractSanskritTerms(text: string): string[] {
  return tokenize(text).filter(isSanskritTerm);
}

/**
 * Align two ordered lists of Sanskrit terms using a simple LCS-like approach.
 * Returns pairs of (enIdx | null, plIdx | null).
 */
function alignTerms(
  enTerms: string[],
  plTerms: string[],
): Array<[number | null, number | null]> {
  const n = enTerms.length;
  const m = plTerms.length;

  // Build LCS table based on base-form equality
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (termsMatch(enTerms[i - 1], plTerms[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to get alignment
  const pairs: Array<[number | null, number | null]> = [];
  let i = n, j = m;
  const matchedEn = new Set<number>();
  const matchedPl = new Set<number>();
  const matched: Array<[number, number]> = [];

  while (i > 0 && j > 0) {
    if (termsMatch(enTerms[i - 1], plTerms[j - 1])) {
      matched.unshift([i - 1, j - 1]);
      matchedEn.add(i - 1);
      matchedPl.add(j - 1);
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  // Merge matched and unmatched into ordered pairs
  let ei = 0, pi = 0, mi = 0;
  while (ei < n || pi < m) {
    if (mi < matched.length) {
      const [me, mp] = matched[mi];
      // Emit unmatched EN before this match
      while (ei < me) { pairs.push([ei, null]); ei++; }
      // Emit unmatched PL before this match
      while (pi < mp) { pairs.push([null, pi]); pi++; }
      pairs.push([me, mp]);
      ei = me + 1;
      pi = mp + 1;
      mi++;
    } else {
      if (ei < n) { pairs.push([ei, null]); ei++; }
      if (pi < m) { pairs.push([null, pi]); pi++; }
    }
  }

  return pairs;
}

/** Check if two terms are the "same word" ignoring diacritics differences */
function termsMatch(a: string, b: string): boolean {
  return stripDiacritics(a).toLowerCase() === stripDiacritics(b).toLowerCase();
}

function computeCharDiffs(expected: string, actual: string): CharDiff[] {
  const diffs: CharDiff[] = [];
  const maxLen = Math.max(expected.length, actual.length);

  for (let i = 0; i < maxLen; i++) {
    const e = i < expected.length ? expected[i] : '';
    const a = i < actual.length ? actual[i] : '';
    if (e !== a) {
      diffs.push({ position: i, expected: e, actual: a });
    }
  }

  return diffs;
}

function classifyComparison(
  enTerm: string,
  plTerm: string | null,
): { status: ComparisonStatus; charDiffs: CharDiff[] } {
  if (plTerm === null) {
    return { status: 'brak', charDiffs: [] };
  }

  if (enTerm === plTerm) {
    return { status: 'zgodny', charDiffs: [] };
  }

  const charDiffs = computeCharDiffs(enTerm, plTerm);

  // If base forms match, it's a diacritics difference
  if (termsMatch(enTerm, plTerm)) {
    return { status: 'niezgodny', charDiffs };
  }

  // Base forms don't match -> needs manual verification
  return { status: 'do_weryfikacji', charDiffs };
}

function compareSection(
  verseRef: string,
  section: SectionType,
  enText: string,
  plText: string,
): TermComparison[] {
  const enTerms = extractSanskritTerms(enText);
  const plTerms = extractSanskritTerms(plText);

  if (enTerms.length === 0) return [];

  const alignment = alignTerms(enTerms, plTerms);
  const results: TermComparison[] = [];

  for (const [enIdx, plIdx] of alignment) {
    if (enIdx === null) continue; // extra PL term, not an error from EN perspective
    const enTerm = enTerms[enIdx];
    const plTerm = plIdx !== null ? plTerms[plIdx] : null;
    const { status, charDiffs } = classifyComparison(enTerm, plTerm);

    results.push({ verseRef, section, enTerm, plTerm, status, charDiffs });
  }

  return results;
}

const SECTION_ORDER: SectionType[] = ['verse', 'synonyms', 'translation', 'purport'];

export function compareDiacritics(
  enSegments: VerseSegment[],
  plSegments: VerseSegment[],
): DiacriticsResult {
  const plByRef = new Map<string, VerseSegment>();
  for (const seg of plSegments) {
    plByRef.set(seg.ref, seg);
  }

  const comparisons: TermComparison[] = [];
  let matchedVerseCount = 0;

  for (const enSeg of enSegments) {
    const plSeg = plByRef.get(enSeg.ref);
    if (!plSeg) continue;
    matchedVerseCount++;

    for (const section of SECTION_ORDER) {
      const enText = enSeg.sections[section];
      const plText = plSeg.sections[section];
      if (!enText || !plText) continue;

      const sectionResults = compareSection(enSeg.ref, section, enText, plText);
      comparisons.push(...sectionResults);
    }
  }

  const stats: DiacriticsStats = {
    total: comparisons.length,
    zgodny: 0,
    niezgodny: 0,
    brak: 0,
    do_weryfikacji: 0,
  };
  for (const c of comparisons) {
    stats[c.status]++;
  }

  return {
    comparisons,
    stats,
    enVerseCount: enSegments.length,
    plVerseCount: plSegments.length,
    matchedVerseCount,
  };
}
