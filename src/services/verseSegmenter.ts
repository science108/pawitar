import type { VerseSegment, SectionType } from '../diacriticsTypes';

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const PAGE_MARKER_RE = /^--\s*\d+\s+of\s+\d+\s*--$/;

// EN: "TEXT 4 5 .1" or "TEXTS 4 5 .35 –36"
const EN_VERSE_RE = /^T\s*E\s*X\s*T\s*S?\s+([\d\s]+)\s*\.\s*([\d\s,–\-]+)\s*$/;
// EN section headers (letter-spaced in PDF extraction)
const EN_TRANSLATION_RE = /^T\s*R\s*A\s*N\s*S\s*L\s*A\s*T\s*I\s*O\s*N\s*$/;
const EN_PURPORT_RE = /^P\s*U\s*R\s*P\s*O\s*R\s*T\s*$/;

// PL: "WERSET 1" or "WERSETY 35–36"
const PL_VERSE_RE = /^WERSET(?:Y)?\s+([\d,–\-\s]+)\s*$/;
const PL_PURPORT_RE = /^OBJAŚNIENIE\s*:/;

// Canonical reference in page footers: "10.45.3"
const CANTO_REF_RE = /\b10\.(\d+)\.(\d+)\b/;

const SYNONYM_SEPARATOR = /\s+–\s+/;

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, '');
}

function parseVerseNums(raw: string): string {
  return collapseSpaces(raw).replace(/,/g, '-');
}

// ── EN segmenter ──────────────────────────────────────────

export function segmentEnglish(text: string): VerseSegment[] {
  const lines = text.split('\n');
  const segments: VerseSegment[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    const m = EN_VERSE_RE.exec(line);
    if (!m) { i++; continue; }

    const chapter = parseInt(collapseSpaces(m[1]), 10);
    const verseNum = parseVerseNums(m[2]);
    const ref = `${chapter}.${verseNum}`;
    i++;

    const sections: Partial<Record<SectionType, string>> = {};
    const verseLines: string[] = [];
    const synonymLines: string[] = [];
    const translationLines: string[] = [];
    const purportLines: string[] = [];
    let currentSection: 'verse' | 'synonyms' | 'translation' | 'purport' = 'verse';

    while (i < lines.length) {
      const ln = lines[i].trim();
      if (EN_VERSE_RE.test(ln)) break;
      if (PAGE_MARKER_RE.test(ln)) { i++; continue; }

      if (EN_TRANSLATION_RE.test(ln)) {
        currentSection = 'translation';
        i++;
        continue;
      }
      if (EN_PURPORT_RE.test(ln)) {
        currentSection = 'purport';
        i++;
        continue;
      }

      if (ln === '') { i++; continue; }

      if (currentSection === 'verse' && SYNONYM_SEPARATOR.test(ln)) {
        currentSection = 'synonyms';
      }

      switch (currentSection) {
        case 'verse': verseLines.push(ln); break;
        case 'synonyms': synonymLines.push(ln); break;
        case 'translation': translationLines.push(ln); break;
        case 'purport': purportLines.push(ln); break;
      }
      i++;
    }

    if (verseLines.length) sections.verse = verseLines.join('\n');
    if (synonymLines.length) sections.synonyms = synonymLines.join('\n');
    if (translationLines.length) sections.translation = translationLines.join('\n');
    if (purportLines.length) sections.purport = purportLines.join('\n');

    segments.push({ ref, chapter, verse: verseNum, sections });
  }

  return segments;
}

// ── PL segmenter ──────────────────────────────────────────

export function segmentPolish(text: string): VerseSegment[] {
  const lines = text.split('\n');
  const segments: VerseSegment[] = [];

  let currentChapter = 0;
  // Pre-scan for chapter numbers from canto references
  const chapterByLine = inferChaptersFromFooters(lines);

  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    const m = PL_VERSE_RE.exec(line);
    if (!m) {
      // Try to update chapter from footer refs as we scan
      const refM = CANTO_REF_RE.exec(line);
      if (refM) currentChapter = parseInt(refM[1], 10);
      i++;
      continue;
    }

    const verseNum = parseVerseNums(m[1]);
    // Resolve chapter from footer scan or current tracking
    const chapterFromMap = chapterByLine.get(i);
    if (chapterFromMap) currentChapter = chapterFromMap;
    if (currentChapter === 0) currentChapter = resolveChapterNear(lines, i);

    const ref = `${currentChapter}.${verseNum}`;
    i++;

    const sections: Partial<Record<SectionType, string>> = {};
    const verseLines: string[] = [];
    const synonymLines: string[] = [];
    const translationLines: string[] = [];
    const purportLines: string[] = [];
    let currentSection: 'devanagari' | 'verse' | 'synonyms' | 'translation' | 'purport' = 'devanagari';
    let passedSynonyms = false;

    while (i < lines.length) {
      const ln = lines[i].trim();
      if (PL_VERSE_RE.test(ln)) break;
      if (PAGE_MARKER_RE.test(ln)) { i++; continue; }

      // Update chapter from footer refs
      const refM2 = CANTO_REF_RE.exec(ln);
      if (refM2) currentChapter = parseInt(refM2[1], 10);

      // Skip page footer lines (number + Śrīmad-Bhāgavatam + ref, or ref + title + number)
      if (isPageFooter(ln)) { i++; continue; }

      if (PL_PURPORT_RE.test(ln)) {
        currentSection = 'purport';
        purportLines.push(ln.replace(PL_PURPORT_RE, '').trim());
        i++;
        continue;
      }

      if (ln === '') { i++; continue; }

      // Devanagari -> verse -> synonyms -> translation -> purport
      if (currentSection === 'devanagari') {
        if (DEVANAGARI_RE.test(ln)) { i++; continue; }
        currentSection = 'verse';
      }

      if (currentSection === 'verse' && SYNONYM_SEPARATOR.test(ln)) {
        currentSection = 'synonyms';
      }

      if (currentSection === 'synonyms' && !SYNONYM_SEPARATOR.test(ln) && !passedSynonyms) {
        // Check if previous line was a synonym (continuation lines may not have ` – `)
        if (synonymLines.length > 0 && !looksLikeSynonymContinuation(ln)) {
          passedSynonyms = true;
          currentSection = 'translation';
        }
      }

      switch (currentSection) {
        case 'verse': verseLines.push(ln); break;
        case 'synonyms': synonymLines.push(ln); break;
        case 'translation': translationLines.push(ln); break;
        case 'purport': purportLines.push(ln); break;
      }
      i++;
    }

    if (verseLines.length) sections.verse = verseLines.join('\n');
    if (synonymLines.length) sections.synonyms = synonymLines.join('\n');
    if (translationLines.length) sections.translation = translationLines.join('\n');
    if (purportLines.length) sections.purport = purportLines.join('\n');

    segments.push({ ref, chapter: currentChapter, verse: verseNum, sections });
  }

  return segments;
}

function looksLikeSynonymContinuation(line: string): boolean {
  // Synonym continuation lines often end with a semicolon or contain `–`
  return SYNONYM_SEPARATOR.test(line) || /;\s*$/.test(line) || /–/.test(line);
}

function isPageFooter(line: string): boolean {
  // Pattern: "N <tab> Śrīmad-Bhāgavatam <tab> 10.XX.YY"
  if (/^\d+\s+Śrīmad-Bhāgavatam\s+\d+\.\d+\.\d+/.test(line)) return true;
  // Pattern: "10.XX.YY <tab> Chapter Title <tab> N"
  if (/^\d+\.\d+\.\d+\s+.+\s+\d+$/.test(line)) return true;
  return false;
}

/**
 * Pre-scan lines for canto references (10.XX.YY) and build a
 * map of WERSET line indices to their chapter numbers.
 */
function inferChaptersFromFooters(lines: string[]): Map<number, number> {
  const map = new Map<number, number>();
  let lastChapter = 0;

  for (let i = 0; i < lines.length; i++) {
    const m = CANTO_REF_RE.exec(lines[i]);
    if (m) {
      lastChapter = parseInt(m[1], 10);
    }
    if (PL_VERSE_RE.test(lines[i].trim()) && lastChapter > 0) {
      map.set(i, lastChapter);
    }
  }

  return map;
}

/**
 * Fallback: look around a line index for a canto reference to determine the chapter.
 */
function resolveChapterNear(lines: string[], idx: number): number {
  const searchRange = 100;
  for (let d = 1; d <= searchRange; d++) {
    for (const offset of [idx + d, idx - d]) {
      if (offset >= 0 && offset < lines.length) {
        const m = CANTO_REF_RE.exec(lines[offset]);
        if (m) return parseInt(m[1], 10);
      }
    }
  }
  return 0;
}
