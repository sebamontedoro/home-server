import { Router } from 'express'
import { db } from '../db.ts'
import { trainersForGame, getTrainer } from '../data/trainers.ts'
import { planAgainst, type TeamMember } from '../lib/recommend.ts'
import { suggestCatches } from '../lib/suggest.ts'

export const trainersRouter = Router()

const getRun = db.prepare('SELECT * FROM runs WHERE id = ?')
const listTeam = db.prepare('SELECT * FROM team_members WHERE run_id = ? ORDER BY slot, id')

// GET /api/trainers?game=Emerald  -> lista de entrenadores curados del juego
trainersRouter.get('/trainers', (req, res) => {
  const game = String(req.query.game ?? '')
  if (!game) return res.status(400).json({ error: 'falta el parámetro game' })
  // Devolvemos sin el equipo completo para aligerar; el detalle va en el plan.
  res.json(
    trainersForGame(game).map(({ key, name, role, type, team }) => ({
      key,
      name,
      role,
      type,
      teamSize: team.length,
    })),
  )
})

// POST /api/runs/:id/plan { trainerKey } -> plan contra el equipo del entrenador
trainersRouter.post('/runs/:id/plan', async (req, res) => {
  const run = getRun.get(req.params.id) as any
  if (!run) return res.status(404).json({ error: 'partida no encontrada' })

  const trainer = getTrainer(String(req.body?.trainerKey ?? ''))
  if (!trainer) return res.status(404).json({ error: 'entrenador no encontrado' })

  const team = (listTeam.all(req.params.id) as any[]).map(
    (r): TeamMember => ({
      id: r.id,
      species: r.species,
      nickname: r.nickname,
      level: r.level,
      moves: JSON.parse(r.moves || '[]'),
    }),
  )
  if (team.length === 0) {
    return res.status(400).json({ error: 'la partida no tiene equipo cargado' })
  }

  try {
    const matchups = await planAgainst(team, trainer.team)
    res.json({
      trainer: { name: trainer.name, role: trainer.role, type: trainer.type },
      matchups,
    })
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'error generando el plan' })
  }
})

// POST /api/runs/:id/suggest { trainerKey } -> qué tipos/Pokémon capturar
trainersRouter.post('/runs/:id/suggest', async (req, res) => {
  const run = getRun.get(req.params.id) as any
  if (!run) return res.status(404).json({ error: 'partida no encontrada' })

  const trainer = getTrainer(String(req.body?.trainerKey ?? ''))
  if (!trainer) return res.status(404).json({ error: 'entrenador no encontrado' })

  const team = (listTeam.all(req.params.id) as any[]).map(
    (r): TeamMember => ({
      id: r.id,
      species: r.species,
      nickname: r.nickname,
      level: r.level,
      moves: JSON.parse(r.moves || '[]'),
    }),
  )
  if (team.length === 0) {
    return res.status(400).json({ error: 'la partida no tiene equipo cargado' })
  }

  try {
    const result = await suggestCatches(team, trainer.team, run.game)
    res.json({
      trainer: { name: trainer.name, type: trainer.type },
      ...result,
    })
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'error generando sugerencias' })
  }
})
