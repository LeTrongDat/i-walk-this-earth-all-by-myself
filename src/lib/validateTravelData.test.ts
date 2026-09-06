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
})
