// Colores canónicos de los 18 tipos de Pokémon.
const TYPE_COLORS: Record<string, string> = {
  normal: '#a8a77a',
  fire: '#ee8130',
  water: '#6390f0',
  electric: '#f7d02c',
  grass: '#7ac74c',
  ice: '#96d9d6',
  fighting: '#c22e28',
  poison: '#a33ea1',
  ground: '#e2bf65',
  flying: '#a98ff3',
  psychic: '#f95587',
  bug: '#a6b91a',
  rock: '#b6a136',
  ghost: '#735797',
  dragon: '#6f35fc',
  dark: '#705746',
  steel: '#b7b7ce',
  fairy: '#d685ad',
}

const TYPE_ES: Record<string, string> = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico',
  grass: 'Planta', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno',
  ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
  rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro',
  steel: 'Acero', fairy: 'Hada',
}

export function TypeBadge({ type }: { type: string }) {
  const t = type.toLowerCase()
  return (
    <span className="type-badge" style={{ background: TYPE_COLORS[t] ?? '#777' }}>
      {TYPE_ES[t] ?? t}
    </span>
  )
}

export function TypeBadges({ types }: { types: string[] }) {
  return (
    <span className="type-badges">
      {types.map((t) => (
        <TypeBadge key={t} type={t} />
      ))}
    </span>
  )
}
