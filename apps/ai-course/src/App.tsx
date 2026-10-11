import { useEffect, useState } from 'react';
import { STAGES, type StageMeta } from './stages/index.tsx';
import { badge, colors, layout } from './ui/styles.ts';

interface Catalog {
  mode: 'online' | 'offline';
  models: Array<{ id: string; label: string; tier: string }>;
}

function readHash(): string {
  return window.location.hash.replace(/^#\/?/, '') || STAGES[0].id;
}

function useHash(): [string, (next: string) => void] {
  const [value, setValue] = useState(readHash);

  useEffect(() => {
    const onHashChange = () => setValue(readHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return [
    value,
    (next: string) => {
      window.location.hash = `#/${next}`;
      setValue(next);
    },
  ];
}

export default function App() {
  const [currentId, navigate] = useHash();
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json() as Promise<Catalog>)
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  const current: StageMeta = STAGES.find((stage) => stage.id === currentId) ?? STAGES[0];
  const StageComponent = current.component;

  return (
    <div style={layout.shell}>
      <aside style={layout.rail}>
        <div style={{ fontSize: 13, color: colors.textDim, letterSpacing: 1 }}>AI COURSE</div>
        <div style={{ fontSize: 18, fontWeight: 600, margin: '6px 0 18px' }}>
          前端转型 AI 六关卡
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STAGES.map((stage) => {
            const active = stage.id === current.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => navigate(stage.id)}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: `1px solid ${active ? colors.brand : colors.border}`,
                  background: active ? colors.brandSoft : 'transparent',
                  color: colors.text,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{stage.title}</div>
                <div style={{ fontSize: 12, color: colors.textDim, marginTop: 4 }}>
                  {stage.goal}
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      <main style={layout.main}>
        <header style={layout.header}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{current.title}</div>
            <div style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>{current.goal}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {catalog ? (
              <span style={badge(catalog.mode === 'online' ? 'ok' : 'warn')}>
                {catalog.mode === 'online' ? '真实模型' : '离线演示模式'} ·{' '}
                {catalog.models[0]?.id ?? '-'}
              </span>
            ) : (
              <span style={badge('info')}>后端未连接</span>
            )}
          </div>
        </header>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          <StageComponent />
        </div>
      </main>
    </div>
  );
}
