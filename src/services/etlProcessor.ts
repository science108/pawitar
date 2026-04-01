import type { SectionDiff, ProcessingResult, ProcessingProgress } from '../types';
import { parseTemplate, groupIntoVerseSections, isTextBlock } from './templateParser';
import { parseRtf, groupRtfIntoSections } from './rtfParser';
import { matchSections } from './sectionMatcher';
import { diffWords, hasChanges } from './diffEngine';
import { applyPatch } from './patchEngine';

type ProgressCallback = (progress: ProcessingProgress) => void;

export async function processETL(
  templateText: string,
  rtfText: string,
  onProgress?: ProgressCallback,
  enabledDiffIndices?: number[],
): Promise<ProcessingResult> {
  // Phase 1: Parse template
  onProgress?.({
    phase: 'parsing',
    current: 0,
    total: 2,
    message: 'Parsowanie szablonu technicznego...',
  });
  const templateBlocks = parseTemplate(templateText);
  const templateSections = groupIntoVerseSections(templateBlocks);

  await yieldToMain();

  // Phase 2: Parse RTF
  onProgress?.({
    phase: 'parsing',
    current: 1,
    total: 2,
    message: 'Parsowanie pliku RTF...',
  });
  const rtfParagraphs = parseRtf(rtfText);
  const rtfSections = groupRtfIntoSections(rtfParagraphs);

  await yieldToMain();

  // Phase 3: Match sections
  onProgress?.({
    phase: 'matching',
    current: 0,
    total: 1,
    message: 'Dopasowywanie sekcji...',
  });
  const matchedPairs = matchSections(templateSections, rtfSections);

  await yieldToMain();

  // Phase 4: Diff each matched pair
  const diffs: SectionDiff[] = [];
  let totalWords = 0;
  let changedWords = 0;

  for (let i = 0; i < matchedPairs.length; i++) {
    if (i % 5 === 0) {
      onProgress?.({
        phase: 'diffing',
        current: i,
        total: matchedPairs.length,
        message: `Porównywanie sekcji ${i + 1}/${matchedPairs.length}...`,
      });
      await yieldToMain();
    }

    const { block, rtfText: correctedText } = matchedPairs[i];
    const oldText = block.pureText;
    const correctedTextClean = correctedText.replace(/\[[^\]]*\]/g, '');

    if (hasChanges(oldText, correctedTextClean)) {
      const operations = diffWords(oldText, correctedTextClean);

      const verseSection = templateSections.find(s =>
        s.blocks.includes(block)
      );

      diffs.push({
        verseId: verseSection?.id ?? 'unknown',
        verseLabel: verseSection?.label ?? 'Nieznany',
        sectionType: block.tag,
        blockIndex: templateBlocks.indexOf(block),
        oldText,
        newText: correctedText,
        operations,
        enabled: true,
      });

      for (const op of operations) {
        totalWords += op.words.length;
        if (op.type !== 'keep') changedWords += op.words.length;
      }
    } else {
      totalWords += oldText.split(/\s+/).length;
    }
  }

  await yieldToMain();

  // Phase 5: Apply patches
  onProgress?.({
    phase: 'patching',
    current: 0,
    total: diffs.length,
    message: 'Nanoszenie zmian...',
  });

  const activeDiffs = enabledDiffIndices
    ? diffs.filter((_, i) => enabledDiffIndices.includes(i))
    : diffs.filter(d => d.enabled);

  // Build set of block indices to patch
  const patchMap = new Map<number, DiffPatch>();
  for (const diff of activeDiffs) {
    patchMap.set(diff.blockIndex, {
      operations: diff.operations,
    });
  }

  // Reconstruct the output
  const outputLines: string[] = [];
  for (let i = 0; i < templateBlocks.length; i++) {
    const block = templateBlocks[i];
    const patch = patchMap.get(i);

    if (patch && isTextBlock(block.tag)) {
      const patchedLines = applyPatch(block.rawLines, patch.operations);
      outputLines.push(...patchedLines);
    } else {
      outputLines.push(...block.rawLines);
    }
  }

  onProgress?.({
    phase: 'done',
    current: 1,
    total: 1,
    message: 'Gotowe!',
  });

  return {
    output: outputLines.join('\n'),
    diffs,
    stats: {
      totalSections: matchedPairs.length,
      changedSections: diffs.length,
      totalWords,
      changedWords,
    },
  };
}

interface DiffPatch {
  operations: import('../types').DiffOperation[];
}

function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}
