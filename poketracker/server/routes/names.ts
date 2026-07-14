import { Router } from 'express'
import { pokeFetch } from '../lib/pokeapi.ts'

// Devuelve la lista completa de nombres de Pokémon o movimientos para el
// autocompletado del frontend. Se apoya en el caché de PokéAPI (SQLite) y
// además cachea en memoria el array ya mapeado.
export const namesRouter = Router()

const KINDS: Record<string, string> = { pokemon: 'pokemon', move: 'move' }
const memo = new Map<string, string[]>()

namesRouter.get('/names/:kind', async (req, res) => {
  const kind = KINDS[req.params.kind]
  if (!kind) return res.status(400).json({ error: 'kind inválido (pokemon|move)' })

  const cached = memo.get(kind)
  if (cached) return res.json(cached)

  try {
    const data = await pokeFetch(`${kind}?limit=20000`)
    const names = (data.results as { name: string }[]).map((r) => r.name)
    memo.set(kind, names)
    res.json(names)
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'error consultando PokéAPI' })
  }
})
