import { Router } from 'express'
import { db } from '../db.ts'
import { recommendTeam, type TeamMember } from '../lib/recommend.ts'

export const recommendRouter = Router()

const listTeam = db.prepare('SELECT * FROM team_members WHERE run_id = ? ORDER BY slot, id')

// POST /api/runs/:id/recommend  { species? , types?: string[], level? }
recommendRouter.post('/:id/recommend', async (req, res) => {
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
  const { species, types, level } = req.body ?? {}
  if (!species && (!Array.isArray(types) || types.length === 0)) {
    return res.status(400).json({ error: 'indicá un rival (species o types)' })
  }
  try {
    const result = await recommendTeam(team, { species, types, level })
    res.json(result)
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'error calculando la recomendación' })
  }
})
