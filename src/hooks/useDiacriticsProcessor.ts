import { useCallback, useRef, useState } from 'react';
import { extractPdfText } from '../services/pdfParser';
import type {
  DiacriticsProgress,
  DiacriticsResult,
  DiacriticsWorkerResponse,
} from '../diacriticsTypes';

export interface DiacriticsProcessorState {
  processing: boolean;
  progress: DiacriticsProgress | null;
  result: DiacriticsResult | null;
  error: string | null;
}

export function useDiacriticsProcessor() {
  const [state, setState] = useState<DiacriticsProcessorState>({
    processing: false,
    progress: null,
    result: null,
    error: null,
  });

  const workerRef = useRef<Worker | null>(null);

  const process = useCallback(async (enFile: File, plFile: File) => {
    setState({ processing: true, progress: null, result: null, error: null });

    try {
      // Phase 1: extract EN PDF text (main thread, pdfjs-dist uses its own worker)
      setState(s => ({
        ...s,
        progress: { phase: 'pdf_en', percent: 0, message: 'Ekstrakcja tekstu z PDF EN...' },
      }));

      const enText = await extractPdfText(enFile, ({ page, totalPages }) => {
        const pct = Math.round((page / totalPages) * 15);
        setState(s => ({
          ...s,
          progress: {
            phase: 'pdf_en',
            percent: pct,
            message: `PDF EN: strona ${page} / ${totalPages}`,
          },
        }));
      });

      // Phase 2: extract PL PDF text
      setState(s => ({
        ...s,
        progress: { phase: 'pdf_pl', percent: 15, message: 'Ekstrakcja tekstu z PDF PL...' },
      }));

      const plText = await extractPdfText(plFile, ({ page, totalPages }) => {
        const pct = 15 + Math.round((page / totalPages) * 15);
        setState(s => ({
          ...s,
          progress: {
            phase: 'pdf_pl',
            percent: pct,
            message: `PDF PL: strona ${page} / ${totalPages}`,
          },
        }));
      });

      // Phase 3: send to worker for segmentation + comparison
      workerRef.current?.terminate();

      const worker = new Worker(
        new URL('../workers/diacriticsWorker.ts', import.meta.url),
        { type: 'module' },
      );
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<DiacriticsWorkerResponse>) => {
        const msg = e.data;
        if (msg.type === 'progress' && msg.progress) {
          setState(s => ({ ...s, progress: msg.progress! }));
        } else if (msg.type === 'result' && msg.result) {
          setState({ processing: false, progress: null, result: msg.result, error: null });
          worker.terminate();
        } else if (msg.type === 'error') {
          setState({ processing: false, progress: null, result: null, error: msg.error ?? 'Nieznany błąd' });
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        setState({ processing: false, progress: null, result: null, error: err.message });
        worker.terminate();
      };

      worker.postMessage({ type: 'start', enText, plText });
    } catch (err) {
      setState({
        processing: false,
        progress: null,
        result: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setState({ processing: false, progress: null, result: null, error: null });
  }, []);

  return { ...state, process, reset };
}
