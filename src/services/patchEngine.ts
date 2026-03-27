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

  // Re-wrap lines to approximately the original line width
  const rewrapped = rewrapContent(prefix + result, getLineWidth(rawLines));

  return rewrapped.split('\n');
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
        // Check if it's a soft hyphen followed by newline (word continuation)
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
  const re = /<(?:[^>]+)>/g;
  while ((match = re.exec(text)) !== null) {
    codes.push(match[0]);
  }
  return codes.join('');
}

function getLineWidth(lines: string[]): number {
  if (lines.length === 0) return 72;
  // Measure the longest line (excluding the first line which has the tag prefix)
  let maxLen = 0;
  for (const line of lines) {
    const stripped = line.replace(/<[^>]+>/g, '').replace(/^@[\w-]+\s*=\s*/, '');
    if (stripped.length > maxLen) maxLen = stripped.length;
  }
  return Math.max(maxLen, 60);
}

function rewrapContent(text: string, targetWidth: number): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const visibleLen = line.replace(/<[^>]+>/g, '').length;

    if (visibleLen <= targetWidth + 5) {
      result.push(line);
    } else {
      // Line is too long, need to wrap
      const wrapped = wrapLine(line, targetWidth);
      result.push(...wrapped);
    }
  }

  return result.join('\n');
}

function wrapLine(line: string, targetWidth: number): string[] {
  const results: string[] = [];
  let current = '';
  let currentVisible = 0;

  const parts = line.split(/(\s+|<[^>]+>)/);

  for (const part of parts) {
    if (part.match(/^<[^>]+>$/)) {
      current += part;
      continue;
    }

    const partVisible = part.replace(/<[^>]+>/g, '').length;

    if (currentVisible + partVisible > targetWidth && currentVisible > 0 && part.trim()) {
      // Find a good break point in the last word
      const lastWord = part.trim();
      if (lastWord.length > 3) {
        // Break the word with <->
        const breakAt = Math.max(2, lastWord.length - 3);
        current += lastWord.substring(0, breakAt) + '<->';
        results.push(current);
        current = lastWord.substring(breakAt);
        currentVisible = current.replace(/<[^>]+>/g, '').length;
      } else {
        results.push(current.trimEnd());
        current = part;
        currentVisible = partVisible;
      }
    } else {
      current += part;
      currentVisible += partVisible;
    }
  }

  if (current) {
    results.push(current);
  }

  return results;
}
