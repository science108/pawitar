export interface TemplateBlock {
  tag: string;
  rawLines: string[];
  pureText: string;
  lineIndex: number;
}

export interface VerseSection {
  id: string;
  label: string;
  blocks: TemplateBlock[];
}

export interface RtfSection {
  id: string;
  label: string;
  paragraphs: RtfParagraph[];
}

export interface RtfParagraph {
  text: string;
  isBold: boolean;
}

export interface DiffOperation {
  type: 'keep' | 'insert' | 'delete';
  words: string[];
}

export interface SectionDiff {
  verseId: string;
  verseLabel: string;
  sectionType: string;
  blockIndex: number;
  oldText: string;
  newText: string;
  operations: DiffOperation[];
  enabled: boolean;
}

export interface ProcessingProgress {
  phase: 'parsing' | 'matching' | 'diffing' | 'patching' | 'done';
  current: number;
  total: number;
  message: string;
}

export interface ProcessingResult {
  output: string;
  diffs: SectionDiff[];
  stats: {
    totalSections: number;
    changedSections: number;
    totalWords: number;
    changedWords: number;
  };
}

export type WorkerMessage =
  | { type: 'start'; templateText: string; rtfText: string }
  | { type: 'applySelected'; templateText: string; rtfText: string; enabledDiffs: number[] };

export type WorkerResponse =
  | { type: 'progress'; data: ProcessingProgress }
  | { type: 'result'; data: ProcessingResult }
  | { type: 'error'; message: string };
