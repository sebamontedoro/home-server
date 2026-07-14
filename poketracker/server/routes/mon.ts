import { Router } from 'express'
import { pokeFetch } from '../lib/pokeapi.ts'

// Info mínima de un Pokémon para la UI (sprite + tipos), sin el JSON enorme de
// /pokemon. Se apoya en el caché de PokéAPI.
export const monRouter = Router()

monRouter.get('/mon/:species', async (req, res) => {
  const species = String(req.params.species).toLowerCase().trim()
  try {
    const data = await pokeFetch(`pokemon/${species}`)
    res.json({
      id: data.id,
      name: data.name,
      types: data.types.map((t: any) => t.type.name),
      sprite:
        data.sprites?.front_default ??
        data.sprites?.other?.['official-artwork']?.front_default ??
        null,
    })
  } catch (err: any) {
    res.status(404).json({ error: `No encontré "${species}" en PokéAPI` })
  }
})
