import { Router } from 'express'
import { db } from '../db.ts'

export const runsRouter = Router()

// --- Partidas (runs) ---
const listRuns = db.prepare('SELECT * FROM runs ORDER BY created_at DESC')
const getRun = db.prepare('SELECT * FROM runs WHERE id = ?')
const insertRun = db.prepare('INSERT INTO runs (game, name) VALUES (?, ?)')
const deleteRun = db.prepare('DELETE FROM runs WHERE id = ?')

runsRouter.get('/', (_req, res) => {
  res.json(listRuns.all())
})

runsRouter.post('/', (req, res) => {
  const { game, name } = req.body ?? {}
  if (!game || !name) return res.status(400).json({ error: 'game y name son obligatorios' })
  const info = insertRun.run(String(game), String(name))
  res.status(201).json(getRun.get(info.lastInsertRowid))
})

runsRouter.get('/:id', (req, res) => {
  const run = getRun.get(req.params.id)
  if (!run) return res.status(404).json({ error: 'partida no encontrada' })
  res.json(run)
})

runsRouter.delete('/:id', (req, res) => {
  deleteRun.run(req.params.id)
  res.status(204).end()
})

// --- Equipo (team_members) ---
const listTeam = db.prepare('SELECT * FROM team_members WHERE run_id = ? ORDER BY slot, id')
const getMember = db.prepare('SELECT * FROM team_members WHERE id = ?')
const insertMember = db.prepare(
  `INSERT INTO team_members (run_id, species, nickname, level, nature, ability, slot, moves)
   VALUES (@run_id, @species, @nickname, @level, @nature, @ability, @slot, @moves)`,
)
const updateMember = db.prepare(
  `UPDATE team_members SET species=@species, nickname=@nickname, level=@level,
   nature=@nature, ability=@ability, slot=@slot, moves=@moves WHERE id=@id`,
)
const deleteMember = db.prepare('DELETE FROM team_members WHERE id = ?')

function rowToMember(row: any) {
  return { ...row, moves: JSON.parse(row.moves || '[]') }
}

runsRouter.get('/:id/team', (req, res) => {
  res.json((listTeam.all(req.params.id) as any[]).map(rowToMember))
})

runsRouter.post('/:id/team', (req, res) => {
  const b = req.body ?? {}
  if (!b.species) return res.status(400).json({ error: 'species es obligatorio' })
  const info = insertMember.run({
    run_id: Number(req.params.id),
    species: String(b.species),
    nickname: b.nickname ?? null,
    level: Number(b.level) || 5,
    nature: b.nature ?? null,
    ability: b.ability ?? null,
    slot: Number(b.slot) || 0,
    moves: JSON.stringify(Array.isArray(b.moves) ? b.moves : []),
  })
  res.status(201).json(rowToMember(getMember.get(info.lastInsertRowid)))
})

runsRouter.put('/:id/team/:memberId', (req, res) => {
  const existing = getMember.get(req.params.memberId) as any
  if (!existing) return res.status(404).json({ error: 'miembro no encontrado' })
  const b = req.body ?? {}
  updateMember.run({
    id: Number(req.params.memberId),
    species: b.species ?? existing.species,
    nickname: b.nickname ?? existing.nickname,
    level: Number(b.level) || existing.level,
    nature: b.nature ?? existing.nature,
    ability: b.ability ?? existing.ability,
    slot: b.slot ?? existing.slot,
    moves: JSON.stringify(Array.isArray(b.moves) ? b.moves : JSON.parse(existing.moves)),
  })
  res.json(rowToMember(getMember.get(req.params.memberId)))
})

runsRouter.delete('/:id/team/:memberId', (req, res) => {
  deleteMember.run(req.params.memberId)
  res.status(204).end()
})

// --- Medallas (badges) ---
const listBadges = db.prepare('SELECT * FROM badges WHERE run_id = ? ORDER BY obtained_at')
const insertBadge = db.prepare('INSERT INTO badges (run_id, name) VALUES (?, ?)')
const deleteBadge = db.prepare('DELETE FROM badges WHERE id = ?')

runsRouter.get('/:id/badges', (req, res) => res.json(listBadges.all(req.params.id)))
runsRouter.post('/:id/badges', (req, res) => {
  if (!req.body?.name) return res.status(400).json({ error: 'name es obligatorio' })
  const info = insertBadge.run(Number(req.params.id), String(req.body.name))
  res.status(201).json({ id: info.lastInsertRowid })
})
runsRouter.delete('/:id/badges/:badgeId', (req, res) => {
  deleteBadge.run(req.params.badgeId)
  res.status(204).end()
})

// --- Notas de estrategia ---
const listNotes = db.prepare('SELECT * FROM strategy_notes WHERE run_id = ? ORDER BY updated_at DESC')
const insertNote = db.prepare('INSERT INTO strategy_notes (run_id, target, body) VALUES (?, ?, ?)')
const updateNote = db.prepare(
  `UPDATE strategy_notes SET target=?, body=?, updated_at=datetime('now') WHERE id=?`,
)
const deleteNote = db.prepare('DELETE FROM strategy_notes WHERE id = ?')

runsRouter.get('/:id/notes', (req, res) => res.json(listNotes.all(req.params.id)))
runsRouter.post('/:id/notes', (req, res) => {
  const { target, body } = req.body ?? {}
  if (!target) return res.status(400).json({ error: 'target es obligatorio' })
  const info = insertNote.run(Number(req.params.id), String(target), String(body ?? ''))
  res.status(201).json({ id: info.lastInsertRowid })
})
runsRouter.put('/:id/notes/:noteId', (req, res) => {
  const { target, body } = req.body ?? {}
  updateNote.run(String(target ?? ''), String(body ?? ''), Number(req.params.noteId))
  res.json({ ok: true })
})
runsRouter.delete('/:id/notes/:noteId', (req, res) => {
  deleteNote.run(req.params.noteId)
  res.status(204).end()
})
