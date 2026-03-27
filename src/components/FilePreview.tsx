import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { parseRtf } from '../services/rtfParser';

interface Props {
  templateText: string;
  rtfText: string;
}

export function FilePreview({ templateText, rtfText }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'template' | 'rtf'>('template');

  const parsedRtfText = useMemo(() => {
    if (!rtfText) return '';
    try {
      const paragraphs = parseRtf(rtfText);
      return paragraphs.map(p => p.text).join('\n');
    } catch {
      return '[Nie udało się sparsować pliku RTF]';
    }
  }, [rtfText]);

  const content = activeTab === 'template' ? templateText : parsedRtfText;
  const lineCount = content.split('\n').length;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800/50 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Eye className="h-4 w-4 text-slate-500" />
        Podgląd załadowanych plików
      </button>

      {open && (
        <div className="border-t border-slate-700/50">
          <div className="flex border-b border-slate-700/50">
            <TabButton
              active={activeTab === 'template'}
              onClick={() => setActiveTab('template')}
              label="Szablon (.txt)"
              hasContent={templateText.length > 0}
            />
            <TabButton
              active={activeTab === 'rtf'}
              onClick={() => setActiveTab('rtf')}
              label="Wsadowy (.rtf → tekst)"
              hasContent={rtfText.length > 0}
            />
          </div>

          {content ? (
            <div className="relative">
              <div className="absolute top-2 right-3 text-xs text-slate-600">
                {lineCount} {lineCount === 1 ? 'linia' : lineCount < 5 ? 'linie' : 'linii'}
              </div>
              <pre className="p-4 pt-3 text-xs leading-relaxed text-slate-400 overflow-auto max-h-96 font-mono whitespace-pre-wrap break-words">
                {content}
              </pre>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-600">
              Brak pliku — załaduj plik powyżej
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, hasContent }: {
  active: boolean;
  onClick: () => void;
  label: string;
  hasContent: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 px-4 py-2 text-sm font-medium transition-colors relative
        ${active
          ? 'text-amber-400 bg-slate-800/30'
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/20'
        }
      `}
    >
      {label}
      {hasContent && (
        <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${active ? 'bg-amber-400' : 'bg-slate-600'}`} />
      )}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
      )}
    </button>
  );
}
