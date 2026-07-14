import { useQuery } from '@tanstack/react-query'
import { api } from './client.ts'

export interface MonInfo {
  id: number
  name: string
  types: string[]
  sprite: string | null
}

// Info liviana (sprite + tipos) de un Pokémon, cacheada de forma permanente.
export function useMon(species: string | null | undefined) {
  return useQuery<MonInfo>({
    queryKey: ['mon', species],
    queryFn: () => api.get(`/mon/${species}`),
    enabled: !!species,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
}
