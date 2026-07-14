import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, type Recommendation, type Run } from '../api/client.ts'
import { useNames } from '../api/useNames.ts'
import { Autocomplete } from '../components/Autocomplete.tsx'
import { PokemonSprite } from '../components/PokemonSprite.tsx'
import { TypeBadge } from '../components/TypeBadge.tsx'

interface Result {
  opponent: string
  ranking: Recommendation[]
}

interface TrainerSummary {
  key: string
  name: string
  role: 'gym' | 'elite' | 'champion'
  type: string
  teamSize: number
}

interface Matchup {
  opponent: { species: string; level: number }
  topPicks: Recommendation[]
}

interface Plan {
  trainer: { name: string; role: string; type: string }
  matchups: Matchup[]
}

interface CatchSuggestion {
  type: string
  superEffectiveVs: number
  totalEnemies: number
  examples: string[]
}

interface SuggestResult {
  trainer: { name: string; type: string }
  game: string
  suggestions: CatchSuggestion[]
}

const ROLE_LABEL: Record<string, string> = {
  gym: 'Gimnasio',
  elite: 'Alto Mando',
  champion: 'Campeón',
}

export function BattlePage({ run }: { run: Run }) {
  const [mode, setMode] = useState<'trainer' | 'wild'>('trainer')

  return (
    <div>
      <h2>Asistente de combate</h2>
      <div className="tabs sub">
        <button className={mode === 'trainer' ? 'active' : ''} onClick={() => setMode('trainer')}>
          Líder / Entrenador
        </button>
        <button className={mode === 'wild' ? 'active' : ''} onClick={() => setMode('wild')}>
          Rival suelto
        </button>
      </div>
      {mode === 'trainer' ? <TrainerMode run={run} /> : <WildMode run={run} />}
    </div>
  )
}

function TrainerMode({ run }: { run: Run }) {
  const [trainerKey, setTrainerKey] = useState('')
  const trainers = useQuery<TrainerSummary[]>({
    queryKey: ['trainers', run.game],
    queryFn: () => api.get(`/trainers?game=${encodeURIComponent(run.game)}`),
  })

  const plan = useMutation<Plan, Error>({
    mutationFn: () => api.post(`/runs/${run.id}/plan`, { trainerKey }),
  })
  const suggest = useMutation<SuggestResult, Error>({
    mutationFn: () => api.post(`/runs/${run.id}/suggest`, { trainerKey }),
  })

  return (
    <div>
      <p className="muted">
        Elegí al líder o miembro del Alto Mando y te armo un plan: contra cada uno de sus Pokémon,
        cuál de los tuyos conviene sacar.
      </p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (trainerKey) plan.mutate()
        }}
      >
        <select value={trainerKey} onChange={(e) => setTrainerKey(e.target.value)}>
          <option value="">— elegí un entrenador —</option>
          {trainers.data?.map((t) => (
            <option key={t.key} value={t.key}>
              {ROLE_LABEL[t.role]} · {t.name} ({t.type})
            </option>
          ))}
        </select>
        <button type="submit" disabled={!trainerKey || plan.isPending}>
          {plan.isPending ? 'Calculando…' : 'Armar plan'}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!trainerKey || suggest.isPending}
          onClick={() => suggest.mutate()}
        >
          {suggest.isPending ? 'Analizando…' : '¿Qué capturar?'}
        </button>
      </form>

      {trainers.data?.length === 0 && (
        <p className="muted">No hay entrenadores curados para "{run.game}". Usá "Rival suelto".</p>
      )}
      {plan.isError && <p className="error">{plan.error.message}</p>}
      {suggest.isError && <p className="error">{suggest.error.message}</p>}

      {suggest.data && (
        <div className="card suggest">
          <h3>Huecos de cobertura vs {suggest.data.trainer.name}</h3>
          {suggest.data.suggestions.length === 0 ? (
            <p className="muted">
              Tu equipo ya cubre bien a este rival. No hace falta capturar nada nuevo. 💪
            </p>
          ) : (
            <>
              <p className="muted small">
                Tu equipo no pega estos tipos, que son supereficaces contra varios de sus Pokémon:
              </p>
              {suggest.data.suggestions.map((s) => (
                <div key={s.type} className="suggest-row">
                  <div className="row" style={{ alignItems: 'center' }}>
                    <TypeBadge type={s.type} />
                    <span className="muted small">
                      supereficaz vs {s.superEffectiveVs}/{s.totalEnemies} rivales
                    </span>
                  </div>
                  <div className="suggest-examples">
                    {s.examples.map((name) => (
                      <div key={name} className="suggest-mon">
                        <PokemonSprite species={name} size={40} />
                        <span className="small">{cap(name)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {plan.data && (
        <div>
          <h3>
            Plan vs <span className="opp">{plan.data.trainer.name}</span>
          </h3>
          {plan.data.matchups.map((m, i) => (
            <div className="card" key={i}>
              <div className="row" style={{ alignItems: 'center' }}>
                <PokemonSprite species={m.opponent.species} size={48} />
                <strong style={{ flex: 1 }}>{cap(m.opponent.species)}</strong>
                <span className="muted">Nv {m.opponent.level}</span>
              </div>
              <ol className="ranking compact">
                {m.topPicks.map((p, j) => (
                  <li key={p.memberId} className={j === 0 ? 'best-pick' : ''}>
                    <PokemonSprite species={p.species} size={28} />
                    <span className="pick-name">
                      {j === 0 && '⭐ '}
                      {p.name}
                    </span>
                    <span className="muted small"> — {p.reasons[0]}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WildMode({ run }: { run: Run }) {
  const [species, setSpecies] = useState('')
  const pokemonNames = useNames('pokemon')
  const recommend = useMutation<Result, Error>({
    mutationFn: () =>
      api.post(`/runs/${run.id}/recommend`, { species: species.trim().toLowerCase() }),
  })

  return (
    <div>
      <p className="muted">Decime contra qué Pokémon vas a pelear y ordeno tu equipo.</p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (species.trim()) recommend.mutate()
        }}
      >
        <div style={{ flex: 1, minWidth: 180 }}>
          <Autocomplete
            value={species}
            onChange={setSpecies}
            options={pokemonNames.data ?? []}
            loading={pokemonNames.isLoading}
            placeholder="Pokémon rival (ej. onix, gyarados)"
          />
        </div>
        <button type="submit" disabled={recommend.isPending}>
          {recommend.isPending ? 'Calculando…' : 'Recomendar'}
        </button>
      </form>

      {recommend.isError && <p className="error">{recommend.error.message}</p>}

      {recommend.data && (
        <div>
          <h3 className="row" style={{ alignItems: 'center' }}>
            <span>Contra</span>
            <PokemonSprite species={recommend.data.opponent} size={48} showTypes />
            <span className="opp">{cap(recommend.data.opponent)}</span>
          </h3>
          <ol className="ranking">
            {recommend.data.ranking.map((r, i) => (
              <li key={r.memberId} className={`card ${i === 0 ? 'best' : ''}`}>
                <div className="row" style={{ alignItems: 'center' }}>
                  <PokemonSprite species={r.species} size={40} />
                  <strong style={{ flex: 1 }}>
                    {i === 0 && '⭐ '}
                    {r.name}
                  </strong>
                  <span className={`score ${r.score >= 0 ? 'pos' : 'neg'}`}>
                    {r.score.toFixed(1)}
                  </span>
                </div>
                <ul className="reasons">
                  {r.reasons.map((reason, j) => (
                    <li key={j}>{reason}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
