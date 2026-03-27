import { Puzzle } from 'lucide-react';

export function PlaceholderPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="h-16 w-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-6">
        <Puzzle className="h-8 w-8 text-slate-500" />
      </div>
      <h2 className="text-lg font-bold text-slate-200 mb-2">Nowa funkcja</h2>
      <p className="text-sm text-slate-500 max-w-sm">
        Ta zakładka jest przygotowana na nową funkcjonalność. Wkrótce pojawi się tutaj nowe narzędzie.
      </p>
    </div>
  );
}
