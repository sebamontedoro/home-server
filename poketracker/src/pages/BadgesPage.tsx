import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Run } from '../api/client.ts'
import { TypeBadge } from '../components/TypeBadge.tsx'

interface Gym {
  key: string
  name: string
  role: string
  type: string
}

interface Badge {
  id: number
  name: string
  obtained_at: string
}

export function BadgesPage({ run }: { run: Run }) {
  const qc = useQueryClient()
  const badgesKey = ['badges', run.id]

  const gyms = useQuery<Gym[]>({
    queryKey: ['trainers', run.game],
    queryFn: () => api.get(`/trainers?game=${encodeURIComponent(run.game)}`),
    select: (all) => all.filter((t) => t.role === 'gym'),
  })
  const badges = useQuery<Badge[]>({
    queryKey: badgesKey,
    queryFn: () => api.get(`/runs/${run.id}/badges`),
  })

  const add = useMutation({
    mutationFn: (name: string) => api.post(`/runs/${run.id}/badges`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: badgesKey }),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/runs/${run.id}/badges/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: badgesKey }),
  })

  const badgeList = badges.data ?? []
  const gymList = gyms.data ?? []
  const gymNames = new Set(gymList.map((g) => g.name))

  function badgeFor(name: string) {
    return badgeList.find((b) => b.name === name)
  }
  function toggleGym(g: Gym) {
    const existing = badgeFor(g.name)
    if (existing) remove.mutate(existing.id)
    else add.mutate(g.name)
  }

  const obtained = gymList.filter((g) => badgeFor(g.name)).length
  const custom = badgeList.filter((b) => !gymNames.has(b.name))

  const [customName, setCustomName] = useState('')

  return (
    <div>
      <h2>Medallas · {run.name}</h2>

      {gymList.length > 0 && (
        <>
          <p className="muted">
            Progreso: <strong>{obtained}/{gymList.length}</strong> medallas
          </p>
          <div className="badge-progress">
            <div
              className="badge-progress-fill"
              style={{ width: `${(obtained / gymList.length) * 100}%` }}
            />
          </div>
          <div className="grid">
            {gymList.map((g) => {
              const done = !!badgeFor(g.name)
              return (
                <button
                  key={g.key}
                  className={`card gym-toggle ${done ? 'done' : ''}`}
                  onClick={() => toggleGym(g)}
                >
                  <span className="gym-check">{done ? '🏅' : '⬜'}</span>
                  <span className="gym-name">{g.name}</span>
                  <TypeBadge type={g.type} />
                </button>
              )
            })}
          </div>
        </>
      )}

      <h3>Medallas personalizadas</h3>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (customName.trim()) {
            add.mutate(customName.trim())
            setCustomName('')
          }
        }}
      >
        <input
          placeholder="Otra medalla / logro"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
        />
        <button type="submit">Agregar</button>
      </form>
      <ul className="list">
        {custom.map((b) => (
          <li key={b.id}>
            <span style={{ flex: 1 }}>🏅 {b.name}</span>
            <button className="danger small" onClick={() => remove.mutate(b.id)}>
              quitar
            </button>
          </li>
        ))}
        {custom.length === 0 && <p className="muted">Sin medallas personalizadas.</p>}
      </ul>
    </div>
  )
}
