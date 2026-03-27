import { useState } from 'react';
import { Languages, Play, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { FileUploader } from '../components/FileUploader';
import { DiacriticsReport } from '../components/DiacriticsReport';
import { useDiacriticsProcessor } from '../hooks/useDiacriticsProcessor';

export function DiacriticsPage() {
  const [enFile, setEnFile] = useState<File | null>(null);
  const [plFile, setPlFile] = useState<File | null>(null);

  const { processing, progress, result, error, process, reset } = useDiacriticsProcessor();

  const canProcess = enFile && plFile && !processing;

  const handleProcess = () => {
    if (enFile && plFile) process(enFile, plFile);
  };

  const handleReset = () => {
    setEnFile(null);
    setPlFile(null);
    reset();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
          <Languages className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Weryfikacja diakrytyków</h2>
          <p className="text-sm text-slate-400">
            Porównanie terminów sanskryckich (IAST) między oryginałem EN a tłumaczeniem PL
          </p>
        </div>
      </div>

      {/* File uploaders */}
      {!result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileUploader
            label="PDF — Oryginał angielski"
            accept=".pdf"
            description="Plik PDF z oryginalnym tekstem angielskim"
            file={enFile}
            onFileSelect={setEnFile}
            onClear={() => setEnFile(null)}
          />
          <FileUploader
            label="PDF — Tłumaczenie polskie"
            accept=".pdf"
            description="Plik PDF z polskim tłumaczeniem"
            file={plFile}
            onFileSelect={setPlFile}
            onClear={() => setPlFile(null)}
          />
        </div>
      )}

      {/* Process button */}
      {!result && !processing && (
        <button
          onClick={handleProcess}
          disabled={!canProcess}
          className={`
            flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all
            ${canProcess
              ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white hover:from-violet-600 hover:to-violet-700 shadow-lg shadow-violet-500/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }
          `}
        >
          <Play className="h-5 w-5" />
          Analizuj diakrytyki
        </button>
      )}

      {/* Progress */}
      {processing && progress && (
        <div className="flex flex-col gap-3 py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
            <span className="text-sm text-slate-300">{progress.message}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-300"
              style={{ width: `${Math.max(progress.percent, 3)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Błąd przetwarzania</p>
            <p className="text-xs text-red-400/70 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Analiza zakończona</p>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Nowa analiza
            </button>
          </div>
          <DiacriticsReport result={result} />
        </>
      )}
    </div>
  );
}
