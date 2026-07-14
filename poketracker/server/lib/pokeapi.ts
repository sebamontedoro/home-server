import { db } from '../db.ts'

const BASE = 'https://pokeapi.co/api/v2'

const selectCache = db.prepare('SELECT json FROM pokeapi_cache WHERE key = ?')
const upsertCache = db.prepare(
  `INSERT INTO pokeapi_cache (key, json, fetched_at) VALUES (?, ?, datetime('now'))
   ON CONFLICT(key) DO UPDATE SET json = excluded.json, fetched_at = excluded.fetched_at`,
)

/**
 * Trae un recurso de PokéAPI con caché en SQLite. `path` es relativo a /api/v2
 * (ej. "pokemon/charizard", "type/water", "move/surf"). Una vez cacheado,
 * responde sin tocar internet.
 */
export async function pokeFetch(path: string): Promise<any> {
  const key = path.replace(/^\/+|\/+$/g, '').toLowerCase()
  const cached = selectCache.get(key) as { json: string } | undefined
  if (cached) return JSON.parse(cached.json)

  const res = await fetch(`${BASE}/${key}`)
  if (!res.ok) {
    throw new Error(`PokéAPI ${key} respondió ${res.status}`)
  }
  const data = await res.json()
  upsertCache.run(key, JSON.stringify(data))
  return data
}
