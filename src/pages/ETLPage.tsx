import { useState, useCallback } from 'react';
import { Sparkles, RotateCcw, AlertTriangle } from 'lucide-react';
import { FileUploader } from '../components/FileUploader';
import { FilePreview } from '../components/FilePreview';
import { DiffViewer } from '../components/DiffViewer';
import { ResultViewer } from '../components/ResultViewer';
import { ProgressBar } from '../components/ProgressBar';
import { useETLProcessor } from '../hooks/useETLProcessor';
import type { SectionDiff } from '../types';

export function ETLPage() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [rtfFile, setRtfFile] = useState<File | null>(null);
  const [templateText, setTemplateText] = useState('');
  const [rtfText, setRtfText] = useState('');
  const [diffs, setDiffs] = useState<SectionDiff[]>([]);

  const { process, reprocessWithSelection, reset, progress, result, error, isProcessing } = useETLProcessor();

  const handleTemplateSelect = useCallback((file: File) => {
    setTemplateFile(file);
    file.text().then(setTemplateText);
  }, []);

  const handleRtfSelect = useCallback((file: File) => {
    setRtfFile(file);
    file.text().then(setRtfText);
  }, []);

  const handleProcess = useCallback(() => {
    if (!templateText || !rtfText) return;
    setDiffs([]);
    process(templateText, rtfText);
  }, [templateText, rtfText, process]);

  const handleToggleDiff = useCallback((index: number) => {
    setDiffs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], enabled: !next[index].enabled };
      return next;
    });
  }, []);

  const handleApplySelected = useCallback(() => {
    if (!templateText || !rtfText) return;
    const enabledIndices = diffs
      .map((d, i) => d.enabled ? i : -1)
      .filter(i => i >= 0);
    reprocessWithSelection(templateText, rtfText, enabledIndices);
  }, [templateText, rtfText, diffs, reprocessWithSelection]);

  const handleReset = useCallback(() => {
    setTemplateFile(null);
    setRtfFile(null);
    setTemplateText('');
    setRtfText('');
    setDiffs([]);
    reset();
  }, [reset]);

  const displayDiffs = result?.diffs ?? diffs;
  if (result?.diffs && result.diffs !== diffs && diffs.length === 0) {
    setDiffs(result.diffs);
  }

  const canProcess = templateText.length > 0 && rtfText.length > 0 && !isProcessing;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Scalanie tekstu</h2>
          <p className="text-xs text-slate-500 mt-0.5">Wykryj różnice między szablonem a plikiem RTF i scal poprawki</p>
        </div>
        {(templateFile || rtfFile || result) && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Od nowa
          </button>
        )}
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FileUploader
          label="Szablon techniczny"
          accept=".txt"
          description="Plik .txt z kodami formatowania (@tagi, <MI>, <D>, itp.)"
          file={templateFile}
          onFileSelect={handleTemplateSelect}
          onClear={() => { setTemplateFile(null); setTemplateText(''); }}
        />
        <FileUploader
          label="Poprawiona wersja"
          accept=".rtf"
          description="Plik .rtf z poprawionym tekstem po korekcie"
          file={rtfFile}
          onFileSelect={handleRtfSelect}
          onClear={() => { setRtfFile(null); setRtfText(''); }}
        />
      </section>

      {(templateText || rtfText) && (
        <FilePreview templateText={templateText} rtfText={rtfText} />
      )}

      {canProcess && !result && (
        <button
          onClick={handleProcess}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-bold text-lg transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30"
        >
          <Sparkles className="h-5 w-5" />
          Wykryj różnice i scal
        </button>
      )}

      {isProcessing && progress && (
        <ProgressBar progress={progress} />
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Błąd przetwarzania</p>
            <p className="text-sm text-red-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {displayDiffs.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-slate-200 mb-3">
            Wykryte różnice
          </h3>
          <DiffViewer diffs={displayDiffs} onToggleDiff={handleToggleDiff} />

          {result && (
            <button
              onClick={handleApplySelected}
              disabled={isProcessing}
              className="mt-4 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
            >
              Przetworz ponownie z zaznaczonymi
            </button>
          )}
        </section>
      )}

      {result && (
        <section>
          <h3 className="text-lg font-semibold text-slate-200 mb-3">
            Wynik
          </h3>
          <ResultViewer
            result={result}
            filename={templateFile?.name ?? 'output.txt'}
          />
        </section>
      )}
    </div>
  );
}
