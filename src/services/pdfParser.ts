import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
GlobalWorkerOptions.workerSrc = workerSrc;

export interface PdfExtractionProgress {
  page: number;
  totalPages: number;
}

/**
 * Extract all text from a PDF file, returning one string with lines
 * separated by newlines and pages delimited by `\n-- PAGE N --\n`.
 */
export async function extractPdfText(
  file: File,
  onProgress?: (p: PdfExtractionProgress) => void,
): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const totalPages = pdf.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const lines = buildLinesFromItems(
      content.items.filter((it): it is TextItem => 'str' in it),
    );

    pageTexts.push(`-- ${i} of ${totalPages} --\n${lines.join('\n')}`);

    onProgress?.({ page: i, totalPages });
  }

  return pageTexts.join('\n\n');
}

/**
 * Group TextItems into lines based on their Y-position.
 * Items on the same Y (within tolerance) are concatenated left-to-right.
 */
function buildLinesFromItems(items: TextItem[]): string[] {
  if (items.length === 0) return [];

  const Y_TOLERANCE = 2;

  interface LineBucket {
    y: number;
    items: { x: number; str: string }[];
  }

  const buckets: LineBucket[] = [];

  for (const item of items) {
    const y = item.transform[5];
    const x = item.transform[4];
    let bucket = buckets.find(b => Math.abs(b.y - y) < Y_TOLERANCE);
    if (!bucket) {
      bucket = { y, items: [] };
      buckets.push(bucket);
    }
    bucket.items.push({ x, str: item.str });
  }

  buckets.sort((a, b) => b.y - a.y);

  return buckets.map(bucket => {
    bucket.items.sort((a, b) => a.x - b.x);
    return bucket.items.map(i => i.str).join('');
  });
}
