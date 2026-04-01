import type { DiffOperation } from '../types';

interface WordPosition {
  word: string;
  start: number;
  end: number;
}

const TAG_PREFIX_RE = /^@[\w-]+\s*=\s*/;

/**
 * Apply word-level diff operations to the original formatted text of a template block.
 * Preserves all formatting codes while replacing/inserting/deleting words.
 */
export function applyPatch(
  rawLines: string[],
  operations: DiffOperation[],
): string[] {
  const rawText = rawLines.join('\n');

  // Extract the tag prefix
  const tagMatch = rawText.match(TAG_PREFIX_RE);
  const prefix = tagMatch ? tagMatch[0] : '';
  const content = rawText.substring(prefix.length);

  // Build a map of word positions in the content, ignoring formatting codes
  const wordPositions = findWordPositions(content);

  // Walk through diff operations and build the new content
  let result = '';
  let lastEnd = 0;
  let wordIdx = 0;

  for (const op of operations) {
    if (op.type === 'keep') {
      for (const _word of op.words) {
        if (wordIdx < wordPositions.length) {
          const wp = wordPositions[wordIdx];
          // Include any formatting codes between the last position and this word
          result += content.substring(lastEnd, wp.end);
          lastEnd = wp.end;
          wordIdx++;
        }
      }
    } else if (op.type === 'delete') {
      for (let i = 0; i < op.words.length; i++) {
        if (wordIdx < wordPositions.length) {
          const wp = wordPositions[wordIdx];
          const between = content.substring(lastEnd, wp.start);
          const codes = extractFormattingCodes(between);
          if (codes) {
            result += codes;
          }
          lastEnd = wp.end;
          wordIdx++;
        }
      }
    } else if (op.type === 'insert') {
      // Insert new words at current position
      const insertText = op.words.join(' ');
      // Add a space separator if needed
      if (result.length > 0 && !result.endsWith(' ') && !result.endsWith('\n')) {
        result += ' ';
      }
      result += insertText;
    }
  }

  // Append any trailing content (formatting codes after last word)
  if (lastEnd < content.length) {
    result += content.substring(lastEnd);
  }

  return (prefix + result).split('\n');
}

function findWordPositions(content: string): WordPosition[] {
  const positions: WordPosition[] = [];
  let i = 0;

  while (i < content.length) {
    // Skip formatting codes
    const codeMatch = content.substring(i).match(/^<(?:[^>]+)>/);
    if (codeMatch) {
      i += codeMatch[0].length;
      continue;
    }

    // Skip square-bracketed editorial notes (treated like formatting codes)
    const bracketMatch = content.substring(i).match(/^\[[^\]]*\]/);
    if (bracketMatch) {
      i += bracketMatch[0].length;
      continue;
    }

    // Skip whitespace and newlines
    if (/\s/.test(content[i])) {
      i++;
      continue;
    }

    // Found start of a word
    const start = i;
    let word = '';
    while (i < content.length) {
      const codeAtPos = content.substring(i).match(/^<(?:[^>]+)>/);
      if (codeAtPos) {
        if (content.substring(i).startsWith('<~>')) {
          i += 3;
          break;
        }
        if (content.substring(i).startsWith('<->')) {
          const afterHyphen = content.substring(i + 3);
          const nlMatch = afterHyphen.match(/^\s*\n\s*/);
          if (nlMatch) {
            // Word continues on next line - skip the <->\n and continue
            i += 3 + nlMatch[0].length;
            continue;
          }
        }
        // Other formatting code inside word - skip it
        i += codeAtPos[0].length;
        continue;
      }
      if (/\s/.test(content[i])) break;
      word += content[i];
      i++;
    }

    if (word) {
      positions.push({ word, start, end: i });
    }
  }

  return positions;
}

function extractFormattingCodes(text: string): string {
  const codes: string[] = [];
  let match;
  const re = /<(?:[^>]+)>|\[[^\]]*\]/g;
  while ((match = re.exec(text)) !== null) {
    codes.push(match[0]);
  }
  return codes.join('');
}

