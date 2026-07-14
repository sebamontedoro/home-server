import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Member, type Run } from '../api/client.ts'
import { useNames } from '../api/useNames.ts'
import { Autocomplete } from '../components/Autocomplete.tsx'
import { PokemonSprite } from '../components/PokemonSprite.tsx'

export function TeamPage({ run }: { run: Run }) {
  const qc = useQueryClient()
  const key = ['team', run.id]
  const team = useQuery<Member[]>({ queryKey: key, queryFn: () => api.get(`/runs/${run.id}/team`) })
  const pokemonNames = useNames('pokemon')
  const moveNames = useNames('move')

  const [species, setSpecies] = useState('')
  const [nickname, setNickname] = useState('')
  const [level, setLevel] = useState(5)
  const [moves, setMoves] = useState<string[]>([])
  const [moveInput, setMoveInput] = useState('')

  const add = useMutation({
    mutationFn: () =>
      api.post(`/runs/${run.id}/team`, {
        species: species.trim().toLowerCase(),
        nickname: nickname.trim() || null,
        level,
        moves,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key })
      setSpecies('')
      setNickname('')
      setMoves([])
      setMoveInput('')
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/runs/${run.id}/team/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  function addMove(m: string) {
    const v = m.trim().toLowerCase()
    if (v && !moves.includes(v)) setMoves([...moves, v])
    setMoveInput('')
  }

  return (
    <div>
      <h2>Equipo · {run.name}</h2>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault()
          if (species.trim()) add.mutate()
        }}
      >
        <div className="row">
          <div style={{ flex: 2, minWidth: 160 }}>
            <Autocomplete
              value={species}
              onChange={setSpecies}
              options={pokemonNames.data ?? []}
              loading={pokemonNames.isLoading}
              placeholder="Especie (ej. charmander)"
            />
          </div>
          <input
            placeholder="Apodo (opcional)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{ flex: 1, minWidth: 120 }}
          />
          <input
            type="number"
            min={1}
            max={100}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            style={{ width: 80 }}
          />
        </div>

        <label className="muted small">Movimientos</label>
        <div className="moves">
          {moves.map((mv) => (
            <span className="chip removable" key={mv} onClick={() => setMoves(moves.filter((x) => x !== mv))}>
              {mv} ✕
            </span>
          ))}
        </div>
        <Autocomplete
          value={moveInput}
          onChange={setMoveInput}
          onPick={addMove}
          options={moveNames.data ?? []}
          loading={moveNames.isLoading}
          placeholder="Agregar movimiento y Enter (ej. ember)"
        />

        <button type="submit">Agregar al equipo</button>
        {add.isError && <p className="error">{(add.error as Error).message}</p>}
      </form>

      <div className="grid">
        {team.data?.map((m) => (
          <div className="card mon" key={m.id}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <PokemonSprite species={m.species} showTypes size={64} />
              <div style={{ flex: 1 }}>
                <div className="row between">
                  <strong>{m.nickname || cap(m.species)}</strong>
                  <span className="muted">Nv {m.level}</span>
                </div>
                {m.nickname && <div className="muted small">{cap(m.species)}</div>}
              </div>
            </div>
            <div className="moves">
              {m.moves.length ? (
                m.moves.map((mv) => (
                  <span className="chip" key={mv}>
                    {mv}
                  </span>
                ))
              ) : (
                <span className="muted small">sin movimientos</span>
              )}
            </div>
            <button className="danger small" onClick={() => remove.mutate(m.id)}>
              quitar
            </button>
          </div>
        ))}
        {team.data?.length === 0 && <p className="muted">Equipo vacío. Agregá tu primer Pokémon.</p>}
      </div>
    </div>
  )
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
