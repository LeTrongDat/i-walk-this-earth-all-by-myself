import { distanceKm } from './format'
import type { Coordinates, DayPlan, Place, Visit } from '../types'

export function hasCoordinates(p: Partial<Coordinates> | undefined): p is Coordinates {
  return !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng)
}
export function routeLength(visits: Visit[], places: Place[], start?: Coordinates, end?: Coordinates) {
  const points = visits.map(v => places.find(p => p.id === v.placeId)!).filter(hasCoordinates) as Coordinates[]
  const route = [...start ? [start] : [], ...points, ...end ? [end] : []]
  return route.slice(1).reduce((total, p, i) => total + distanceKm(route[i], p), 0)
}

// Nearest-neighbour followed by 2-opt, within each unlocked segment only.
// It is a straight-line heuristic, not road routing or a guarantee of optimality.
export function suggestOrder(day: DayPlan, places: Place[]) {
  if (day.visits.length > 100) throw new Error('Optimize up to 100 visits per day. Split a longer plan across days.')
  const missing = day.visits.filter(v => !hasCoordinates(places.find(p => p.id === v.placeId)))
  const stay = places.find(p => p.id === day.accommodationId)
  if (missing.length || (day.accommodationId && !hasCoordinates(stay))) throw new Error('Add coordinates for every scheduled place and the accommodation before suggesting a route.')
  const start = stay || places.find(p => p.id === day.visits[0]?.placeId)
  const end = day.returnToStay ? stay : undefined
  const result = [...day.visits]
  const locks = day.visits.flatMap((v, i) => v.fixed || (!stay && i === 0) ? [i] : [])
  let from = 0
  for (const stop of [...locks, result.length]) {
    const segment = result.slice(from, stop)
    const origin = from ? places.find(p => p.id === result[from - 1].placeId) : start
    const target = stop < result.length ? places.find(p => p.id === result[stop].placeId) : end
    const ordered: Visit[] = []
    let current = origin
    const pending = [...segment]
    while (pending.length) {
      pending.sort((a, b) => distanceKm(current as Coordinates, places.find(p => p.id === a.placeId) as Coordinates) - distanceKm(current as Coordinates, places.find(p => p.id === b.placeId) as Coordinates))
      const next = pending.shift()!
      ordered.push(next); current = places.find(p => p.id === next.placeId)
    }
    for (let pass = 0; pass < 4; pass++) for (let i = 0; i < ordered.length - 1; i++) for (let j = i + 1; j < ordered.length; j++) {
      const candidate = [...ordered.slice(0, i), ...ordered.slice(i, j + 1).reverse(), ...ordered.slice(j + 1)]
      if (routeLength(candidate, places, origin as Coordinates, target as Coordinates) + .0001 < routeLength(ordered, places, origin as Coordinates, target as Coordinates)) ordered.splice(0, ordered.length, ...candidate)
    }
    if (routeLength(ordered, places, origin as Coordinates, target as Coordinates) < routeLength(segment, places, origin as Coordinates, target as Coordinates)) result.splice(from, segment.length, ...ordered)
    from = stop + 1
  }
  return { visits: result, before: routeLength(day.visits, places, start as Coordinates, end as Coordinates), after: routeLength(result, places, start as Coordinates, end as Coordinates) }
}

export function scheduleWarnings(visits: Visit[]) {
  const warnings: string[] = []
  let finish = 0
  visits.forEach((v, i) => {
    if (v.time) {
      const [h, m] = v.time.split(':').map(Number)
      const time = h * 60 + m
      if (time < finish) warnings.push(`Visit ${i + 1} overlaps an earlier visit. Travel time is not included.`)
      finish = Math.max(finish, time + v.duration)
    } else finish += v.duration
  })
  return warnings
}
