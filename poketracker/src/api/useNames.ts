import { useQuery } from '@tanstack/react-query'
import { api } from './client.ts'

// Lista completa de nombres (Pokémon o movimientos) para autocompletar.
// Se cachea de forma permanente: rara vez cambia y el backend ya la cachea.
export function useNames(kind: 'pokemon' | 'move') {
  return useQuery<string[]>({
    queryKey: ['names', kind],
    queryFn: () => api.get(`/names/${kind}`),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
