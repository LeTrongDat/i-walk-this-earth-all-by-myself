import { describe, expect, it } from 'vitest'
import { compactDistance, countryCount, distanceKm, tripDistance, tripDuration } from './format'
import type { Trip } from '../types'

const trip: Trip = {
  id: 'test', title: 'Test', summary: '', cover: '', startDate: '2026-01-01', endDate: '2026-01-03', status: 'completed', visibility: 'private', createdAt: '', updatedAt: '', route: [],
  stops: [
    { id: 'a', name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, arrivalDate: '2026-01-01', transport: 'train', activities: [] },
    { id: 'b', name: 'London', country: 'United Kingdom', lat: 51.5072, lng: -0.1276, arrivalDate: '2026-01-02', transport: 'train', activities: [] }
  ]
}

describe('travel calculations', () => {
  it('calculates trip duration inclusively', () => expect(tripDuration(trip)).toBe(3))
  it('calculates realistic distance', () => expect(distanceKm(trip.stops[0], trip.stops[1])).toBeGreaterThan(330))
  it('uses stops as the route fallback', () => expect(tripDistance(trip)).toBeGreaterThan(330))
  it('counts unique countries', () => expect(countryCount([trip, trip])).toBe(2))
  it('formats compact distance', () => expect(compactDistance(2432)).toBe('2.4k km'))
})
