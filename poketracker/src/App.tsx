import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, type Run } from './api/client.ts'
import { RunsPage } from './pages/RunsPage.tsx'
import { TeamPage } from './pages/TeamPage.tsx'
import { BattlePage } from './pages/BattlePage.tsx'
import { NotesPage } from './pages/NotesPage.tsx'
import { BadgesPage } from './pages/BadgesPage.tsx'

type Tab = 'equipo' | 'combate' | 'medallas' | 'notas'

export function App() {
  const [runId, setRunId] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('equipo')

  const runs = useQuery<Run[]>({ queryKey: ['runs'], queryFn: () => api.get('/runs') })
  const activeRun = runs.data?.find((r) => r.id === runId) ?? null

  return (
    <div className="app">
      <header className="topbar">
        <h1>⚡ PokéTracker</h1>
        <select
          value={runId ?? ''}
          onChange={(e) => setRunId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— elegí una partida —</option>
          {runs.data?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.game})
            </option>
          ))}
        </select>
      </header>

      {!activeRun ? (
        <RunsPage onSelect={setRunId} />
      ) : (
        <>
          <nav className="tabs">
            <button className={tab === 'equipo' ? 'active' : ''} onClick={() => setTab('equipo')}>
              Equipo
            </button>
            <button className={tab === 'combate' ? 'active' : ''} onClick={() => setTab('combate')}>
              Combate
            </button>
            <button className={tab === 'medallas' ? 'active' : ''} onClick={() => setTab('medallas')}>
              Medallas
            </button>
            <button className={tab === 'notas' ? 'active' : ''} onClick={() => setTab('notas')}>
              Notas
            </button>
          </nav>
          <main className="content">
            {tab === 'equipo' && <TeamPage run={activeRun} />}
            {tab === 'combate' && <BattlePage run={activeRun} />}
            {tab === 'medallas' && <BadgesPage run={activeRun} />}
            {tab === 'notas' && <NotesPage run={activeRun} />}
          </main>
        </>
      )}
    </div>
  )
}
