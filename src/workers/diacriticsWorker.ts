import { segmentEnglish, segmentPolish } from '../services/verseSegmenter';
import { compareDiacritics } from '../services/diacriticsComparator';
import type { DiacriticsWorkerMessage, DiacriticsWorkerResponse } from '../diacriticsTypes';

function post(msg: DiacriticsWorkerResponse) {
  self.postMessage(msg);
}

self.onmessage = (e: MessageEvent<DiacriticsWorkerMessage>) => {
  const { enText, plText } = e.data;

  try {
    post({
      type: 'progress',
      progress: { phase: 'segmenting', percent: 30, message: 'Segmentacja wersetów EN...' },
    });

    const enSegments = segmentEnglish(enText);

    post({
      type: 'progress',
      progress: { phase: 'segmenting', percent: 50, message: 'Segmentacja wersetów PL...' },
    });

    const plSegments = segmentPolish(plText);

    post({
      type: 'progress',
      progress: {
        phase: 'comparing',
        percent: 70,
        message: `Porównywanie ${enSegments.length} EN / ${plSegments.length} PL wersetów...`,
      },
    });

    const result = compareDiacritics(enSegments, plSegments);

    post({
      type: 'progress',
      progress: { phase: 'done', percent: 100, message: 'Gotowe' },
    });

    post({ type: 'result', result });
  } catch (err) {
    post({
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
