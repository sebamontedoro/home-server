import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import './db.ts' // inicializa el esquema al arrancar
import { runsRouter } from './routes/runs.ts'
import { recommendRouter } from './routes/recommend.ts'
import { pokeapiRouter } from './routes/pokeapi.ts'
import { trainersRouter } from './routes/trainers.ts'
import { namesRouter } from './routes/names.ts'
import { monRouter } from './routes/mon.ts'

const PORT = Number(process.env.PORT) || 8086
const app = express()
app.use(express.json())

// --- API ---
app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api', trainersRouter) // /api/trainers y /api/runs/:id/plan
app.use('/api', namesRouter) // /api/names/:kind para autocompletado
app.use('/api', monRouter) // /api/mon/:species sprite + tipos
app.use('/api/runs', recommendRouter) // /api/runs/:id/recommend
app.use('/api/runs', runsRouter) // CRUD de partidas, equipo, medallas, notas
app.use('/api/pokeapi', pokeapiRouter)

// --- Frontend estático (build de Vite), solo en producción ---
const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (_req, res) => res.sendFile(join(distDir, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`PokéTracker escuchando en http://0.0.0.0:${PORT}`)
})
