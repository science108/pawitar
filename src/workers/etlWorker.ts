import type { WorkerMessage, WorkerResponse, ProcessingProgress } from '../types';
import { processETL } from '../services/etlProcessor';

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  try {
    if (msg.type === 'start') {
      const result = await processETL(
        msg.templateText,
        msg.rtfText,
        (progress: ProcessingProgress) => {
          self.postMessage({ type: 'progress', data: progress } satisfies WorkerResponse);
        },
      );
      self.postMessage({ type: 'result', data: result } satisfies WorkerResponse);
    } else if (msg.type === 'applySelected') {
      const result = await processETL(
        msg.templateText,
        msg.rtfText,
        (progress: ProcessingProgress) => {
          self.postMessage({ type: 'progress', data: progress } satisfies WorkerResponse);
        },
        msg.enabledDiffs,
      );
      self.postMessage({ type: 'result', data: result } satisfies WorkerResponse);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nieznany błąd';
    self.postMessage({ type: 'error', message } satisfies WorkerResponse);
  }
};
