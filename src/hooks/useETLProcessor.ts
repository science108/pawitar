import { useState, useCallback, useRef } from 'react';
import type { ProcessingProgress, ProcessingResult, WorkerMessage, WorkerResponse } from '../types';

export function useETLProcessor() {
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const process = useCallback((templateText: string, rtfText: string) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress({ phase: 'parsing', current: 0, total: 1, message: 'Uruchamianie...' });

    // Terminate previous worker if any
    workerRef.current?.terminate();

    const worker = new Worker(
      new URL('../workers/etlWorker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        setProgress(msg.data);
      } else if (msg.type === 'result') {
        setResult(msg.data);
        setIsProcessing(false);
        setProgress(null);
        worker.terminate();
      } else if (msg.type === 'error') {
        setError(msg.message);
        setIsProcessing(false);
        setProgress(null);
        worker.terminate();
      }
    };

    worker.onerror = (event) => {
      setError(`Worker error: ${event.message}`);
      setIsProcessing(false);
      setProgress(null);
    };

    worker.postMessage({
      type: 'start',
      templateText,
      rtfText,
    } satisfies WorkerMessage);
  }, []);

  const reprocessWithSelection = useCallback((
    templateText: string,
    rtfText: string,
    enabledDiffs: number[],
  ) => {
    setIsProcessing(true);
    setError(null);
    setProgress({ phase: 'patching', current: 0, total: 1, message: 'Przetwarzanie...' });

    workerRef.current?.terminate();

    const worker = new Worker(
      new URL('../workers/etlWorker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        setProgress(msg.data);
      } else if (msg.type === 'result') {
        setResult(msg.data);
        setIsProcessing(false);
        setProgress(null);
        worker.terminate();
      } else if (msg.type === 'error') {
        setError(msg.message);
        setIsProcessing(false);
        setProgress(null);
        worker.terminate();
      }
    };

    worker.postMessage({
      type: 'applySelected',
      templateText,
      rtfText,
      enabledDiffs,
    } satisfies WorkerMessage);
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    setProgress(null);
    setResult(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  return {
    process,
    reprocessWithSelection,
    reset,
    progress,
    result,
    error,
    isProcessing,
  };
}
