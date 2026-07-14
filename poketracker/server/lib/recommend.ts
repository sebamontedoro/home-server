import { pokeFetch } from './pokeapi.ts'
import { effectiveness, bestEffectiveness } from './typeChart.ts'

export interface TeamMember {
  id: number
  species: string
  nickname?: string | null
  level: number
  moves: string[]
}

export interface OpponentInput {
  species?: string
  types?: string[]
  level?: number
}

interface Mon {
  name: string
  types: string[]
  speed: number // stat base de velocidad
}

const STAB = 1.5

async function resolveMon(species: string): Promise<Mon> {
  const data = await pokeFetch(`pokemon/${species.toLowerCase().trim()}`)
  return {
    name: data.name,
    types: data.types.map((t: any) => t.type.name),
    speed: data.stats.find((s: any) => s.stat.name === 'speed')?.base_stat ?? 0,
  }
}

function label(mult: number): string {
  if (mult === 0) return 'no le hace nada (inmune)'
  if (mult >= 4) return 'x4 (brutalmente eficaz)'
  if (mult >= 2) return 'x2 (supereficaz)'
  if (mult > 1) return 'algo eficaz'
  if (mult === 1) return 'daño normal'
  if (mult >= 0.5) return 'x0.5 (poco eficaz)'
  return 'x0.25 (casi nulo)'
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

/** Resuelve el rival a tipos (+velocidad si se conoce la especie). */
async function resolveOpponent(
  opp: OpponentInput,
): Promise<{ types: string[]; speed: number | null; label: string }> {
  if (opp.species) {
    const mon = await resolveMon(opp.species)
    return { types: mon.types, speed: mon.speed, label: mon.name }
  }
  const types = (opp.types ?? []).map((t) => t.toLowerCase())
  return { types, speed: null, label: types.join('/') || 'rival' }
}

export async function recommendTeam(
  team: TeamMember[],
  opp: OpponentInput,
): Promise<{ opponent: string; ranking: Recommendation[] }> {
  const opponent = await resolveOpponent(opp)
  const ranking: Recommendation[] = []

  for (const member of team) {
    const reasons: string[] = []
    let mon: Mon
    try {
      mon = await resolveMon(member.species)
    } catch {
      ranking.push({
        memberId: member.id,
        name: member.nickname || member.species,
        species: member.species,
        score: -999,
        bestMove: null,
        incomingMult: 1,
        faster: null,
        reasons: [`No pude encontrar datos de "${member.species}" en PokéAPI.`],
      })
      continue
    }

    // --- Ofensiva: mejor movimiento contra los tipos del rival ---
    let bestMove: Recommendation['bestMove'] = null
    for (const moveName of member.moves) {
      let move: any
      try {
        move = await pokeFetch(`move/${moveName.toLowerCase().trim()}`)
      } catch {
        continue
      }
      if (move.damage_class?.name === 'status') continue
      const moveType: string = move.type.name
      let mult = await effectiveness(moveType, opponent.types)
      if (mon.types.includes(moveType)) mult *= STAB // bonus STAB
      if (!bestMove || mult > bestMove.mult) {
        bestMove = { name: move.name, type: moveType, mult }
      }
    }

    // --- Defensiva: lo mejor que el rival le puede pegar (STAB del rival) ---
    const incoming = await bestEffectiveness(opponent.types, mon.types)

    // --- Velocidad ---
    const faster =
      opponent.speed == null ? null : mon.speed > opponent.speed

    // --- Score combinado ---
    let score = 0
    if (bestMove) score += bestMove.mult * 2
    score -= incoming.mult
    if (faster === true) score += 0.5
    if (faster === false) score -= 0.25

    // --- Razones legibles ---
    const who = member.nickname || cap(mon.name)
    if (bestMove) {
      reasons.push(
        `Su mejor golpe (${cap(bestMove.name)}, ${bestMove.type}) es ${label(bestMove.mult)}.`,
      )
    } else {
      reasons.push('No tiene movimientos de ataque cargados.')
    }
    reasons.push(
      `Recibe del rival un golpe ${label(incoming.mult)} (${incoming.type}).`,
    )
    if (faster === true) reasons.push('Es más rápido: pega primero.')
    if (faster === false) reasons.push('Es más lento: el rival pega primero.')

    ranking.push({
      memberId: member.id,
      name: who,
      species: mon.name,
      score: Math.round(score * 100) / 100,
      bestMove,
      incomingMult: incoming.mult,
      faster,
      reasons,
    })
  }

  ranking.sort((a, b) => b.score - a.score)
  return { opponent: opponent.label, ranking }
}

export interface Matchup {
  opponent: { species: string; level: number }
  topPicks: Recommendation[]
}

/** Plan de combate contra un equipo entero: para cada Pokémon rival devuelve
 * los mejores Pokémon de tu equipo (reutiliza recommendTeam por rival). */
export async function planAgainst(
  team: TeamMember[],
  opponents: { species: string; level: number }[],
): Promise<Matchup[]> {
  const matchups: Matchup[] = []
  for (const opp of opponents) {
    const { ranking } = await recommendTeam(team, { species: opp.species })
    matchups.push({ opponent: opp, topPicks: ranking.slice(0, 3) })
  }
  return matchups
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
