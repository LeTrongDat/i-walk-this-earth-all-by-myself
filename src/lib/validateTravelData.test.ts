import { describe, expect, it } from 'vitest'
import { sampleTrips, sampleMemories } from '../data/sample'
import { validateTravelData } from './validateTravelData'

function atlas() {
  return structuredClone({ trips: sampleTrips, memories: sampleMemories, profile: { name: 'Dat', home: '', bio: '', avatar: '' }, trackingTripId: null, hasSeenWelcome: true })
}

describe('backup validation', () => {
  it('round trips existing data without losing records', () => {
    const data = atlas()
    expect(validateTravelData(JSON.parse(JSON.stringify(data)))).toEqual(data)
  })
  it('rejects malformed nested records', () => {
    const data = atlas()
    data.trips[0].stops[0].lat = NaN
    expect(() => validateTravelData(data)).toThrow()
    expect(() => validateTravelData({ trips: [{}], memories: [], profile: {} })).toThrow()
  })
  it('rejects orphaned memories and duplicate ids', () => {
    const data = atlas()
    data.memories[0].tripId = 'missing'
    expect(() => validateTravelData(data)).toThrow()
    const duplicate = atlas()
    duplicate.trips.push(duplicate.trips[0])
    expect(() => validateTravelData(duplicate)).toThrow()
  })
  it('strips store method names and transient flags from imports', () => {
    const data = atlas()
    expect(validateTravelData({ ...data, hydrated: false, addTrip: 'injected' })).toEqual(data)
  })
  it('rejects impossible dates', () => {
    const data = atlas()
    data.trips[0].startDate = '2026-02-30'
    expect(() => validateTravelData(data)).toThrow()
  })
  it('round trips place albums and day plans, rejecting dangling references', () => {
    const data = atlas()
    const city = data.trips[0].stops[0]
    city.places = [{ id: 'hotel', name: 'Hotel', category: 'stay', address: '12 Main', mapUrl: '', notes: 'Check in at 3', ideas: 'Room tour', links: ['https://example.com'], visited: false, lat: 21, lng: 105, photos: [{ id: 'original', src: 'local-photo:original', name: 'original.png', favorite: true }] }]
    data.trips[0].days = [{ id: 'day', date: '2026-09-06', cityId: city.id, accommodationId: 'hotel', returnToStay: true, notes: 'Rest', visits: [{ id: 'visit', placeId: 'hotel', time: '15:00', duration: 60, fixed: true, notes: 'Reservation' }] }]
    expect(validateTravelData(data)).toEqual(data)
    data.trips[0].days[0].visits[0].placeId = 'missing'
    expect(() => validateTravelData(data)).toThrow('missing place')
  })
  it('rejects executable photo URLs and unsafe place links', () => {
    const data = atlas()
    data.memories[0].photos[0].src = 'javascript:alert(1)'
    expect(() => validateTravelData(data)).toThrow('unsupported photo source')
    data.memories[0].photos[0].src = 'https://example.com/image.png'
    data.trips[0].stops[0].places = [{ id: 'place', name: 'Place', category: 'sight', address: '', mapUrl: 'javascript:alert(1)', notes: '', ideas: '', links: [], visited: false, photos: [] }]
    expect(() => validateTravelData(data)).toThrow('http or https')
  })
})
