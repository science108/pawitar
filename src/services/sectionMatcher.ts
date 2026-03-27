import type { TemplateBlock, VerseSection, RtfSection, RtfParagraph } from '../types';
import { isTextBlock, stripFormattingCodes } from './templateParser';

interface MatchedPair {
  block: TemplateBlock;
  blockIndex: number;
  rtfText: string;
}

/**
 * Within a verse, extract the ordered text blocks from the template
 * and the corresponding RTF paragraphs, then match them sequentially.
 */
export function matchSections(
  templateSections: VerseSection[],
  rtfSections: RtfSection[],
): MatchedPair[] {
  const pairs: MatchedPair[] = [];

  for (const tSection of templateSections) {
    const rSection = rtfSections.find(r => r.id === tSection.id);
    if (!rSection) continue;

    const textBlocks = tSection.blocks
      .map((b, i) => ({ block: b, blockIndex: i }))
      .filter(({ block }) => isTextBlock(block.tag));

    const rtfTexts = extractTextSegments(rSection.paragraphs, textBlocks.map(tb => tb.block));

    for (let i = 0; i < textBlocks.length && i < rtfTexts.length; i++) {
      pairs.push({
        block: textBlocks[i].block,
        blockIndex: textBlocks[i].blockIndex,
        rtfText: rtfTexts[i],
      });
    }
  }

  return pairs;
}

/**
 * Extract text segments from RTF paragraphs that correspond to template text blocks.
 * Uses structural markers to align: synonyms pattern, translation (bold), purport (OBJAŚNIENIE).
 */
function extractTextSegments(
  rtfParas: RtfParagraph[],
  templateBlocks: TemplateBlock[],
): string[] {
  const results: string[] = [];
  let paraIdx = 0;

  for (const block of templateBlocks) {
    const expectedText = block.pureText;

    if (block.tag === 'translation') {
      // Translations in RTF are bold paragraphs
      const found = findBestMatch(rtfParas, paraIdx, expectedText, p => p.isBold);
      if (found !== null) {
        results.push(rtfParas[found].text);
        paraIdx = found + 1;
      } else {
        results.push(expectedText);
      }
    } else if (block.tag === 'synonyms') {
      // Synonyms have the "word – definition;" pattern
      const found = findBestMatch(rtfParas, paraIdx, expectedText, p => p.text.includes(' – '));
      if (found !== null) {
        results.push(rtfParas[found].text);
        paraIdx = found + 1;
      } else {
        results.push(expectedText);
      }
    } else if (block.tag === 'p1') {
      // Purport starts with or contains "OBJAŚNIENIE:"
      const found = findBestMatch(rtfParas, paraIdx, expectedText, p =>
        p.text.includes('OBJAŚNIENIE:') || p.text.startsWith('OBJAŚNIENIE'));
      if (found !== null) {
        results.push(rtfParas[found].text);
        paraIdx = found + 1;
      } else {
        // Purport might be the paragraph right after the translation
        const nextMatch = findBestMatch(rtfParas, paraIdx, expectedText);
        if (nextMatch !== null) {
          results.push(rtfParas[nextMatch].text);
          paraIdx = nextMatch + 1;
        } else {
          results.push(expectedText);
        }
      }
    } else {
      // Generic @p blocks - find by text similarity
      const found = findBestMatch(rtfParas, paraIdx, expectedText);
      if (found !== null) {
        results.push(rtfParas[found].text);
        paraIdx = found + 1;
      } else {
        results.push(expectedText);
      }
    }
  }

  return results;
}

function findBestMatch(
  paras: RtfParagraph[],
  startIdx: number,
  expectedText: string,
  predicate?: (p: RtfParagraph) => boolean,
): number | null {
  const window = Math.min(paras.length, startIdx + 10);
  let bestIdx: number | null = null;
  let bestScore = 0;

  for (let i = startIdx; i < window; i++) {
    if (predicate && !predicate(paras[i])) continue;
    const score = similarity(expectedText, paras[i].text);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestScore > 0.2 ? bestIdx : null;
}

function similarity(a: string, b: string): number {
  const aWords = new Set(a.toLowerCase().split(/\s+/));
  const bWords = new Set(b.toLowerCase().split(/\s+/));
  let common = 0;
  for (const w of aWords) {
    if (bWords.has(w)) common++;
  }
  const total = Math.max(aWords.size, bWords.size);
  return total > 0 ? common / total : 0;
}

/**
 * Re-extract pure text from a template block, stripping formatting codes.
 */
export function getBlockPureText(block: TemplateBlock): string {
  const raw = block.rawLines.join('\n');
  const content = raw.replace(/^@[\w-]+\s*=\s*/, '');
  return stripFormattingCodes(content);
}
