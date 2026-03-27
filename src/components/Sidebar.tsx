import { Sparkles, GitMerge, Puzzle, PanelLeftClose, PanelLeft } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'etl', label: 'Scalanie tekstu', icon: <GitMerge className="h-5 w-5" /> },
  { id: 'new', label: 'Nowa funkcja', icon: <Puzzle className="h-5 w-5" /> },
];

interface Props {
  activeTab: string;
  collapsed: boolean;
  onTabChange: (id: string) => void;
  onToggleCollapse: () => void;
}

export function Sidebar({ activeTab, collapsed, onTabChange, onToggleCollapse }: Props) {
  return (
    <aside
      className={`
        shrink-0 flex flex-col border-r border-slate-800 bg-slate-900/70
        transition-[width] duration-200 ease-in-out overflow-hidden
        ${collapsed ? 'w-16' : 'w-56'}
      `}
    >
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center' : ''}`}>
        <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-slate-900" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-100 leading-tight truncate">Pawitar</h1>
            <p className="text-[10px] text-slate-500 truncate">Book Trust Foundation</p>
          </div>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2 mt-2">
        {NAV_ITEMS.map(item => {
          const active = item.id === activeTab;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${active
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="px-2 pb-4">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors w-full"
          title={collapsed ? 'Rozwiń menu' : 'Zwiń menu'}
        >
          {collapsed
            ? <PanelLeft className="h-4 w-4 mx-auto" />
            : <><PanelLeftClose className="h-4 w-4 shrink-0" /><span className="truncate">Zwiń menu</span></>
          }
        </button>
      </div>
    </aside>
  );
}
