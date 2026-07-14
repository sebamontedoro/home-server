// Cliente HTTP minimalista contra la API propia (/api).
async function req(method: string, path: string, body?: unknown) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`)
  return data
}

export const api = {
  get: (p: string) => req('GET', p),
  post: (p: string, b?: unknown) => req('POST', p, b),
  put: (p: string, b?: unknown) => req('PUT', p, b),
  del: (p: string) => req('DELETE', p),
}

// Tipos compartidos
export interface Run {
  id: number
  game: string
  name: string
  created_at: string
}

export interface Member {
  id: number
  run_id: number
  species: string
  nickname: string | null
  level: number
  nature: string | null
  ability: string | null
  slot: number
  moves: string[]
}

export interface Recommendation {
  memberId: number
  name: string
  species: string
  score: number
  bestMove: { name: string; type: string; mult: number } | null
  incomingMult: number
  faster: boolean | null
  reasons: string[]
}
