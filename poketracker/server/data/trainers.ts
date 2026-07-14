// Dataset curado de líderes de gimnasio, Alto Mando y Campeón de los juegos de
// GBA. Las especies van en formato PokéAPI (minúsculas, con guiones) para que el
// motor de recomendación las pueda resolver. Los niveles son orientativos del
// juego original (el motor usa stats base + tipos, no el nivel exacto).

export interface OpponentMon {
  species: string
  level: number
}

export interface Trainer {
  key: string
  name: string
  role: 'gym' | 'elite' | 'champion'
  type: string // especialidad, informativo
  games: string[] // valores que matchean run.game (FireRed, Emerald, …)
  order: number // para ordenar en la UI
  team: OpponentMon[]
}

const KANTO = ['FireRed', 'LeafGreen']
const HOENN = ['Ruby', 'Sapphire', 'Emerald']

export const TRAINERS: Trainer[] = [
  // ===== KANTO (FireRed / LeafGreen) =====
  { key: 'k-brock', name: 'Brock', role: 'gym', type: 'rock', games: KANTO, order: 1,
    team: [{ species: 'geodude', level: 12 }, { species: 'onix', level: 14 }] },
  { key: 'k-misty', name: 'Misty', role: 'gym', type: 'water', games: KANTO, order: 2,
    team: [{ species: 'staryu', level: 18 }, { species: 'starmie', level: 21 }] },
  { key: 'k-surge', name: 'Teniente Surge', role: 'gym', type: 'electric', games: KANTO, order: 3,
    team: [{ species: 'voltorb', level: 21 }, { species: 'pikachu', level: 18 }, { species: 'raichu', level: 24 }] },
  { key: 'k-erika', name: 'Erika', role: 'gym', type: 'grass', games: KANTO, order: 4,
    team: [{ species: 'victreebel', level: 29 }, { species: 'tangela', level: 24 }, { species: 'vileplume', level: 29 }] },
  { key: 'k-koga', name: 'Koga', role: 'gym', type: 'poison', games: KANTO, order: 5,
    team: [{ species: 'koffing', level: 37 }, { species: 'muk', level: 39 }, { species: 'koffing', level: 37 }, { species: 'weezing', level: 43 }] },
  { key: 'k-sabrina', name: 'Sabrina', role: 'gym', type: 'psychic', games: KANTO, order: 6,
    team: [{ species: 'kadabra', level: 38 }, { species: 'mr-mime', level: 37 }, { species: 'venomoth', level: 38 }, { species: 'alakazam', level: 43 }] },
  { key: 'k-blaine', name: 'Blaine', role: 'gym', type: 'fire', games: KANTO, order: 7,
    team: [{ species: 'growlithe', level: 42 }, { species: 'ponyta', level: 40 }, { species: 'rapidash', level: 42 }, { species: 'arcanine', level: 47 }] },
  { key: 'k-giovanni', name: 'Giovanni', role: 'gym', type: 'ground', games: KANTO, order: 8,
    team: [{ species: 'rhyhorn', level: 45 }, { species: 'dugtrio', level: 42 }, { species: 'nidoqueen', level: 44 }, { species: 'nidoking', level: 45 }, { species: 'rhydon', level: 50 }] },
  { key: 'k-lorelei', name: 'Lorelei (Alto Mando)', role: 'elite', type: 'ice', games: KANTO, order: 9,
    team: [{ species: 'dewgong', level: 52 }, { species: 'cloyster', level: 51 }, { species: 'slowbro', level: 52 }, { species: 'jynx', level: 54 }, { species: 'lapras', level: 54 }] },
  { key: 'k-bruno', name: 'Bruno (Alto Mando)', role: 'elite', type: 'fighting', games: KANTO, order: 10,
    team: [{ species: 'onix', level: 51 }, { species: 'hitmonchan', level: 53 }, { species: 'hitmonlee', level: 53 }, { species: 'onix', level: 54 }, { species: 'machamp', level: 56 }] },
  { key: 'k-agatha', name: 'Agatha (Alto Mando)', role: 'elite', type: 'ghost', games: KANTO, order: 11,
    team: [{ species: 'gengar', level: 54 }, { species: 'golbat', level: 54 }, { species: 'haunter', level: 53 }, { species: 'arbok', level: 56 }, { species: 'gengar', level: 58 }] },
  { key: 'k-lance', name: 'Lance (Alto Mando)', role: 'elite', type: 'dragon', games: KANTO, order: 12,
    team: [{ species: 'gyarados', level: 56 }, { species: 'dragonair', level: 54 }, { species: 'dragonair', level: 54 }, { species: 'aerodactyl', level: 58 }, { species: 'dragonite', level: 60 }] },
  { key: 'k-blue', name: 'Campeón Azul/Gary', role: 'champion', type: 'variado', games: KANTO, order: 13,
    team: [{ species: 'pidgeot', level: 59 }, { species: 'alakazam', level: 57 }, { species: 'rhydon', level: 59 }, { species: 'exeggutor', level: 59 }, { species: 'gyarados', level: 59 }, { species: 'arcanine', level: 61 }] },

  // ===== HOENN (Ruby / Sapphire / Emerald) =====
  { key: 'h-roxanne', name: 'Petra (Roxanne)', role: 'gym', type: 'rock', games: HOENN, order: 1,
    team: [{ species: 'geodude', level: 14 }, { species: 'geodude', level: 14 }, { species: 'nosepass', level: 15 }] },
  { key: 'h-brawly', name: 'Marcial (Brawly)', role: 'gym', type: 'fighting', games: HOENN, order: 2,
    team: [{ species: 'machop', level: 16 }, { species: 'meditite', level: 16 }, { species: 'makuhita', level: 19 }] },
  { key: 'h-wattson', name: 'Erico (Wattson)', role: 'gym', type: 'electric', games: HOENN, order: 3,
    team: [{ species: 'voltorb', level: 20 }, { species: 'electrike', level: 20 }, { species: 'magneton', level: 22 }, { species: 'manectric', level: 24 }] },
  { key: 'h-flannery', name: 'Candela (Flannery)', role: 'gym', type: 'fire', games: HOENN, order: 4,
    team: [{ species: 'numel', level: 24 }, { species: 'slugma', level: 24 }, { species: 'camerupt', level: 26 }, { species: 'torkoal', level: 29 }] },
  { key: 'h-norman', name: 'Norman', role: 'gym', type: 'normal', games: HOENN, order: 5,
    team: [{ species: 'slaking', level: 28 }, { species: 'vigoroth', level: 30 }, { species: 'linoone', level: 29 }, { species: 'slaking', level: 31 }] },
  { key: 'h-winona', name: 'Alana (Winona)', role: 'gym', type: 'flying', games: HOENN, order: 6,
    team: [{ species: 'swablu', level: 29 }, { species: 'tropius', level: 29 }, { species: 'pelipper', level: 30 }, { species: 'skarmory', level: 32 }, { species: 'altaria', level: 33 }] },
  { key: 'h-tateliza', name: 'Vito y Leti (Tate & Liza)', role: 'gym', type: 'psychic', games: HOENN, order: 7,
    team: [{ species: 'claydol', level: 41 }, { species: 'xatu', level: 41 }, { species: 'lunatone', level: 42 }, { species: 'solrock', level: 42 }] },
  // Gimnasio 8 difiere: Juan en Emerald, Plubio (Wallace) en Ruby/Sapphire
  { key: 'h-juan', name: 'Galán (Juan)', role: 'gym', type: 'water', games: ['Emerald'], order: 8,
    team: [{ species: 'luvdisc', level: 41 }, { species: 'whiscash', level: 41 }, { species: 'sealeo', level: 43 }, { species: 'crawdaunt', level: 43 }, { species: 'kingdra', level: 46 }] },
  { key: 'h-wallace-gym', name: 'Plubio (Wallace)', role: 'gym', type: 'water', games: ['Ruby', 'Sapphire'], order: 8,
    team: [{ species: 'luvdisc', level: 40 }, { species: 'whiscash', level: 42 }, { species: 'sealeo', level: 40 }, { species: 'seaking', level: 42 }, { species: 'milotic', level: 43 }] },
  { key: 'h-sidney', name: 'Sixto (Alto Mando)', role: 'elite', type: 'dark', games: HOENN, order: 9,
    team: [{ species: 'mightyena', level: 46 }, { species: 'shiftry', level: 48 }, { species: 'cacturne', level: 46 }, { species: 'crawdaunt', level: 48 }, { species: 'absol', level: 49 }] },
  { key: 'h-phoebe', name: 'Fátima (Alto Mando)', role: 'elite', type: 'ghost', games: HOENN, order: 10,
    team: [{ species: 'dusclops', level: 48 }, { species: 'banette', level: 49 }, { species: 'sableye', level: 50 }, { species: 'banette', level: 49 }, { species: 'dusclops', level: 51 }] },
  { key: 'h-glacia', name: 'Nívea (Alto Mando)', role: 'elite', type: 'ice', games: HOENN, order: 11,
    team: [{ species: 'sealeo', level: 50 }, { species: 'glalie', level: 50 }, { species: 'sealeo', level: 52 }, { species: 'glalie', level: 52 }, { species: 'walrein', level: 53 }] },
  { key: 'h-drake', name: 'Dracón (Alto Mando)', role: 'elite', type: 'dragon', games: HOENN, order: 12,
    team: [{ species: 'shelgon', level: 52 }, { species: 'altaria', level: 54 }, { species: 'flygon', level: 53 }, { species: 'flygon', level: 53 }, { species: 'salamence', level: 55 }] },
  // Campeón difiere: Plubio (Wallace) en Emerald, Máximo (Steven) en Ruby/Sapphire
  { key: 'h-wallace-champ', name: 'Campeón Plubio (Wallace)', role: 'champion', type: 'water', games: ['Emerald'], order: 13,
    team: [{ species: 'wailord', level: 57 }, { species: 'tentacruel', level: 55 }, { species: 'ludicolo', level: 56 }, { species: 'whiscash', level: 56 }, { species: 'gyarados', level: 56 }, { species: 'milotic', level: 58 }] },
  { key: 'h-steven-champ', name: 'Campeón Máximo (Steven)', role: 'champion', type: 'steel', games: ['Ruby', 'Sapphire'], order: 13,
    team: [{ species: 'skarmory', level: 57 }, { species: 'claydol', level: 55 }, { species: 'aggron', level: 56 }, { species: 'cradily', level: 56 }, { species: 'armaldo', level: 56 }, { species: 'metagross', level: 58 }] },
]

export function trainersForGame(game: string): Trainer[] {
  return TRAINERS.filter((t) => t.games.includes(game)).sort(
    (a, b) => a.order - b.order || a.role.localeCompare(b.role),
  )
}

export function getTrainer(key: string): Trainer | undefined {
  return TRAINERS.find((t) => t.key === key)
}
