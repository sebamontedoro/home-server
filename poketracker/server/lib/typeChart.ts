import { pokeFetch } from './pokeapi.ts'

// Cache en memoria de las relaciones de daño por tipo (además del cache de DB).
const relationsCache = new Map<string, TypeRelations>()

interface TypeRelations {
  double_to: string[]
  half_to: string[]
  no_to: string[]
}

async function getRelations(type: string): Promise<TypeRelations> {
  const t = type.toLowerCase()
  const hit = relationsCache.get(t)
  if (hit) return hit
  const data = await pokeFetch(`type/${t}`)
  const rel: TypeRelations = {
    double_to: data.damage_relations.double_damage_to.map((x: any) => x.name),
    half_to: data.damage_relations.half_damage_to.map((x: any) => x.name),
    no_to: data.damage_relations.no_damage_to.map((x: any) => x.name),
  }
  relationsCache.set(t, rel)
  return rel
}

/** Multiplicador de un movimiento de tipo `attacking` contra un defensor de
 * tipos `defenderTypes` (1 o 2 tipos). Ej: 0, 0.25, 0.5, 1, 2, 4. */
export async function effectiveness(
  attacking: string,
  defenderTypes: string[],
): Promise<number> {
  const rel = await getRelations(attacking)
  let mult = 1
  for (const def of defenderTypes) {
    const d = def.toLowerCase()
    if (rel.no_to.includes(d)) mult *= 0
    else if (rel.double_to.includes(d)) mult *= 2
    else if (rel.half_to.includes(d)) mult *= 0.5
  }
  return mult
}

/** El mejor (mayor) multiplicador que un conjunto de tipos atacantes logra
 * contra un defensor. Sirve para estimar el STAB del rival. */
export async function bestEffectiveness(
  attackingTypes: string[],
  defenderTypes: string[],
): Promise<{ mult: number; type: string }> {
  let best = { mult: 0, type: attackingTypes[0] ?? 'normal' }
  for (const atk of attackingTypes) {
    const m = await effectiveness(atk, defenderTypes)
    if (m > best.mult) best = { mult: m, type: atk }
  }
  return best
}
