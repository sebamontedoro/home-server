import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Run } from '../api/client.ts'

const GAMES = [
  'FireRed',
  'LeafGreen',
  'Ruby',
  'Sapphire',
  'Emerald',
  'Otro',
]

export function RunsPage({ onSelect }: { onSelect: (id: number) => void }) {
  const qc = useQueryClient()
  const runs = useQuery<Run[]>({ queryKey: ['runs'], queryFn: () => api.get('/runs') })
  const [name, setName] = useState('')
  const [game, setGame] = useState(GAMES[0])

  const create = useMutation({
    mutationFn: () => api.post('/runs', { name, game }),
    onSuccess: (run: Run) => {
      qc.invalidateQueries({ queryKey: ['runs'] })
      setName('')
      onSelect(run.id)
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/runs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['runs'] }),
  })

  return (
    <main className="content">
      <h2>Mis partidas</h2>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) create.mutate()
        }}
      >
        <input
          placeholder="Nombre de la partida (ej. Nuzlocke Emerald)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select value={game} onChange={(e) => setGame(e.target.value)}>
          {GAMES.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <button type="submit">Crear</button>
      </form>

      <ul className="list">
        {runs.data?.map((r) => (
          <li key={r.id}>
            <button className="link" onClick={() => onSelect(r.id)}>
              <strong>{r.name}</strong> <span className="muted">· {r.game}</span>
            </button>
            <button className="danger" onClick={() => remove.mutate(r.id)}>
              borrar
            </button>
          </li>
        ))}
        {runs.data?.length === 0 && <p className="muted">Todavía no creaste ninguna partida.</p>}
      </ul>
    </main>
  )
}
