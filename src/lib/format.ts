import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import type { Coordinates, Trip } from '../types'

export const uid = (prefix = 'id') => `${prefix}_${crypto.randomUUID()}`

export function formatDate(value?: string, pattern = 'MMM d, yyyy') {
  if (!value) return 'Open ended'
  const date = parseISO(value)
  return isValid(date) ? format(date, pattern) : value
}

export function tripDuration(trip: Trip) {
  const start = parseISO(trip.startDate)
  const end = trip.endDate ? parseISO(trip.endDate) : new Date()
  if (!isValid(start) || !isValid(end)) return 0
  return Math.max(1, differenceInCalendarDays(end, start) + 1)
}

function radians(value: number) {
  return (value * Math.PI) / 180
}

export function distanceKm(a: Coordinates, b: Coordinates) {
  const radius = 6371
  const lat = radians(b.lat - a.lat)
  const lng = radians(b.lng - a.lng)
  const h = Math.sin(lat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lng / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function tripDistance(trip: Trip) {
  const points = trip.route.length > 1 ? trip.route : trip.stops
  return points.slice(1).reduce((sum, point, index) => sum + distanceKm(points[index], point), 0)
}

export function compactDistance(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k km` : `${Math.round(value)} km`
}

export function countryCount(trips: Trip[]) {
  return new Set(trips.flatMap((trip) => trip.stops.map((stop) => stop.country)).filter(Boolean)).size
}

export function photoCount(memories: { photos: unknown[] }[]) {
  return memories.reduce((sum, memory) => sum + memory.photos.length, 0)
}
