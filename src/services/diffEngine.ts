import type { DiffOperation } from '../types';

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0);
}

/**
 * Myers diff algorithm (simplified) operating on word arrays.
 * Returns a list of keep/insert/delete operations.
 */
export function diffWords(oldText: string, newText: string): DiffOperation[] {
  const oldWords = tokenize(oldText);
  const newWords = tokenize(newText);

  if (oldWords.join(' ') === newWords.join(' ')) {
    return [{ type: 'keep', words: oldWords }];
  }

  const lcs = computeLCS(oldWords, newWords);
  return buildOperations(oldWords, newWords, lcs);
}

export function hasChanges(oldText: string, newText: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  return norm(oldText) !== norm(newText);
}

function computeLCS(a: string[], b: string[]): boolean[][] {
  const m = a.length;
  const n = b.length;

  // For very large inputs, use a space-efficient approach
  if (m > 5000 || n > 5000) {
    return computeLCSHirschberg(a, b);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find which elements are in LCS
  const inLCS: boolean[][] = Array.from({ length: m }, () => new Array(n).fill(false));
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      inLCS[i - 1][j - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return inLCS;
}

/**
 * For very large inputs, fall back to a simpler greedy matching
 * to avoid O(n*m) memory.
 */
function computeLCSHirschberg(a: string[], b: string[]): boolean[][] {
  const m = a.length;
  const n = b.length;
  const inLCS: boolean[][] = Array.from({ length: m }, () => new Array(n).fill(false));

  const bMap = new Map<string, number[]>();
  for (let j = 0; j < n; j++) {
    const indices = bMap.get(b[j]) ?? [];
    indices.push(j);
    bMap.set(b[j], indices);
  }

  let lastMatchJ = -1;
  for (let i = 0; i < m; i++) {
    const indices = bMap.get(a[i]);
    if (!indices) continue;
    for (const j of indices) {
      if (j > lastMatchJ) {
        inLCS[i][j] = true;
        lastMatchJ = j;
        break;
      }
    }
  }

  return inLCS;
}

function buildOperations(
  oldWords: string[],
  newWords: string[],
  inLCS: boolean[][],
): DiffOperation[] {
  const ops: DiffOperation[] = [];
  let oi = 0, ni = 0;

  function findLCSMatch(fromOi: number): [number, number] | null {
    for (let i = fromOi; i < oldWords.length; i++) {
      for (let j = ni; j < newWords.length; j++) {
        if (inLCS[i]?.[j]) return [i, j];
      }
    }
    return null;
  }

  while (oi < oldWords.length || ni < newWords.length) {
    const match = oi < oldWords.length ? findLCSMatch(oi) : null;

    if (match) {
      const [mi, mj] = match;

      if (oi < mi) {
        ops.push({ type: 'delete', words: oldWords.slice(oi, mi) });
      }
      if (ni < mj) {
        ops.push({ type: 'insert', words: newWords.slice(ni, mj) });
      }

      // Collect consecutive LCS matches
      let endI = mi;
      let endJ = mj;
      while (
        endI < oldWords.length &&
        endJ < newWords.length &&
        inLCS[endI]?.[endJ]
      ) {
        endI++;
        endJ++;
      }

      ops.push({ type: 'keep', words: oldWords.slice(mi, endI) });
      oi = endI;
      ni = endJ;
    } else {
      if (oi < oldWords.length) {
        ops.push({ type: 'delete', words: oldWords.slice(oi) });
      }
      if (ni < newWords.length) {
        ops.push({ type: 'insert', words: newWords.slice(ni) });
      }
      break;
    }
  }

  return ops;
}
