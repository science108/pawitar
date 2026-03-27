import { useState, useRef, useEffect } from 'react';
import { Copy, Download, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProcessingResult } from '../types';
import { generateOutputBlob, downloadBlob, copyToClipboard } from '../services/outputGenerator';

interface Props {
  result: ProcessingResult;
  filename: string;
}

export function ResultViewer({ result, filename }: Props) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [withBOM, setWithBOM] = useState(true);
  const previewRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  const handleCopy = async () => {
    await copyToClipboard(result.output);
    setCopied(true);
  };

  const handleDownload = () => {
    const blob = generateOutputBlob(result.output, withBOM);
    const outputFilename = filename.replace(/\.\w+$/, '_MERGED.txt');
    downloadBlob(blob, outputFilename);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Sekcji" value={result.stats.totalSections} />
        <StatCard label="Zmienionych" value={result.stats.changedSections} accent />
        <StatCard label="Słów" value={result.stats.totalWords} />
        <StatCard label="Zmienionych słów" value={result.stats.changedWords} accent />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold transition-colors"
        >
          <Download className="h-4 w-4" />
          Pobierz plik
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 hover:border-slate-500 text-slate-200 transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Skopiowano!' : 'Kopiuj'}
        </button>

        <label className="flex items-center gap-2 text-sm text-slate-400 ml-auto">
          <input
            type="checkbox"
            checked={withBOM}
            onChange={(e) => setWithBOM(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 accent-amber-500"
          />
          UTF-8 BOM
        </label>
      </div>

      {/* Preview Toggle */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
      >
        {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {showPreview ? 'Ukryj podgląd' : 'Pokaż podgląd wyniku'}
      </button>

      {showPreview && (
        <pre
          ref={previewRef}
          className="rounded-xl bg-slate-900 border border-slate-700 p-4 text-xs font-mono text-slate-300 overflow-auto max-h-96 leading-relaxed"
        >
          {result.output.split('\n').map((line, i) => (
            <div key={i} className="flex">
              <span className="text-slate-600 select-none w-10 text-right pr-3 shrink-0">
                {i + 1}
              </span>
              <span className="whitespace-pre">{line}</span>
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 text-center">
      <p className={`text-2xl font-bold ${accent ? 'text-amber-400' : 'text-slate-200'}`}>
        {value}
      </p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
