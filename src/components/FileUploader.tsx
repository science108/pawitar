import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface Props {
  label: string;
  accept: string;
  description: string;
  file: File | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
}

export function FileUploader({ label, accept, description, file, onFileSelect, onClear }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileSelect(dropped);
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        {label}
      </label>

      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <FileText className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
            <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
          </div>
          <button
            onClick={onClear}
            className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
            aria-label="Usuń plik"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            flex flex-col items-center gap-2 rounded-xl border-2 border-dashed
            px-4 py-8 cursor-pointer transition-all
            ${isDragOver
              ? 'border-amber-400 bg-amber-500/10'
              : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
            }
          `}
        >
          <Upload className={`h-8 w-8 ${isDragOver ? 'text-amber-400' : 'text-slate-500'}`} />
          <p className="text-sm text-slate-400 text-center">{description}</p>
          <p className="text-xs text-slate-500">Przeciągnij plik lub kliknij aby wybrać</p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileSelect(f);
            }}
          />
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
