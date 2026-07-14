import { pokeFetch } from './pokeapi.ts'
import { effectiveness } from './typeChart.ts'
import type { TeamMember } from './recommend.ts'
import type { OpponentMon } from '../data/trainers.ts'

export const ALL_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark',
  'steel', 'fairy',
]

const MAX_EXAMPLES = 8

// Mapea el juego de la partida a la Pokédex regional para filtrar capturas.
function dexForGame(game: string): string | null {
  if (['FireRed', 'LeafGreen'].includes(game)) return 'kanto'
  if (['Ruby', 'Sapphire', 'Emerald'].includes(game)) return 'hoenn'
  return null
}

async function typesOf(species: string): Promise<string[]> {
  const data = await pokeFetch(`pokemon/${species.toLowerCase().trim()}`)
  return data.types.map((t: any) => t.type.name)
}

async function moveType(move: string): Promise<string | null> {
  try {
    const data = await pokeFetch(`move/${move.toLowerCase().trim()}`)
    if (data.damage_class?.name === 'status') return null
    return data.type.name
  } catch {
    return null
  }
}

/** Especies de la Pokédex regional del juego (para sugerir solo capturas
 * disponibles). Devuelve null si el juego no tiene dex mapeada. */
async function dexSpecies(game: string): Promise<Set<string> | null> {
  const dex = dexForGame(game)
  if (!dex) return null
  const data = await pokeFetch(`pokedex/${dex}`)
  return new Set(data.pokemon_entries.map((e: any) => e.pokemon_species.name))
}

async function speciesOfType(type: string): Promise<string[]> {
  const data = await pokeFetch(`type/${type}`)
  return data.pokemon.map((p: any) => p.pokemon.name)
}

export interface CatchSuggestion {
  type: string
  superEffectiveVs: number // cuántos Pokémon del rival golpea x2+
  totalEnemies: number
  examples: string[]
}

export interface SuggestResult {
  game: string
  coveredTypes: string[] // tipos de ataque que tu equipo ya tiene
  suggestions: CatchSuggestion[]
}

/** Analiza la cobertura ofensiva del equipo contra el equipo del rival y
 * sugiere tipos (y Pokémon capturables) que cubran los huecos. */
export async function suggestCatches(
  team: TeamMember[],
  enemies: OpponentMon[],
  game: string,
): Promise<SuggestResult> {
  // 1. Tipos de los Pokémon rivales
  const enemyTypes: string[][] = []
  for (const e of enemies) {
    try {
      enemyTypes.push(await typesOf(e.species))
    } catch {
      /* ignorar especies no resueltas */
    }
  }

  // 2. Tipos de ataque que tu equipo ya cubre (movimientos de daño + STAB)
  const covered = new Set<string>()
  for (const m of team) {
    try {
      for (const t of await typesOf(m.species)) covered.add(t) // STAB
    } catch { /* noop */ }
    for (const mv of m.moves) {
      const t = await moveType(mv)
      if (t) covered.add(t)
    }
  }

  // 3. Para cada tipo de ataque, contar contra cuántos rivales es supereficaz
  const ranked: { type: string; hits: number }[] = []
  for (const atk of ALL_TYPES) {
    let hits = 0
    for (const def of enemyTypes) {
      if ((await effectiveness(atk, def)) >= 2) hits++
    }
    ranked.push({ type: atk, hits })
  }
  ranked.sort((a, b) => b.hits - a.hits)

  // 4. Recomendar los mejores tipos que el equipo NO cubre y que existan en el juego
  const dex = await dexSpecies(game)
  const teamSpecies = new Set(team.map((m) => m.species.toLowerCase()))
  const suggestions: CatchSuggestion[] = []

  for (const r of ranked) {
    if (r.hits === 0) break // ya no aportan ventaja
    if (covered.has(r.type)) continue // el equipo ya lo cubre

    let names = await speciesOfType(r.type)
    if (dex) names = names.filter((n) => dex.has(n))
    names = names.filter((n) => !teamSpecies.has(n)).slice(0, MAX_EXAMPLES)
    if (names.length === 0) continue // sin capturas disponibles en este juego

    suggestions.push({
      type: r.type,
      superEffectiveVs: r.hits,
      totalEnemies: enemyTypes.length,
      examples: names,
    })
    if (suggestions.length >= 3) break
  }

  return { game, coveredTypes: [...covered], suggestions }
}
