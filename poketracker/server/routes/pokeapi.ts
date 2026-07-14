import { Router } from 'express'
import { pokeFetch } from '../lib/pokeapi.ts'

// Proxy con caché a PokéAPI. El frontend pega a /api/pokeapi/<path> y el backend
// resuelve contra pokeapi.co guardando el resultado en SQLite.
export const pokeapiRouter = Router()

pokeapiRouter.get('/*', async (req, res) => {
  const path = (req.params as any)[0] as string
  if (!path) return res.status(400).json({ error: 'falta el recurso' })
  // Reenviar el query string (ej. ?limit=20000) para que llegue a PokéAPI.
  const qs = req.originalUrl.split('?')[1]
  const full = qs ? `${path}?${qs}` : path
  try {
    const data = await pokeFetch(full)
    res.json(data)
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'error consultando PokéAPI' })
  }
})
