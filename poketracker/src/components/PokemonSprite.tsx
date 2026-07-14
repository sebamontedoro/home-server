import { useMon } from '../api/useMon.ts'
import { TypeBadges } from './TypeBadge.tsx'

interface Props {
  species: string
  size?: number
  showTypes?: boolean
}

// Sprite del Pokémon (desde PokéAPI) con sus tipos opcionales. Si no hay sprite
// muestra una pokébola como placeholder.
export function PokemonSprite({ species, size = 56, showTypes }: Props) {
  const mon = useMon(species)
  return (
    <div className="sprite-wrap">
      <div className="sprite" style={{ width: size, height: size }}>
        {mon.data?.sprite ? (
          <img src={mon.data.sprite} alt={species} width={size} height={size} loading="lazy" />
        ) : (
          <span className="ball" style={{ fontSize: size * 0.5 }}>
            ⚪
          </span>
        )}
      </div>
      {showTypes && mon.data?.types && <TypeBadges types={mon.data.types} />}
    </div>
  )
}
