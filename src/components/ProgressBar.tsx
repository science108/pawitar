import { Loader2 } from 'lucide-react';
import type { ProcessingProgress } from '../types';

interface Props {
  progress: ProcessingProgress;
}

export function ProgressBar({ progress }: Props) {
  const percent = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
        <span className="text-sm text-slate-300">{progress.message}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
          style={{ width: `${Math.max(percent, 5)}%` }}
        />
      </div>
    </div>
  );
}
