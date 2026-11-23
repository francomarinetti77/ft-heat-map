import { useState } from 'react';
import MapView from './components/MapView';
import PipelineBoard from './components/PipelineBoard';
import Dashboard from './components/Dashboard';
import DataQuality from './components/DataQuality';

type Tab = 'map' | 'pipeline' | 'dashboard' | 'data';

const TABS: { id: Tab; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'pipeline', label: 'Opportunities' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'data', label: 'Data quality' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('map');

  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between border-b border-black/10 bg-surface px-5 py-2.5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-7 w-7 items-center justify-center rounded"
            style={{ backgroundColor: '#F7941E' }}
            aria-hidden
          >
            <FlameGlyph />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight tracking-tight">FT Heat Map</div>
            <div className="text-[11px] leading-tight text-muted">
              Barcelona · crematorium heat recovery
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-ink text-white'
                  : 'text-ink/70 hover:bg-black/5 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="min-h-0 flex-1">
        {tab === 'map' && <MapView />}
        {tab === 'pipeline' && <PipelineBoard />}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'data' && <DataQuality />}
      </main>
    </div>
  );
}

function FlameGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2c0 4-4 5-4 9a4 4 0 0 0 8 0c0-1.5-.8-2.6-1.5-3.5.3 1.2-.2 2-1 2 .6-2.3-1.5-3.5-1.5-7.5z"
        fill="#fff"
      />
    </svg>
  );
}
