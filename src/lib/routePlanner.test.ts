import { expect, it } from 'vitest'
import { suggestOrder, scheduleWarnings } from './routePlanner'
import type { DayPlan, Place } from '../types'

const places: Place[] = [0, 1, 4, 2, 3].map((lng, i) => ({ id: `p${i}`, name: `Place ${i}`, lat: 0, lng, category: i ? 'sight' : 'stay', address: '', mapUrl: '', notes: '', ideas: '', links: [], visited: false, photos: [] }))
const day: DayPlan = { id: 'day', date: '2026-09-06', cityId: 'city', accommodationId: 'p0', returnToStay: true, notes: '', visits: [1, 2, 3, 4].map(i => ({ id: `v${i}`, placeId: `p${i}`, time: '', duration: 60, fixed: false, notes: '' })) }
it('never worsens distance or loses visits', () => {
  const result = suggestOrder(day, places)
  expect(result.after).toBeLessThanOrEqual(result.before)
  expect(result.visits.map(v => v.id).sort()).toEqual(day.visits.map(v => v.id).sort())
  expect(day.visits.map(v => v.placeId)).toEqual(['p1', 'p2', 'p3', 'p4'])
})
it('keeps fixed visits in their original positions', () => {
  const locked = structuredClone(day)
  locked.visits[1].fixed = true
  const result = suggestOrder(locked, places)
  expect(result.visits[1]).toEqual(locked.visits[1])
})
it('rejects missing coordinates rather than making up distances', () => {
  expect(() => suggestOrder(day, places.map(p => ({ ...p, lat: undefined })))).toThrow('coordinates')
})
it('handles no visits and one visit', () => {
  expect(suggestOrder({ ...day, visits: [] }, places).visits).toEqual([])
  expect(suggestOrder({ ...day, visits: day.visits.slice(0, 1) }, places).visits).toEqual(day.visits.slice(0, 1))
})
it('warns about overlapping explicit times', () => {
  expect(scheduleWarnings([{ ...day.visits[0], time: '12:00' }, { ...day.visits[1], time: '12:30' }])).toHaveLength(1)
})
it('keeps the latest finish when an overlapping short visit ends earlier', () => {
  expect(scheduleWarnings([{ ...day.visits[0], time: '12:00', duration: 180 }, { ...day.visits[1], time: '12:30', duration: 10 }, { ...day.visits[2], time: '14:00', duration: 20 }])).toHaveLength(2)
})
