import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Run } from '../api/client.ts'

interface Note {
  id: number
  target: string
  body: string
  updated_at: string
}

export function NotesPage({ run }: { run: Run }) {
  const qc = useQueryClient()
  const key = ['notes', run.id]
  const notes = useQuery<Note[]>({ queryKey: key, queryFn: () => api.get(`/runs/${run.id}/notes`) })

  const [target, setTarget] = useState('')
  const [body, setBody] = useState('')

  const add = useMutation({
    mutationFn: () => api.post(`/runs/${run.id}/notes`, { target, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key })
      setTarget('')
      setBody('')
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/runs/${run.id}/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  return (
    <div>
      <h2>Notas de estrategia</h2>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault()
          if (target.trim()) add.mutate()
        }}
      >
        <input
          placeholder="Rival / objetivo (ej. Gimnasio de Brock, Alto Mando)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <textarea
          placeholder="Plan: qué Pokémon llevar, qué movimientos, qué evitar…"
          value={body}
          rows={3}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit">Guardar nota</button>
      </form>

      <div className="grid">
        {notes.data?.map((n) => (
          <div className="card" key={n.id}>
            <div className="row between">
              <strong>{n.target}</strong>
              <button className="danger small" onClick={() => remove.mutate(n.id)}>
                borrar
              </button>
            </div>
            <p className="note-body">{n.body}</p>
          </div>
        ))}
        {notes.data?.length === 0 && <p className="muted">Sin notas todavía.</p>}
      </div>
    </div>
  )
}
