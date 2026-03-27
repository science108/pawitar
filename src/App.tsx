import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ETLPage } from './pages/ETLPage';
import { DiacriticsPage } from './pages/DiacriticsPage';

function App() {
  const [activeTab, setActiveTab] = useState('etl');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar
        activeTab={activeTab}
        collapsed={sidebarCollapsed}
        onTabChange={setActiveTab}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
          {activeTab === 'etl' && <ETLPage />}
          {activeTab === 'diacritics' && <DiacriticsPage />}
        </main>

        <footer className="border-t border-slate-800">
          <div className="max-w-5xl mx-auto px-6 py-4 text-center text-xs text-slate-600">
            Pawitar &middot; Fundacja Book Trust
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
