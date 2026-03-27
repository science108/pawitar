export type SectionType = 'verse' | 'synonyms' | 'translation' | 'purport';

export interface VerseSegment {
  ref: string;
  chapter: number;
  verse: string;
  sections: Partial<Record<SectionType, string>>;
}

export interface CharDiff {
  position: number;
  expected: string;
  actual: string;
}

export type ComparisonStatus = 'zgodny' | 'niezgodny' | 'brak' | 'do_weryfikacji';

export interface TermComparison {
  verseRef: string;
  section: SectionType;
  enTerm: string;
  plTerm: string | null;
  status: ComparisonStatus;
  charDiffs: CharDiff[];
}

export interface DiacriticsProgress {
  phase: 'pdf_en' | 'pdf_pl' | 'segmenting' | 'comparing' | 'done';
  percent: number;
  message: string;
}

export interface DiacriticsResult {
  comparisons: TermComparison[];
  stats: DiacriticsStats;
  enVerseCount: number;
  plVerseCount: number;
  matchedVerseCount: number;
}

export interface DiacriticsStats {
  total: number;
  zgodny: number;
  niezgodny: number;
  brak: number;
  do_weryfikacji: number;
}

export interface DiacriticsWorkerMessage {
  type: 'start';
  enText: string;
  plText: string;
}

export interface DiacriticsWorkerResponse {
  type: 'progress' | 'result' | 'error';
  progress?: DiacriticsProgress;
  result?: DiacriticsResult;
  error?: string;
}
