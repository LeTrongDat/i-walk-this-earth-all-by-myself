import type { Memory, Photo, Profile, RoutePoint, Stop, TravelState, Trip } from '../types'

function invalid(path: string): never { throw new Error(`Invalid atlas data: ${path}.`) }
function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid(path)
  return value as Record<string, unknown>
}
function string(value: unknown, path: string, required = false): string {
  if (typeof value !== 'string' || (required && !value.trim())) return invalid(path)
  return required ? value.trim() : value
}
function optional(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : string(value, path)
}
function list<T>(value: unknown, path: string, parse: (item: unknown, path: string) => T): T[] {
  if (!Array.isArray(value)) return invalid(path)
  return value.map((item, index) => parse(item, `${path}[${index}]`))
}
function choice<T extends string>(value: unknown, path: string, values: readonly T[]): T {
  if (typeof value !== 'string' || !values.includes(value as T)) return invalid(path)
  return value as T
}
function date(value: unknown, path: string): string {
  const text = string(value, path, true)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text) return invalid(path)
  return text
}
function timestamp(value: unknown, path: string): string {
  const text = string(value, path, true)
  if (!/^\d{4}-\d{2}-\d{2}T/.test(text) || !Number.isFinite(Date.parse(text))) return invalid(path)
  date(text.slice(0, 10), path)
  return text
}
function number(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return invalid(path)
  return value
}
function coordinates(value: Record<string, unknown>, path: string) {
  return { lat: number(value.lat, `${path}.lat`, -90, 90), lng: number(value.lng, `${path}.lng`, -180, 180) }
}
function unique<T extends { id: string }>(items: T[], path: string): T[] {
  if (new Set(items.map(item => item.id)).size !== items.length) return invalid(`${path}: duplicate ID`)
  return items
}
function photo(value: unknown, path: string): Photo {
  const v = object(value, path)
  return { id: string(v.id, `${path}.id`, true), src: string(v.src, `${path}.src`, true), caption: optional(v.caption, `${path}.caption`) }
}
function stop(value: unknown, path: string): Stop {
  const v = object(value, path)
  const arrivalDate = date(v.arrivalDate, `${path}.arrivalDate`)
  const departureDate = v.departureDate === undefined ? undefined : date(v.departureDate, `${path}.departureDate`)
  if (departureDate && departureDate < arrivalDate) return invalid(`${path}: departure precedes arrival`)
  return {
    id: string(v.id, `${path}.id`, true), name: string(v.name, `${path}.name`, true), country: string(v.country, `${path}.country`),
    ...coordinates(v, path), arrivalDate, departureDate,
    transport: choice(v.transport, `${path}.transport`, ['walk', 'bike', 'car', 'train', 'boat', 'flight', 'other']),
    activities: list(v.activities, `${path}.activities`, (item, p) => string(item, p, true)),
    notes: optional(v.notes, `${path}.notes`), accommodation: optional(v.accommodation, `${path}.accommodation`)
  }
}
function routePoint(value: unknown, path: string): RoutePoint {
  const v = object(value, path)
  return { id: string(v.id, `${path}.id`, true), ...coordinates(v, path), capturedAt: timestamp(v.capturedAt, `${path}.capturedAt`), accuracy: v.accuracy === undefined ? undefined : number(v.accuracy, `${path}.accuracy`, 0, Number.MAX_VALUE) }
}
function trip(value: unknown, path: string): Trip {
  const v = object(value, path)
  const startDate = date(v.startDate, `${path}.startDate`)
  const endDate = v.endDate === undefined ? undefined : date(v.endDate, `${path}.endDate`)
  if (endDate && endDate < startDate) return invalid(`${path}: end precedes start`)
  return {
    id: string(v.id, `${path}.id`, true), title: string(v.title, `${path}.title`, true), summary: string(v.summary, `${path}.summary`), cover: string(v.cover, `${path}.cover`),
    startDate, endDate, status: choice(v.status, `${path}.status`, ['planned', 'active', 'completed']), visibility: choice(v.visibility, `${path}.visibility`, ['private', 'link', 'public']),
    createdAt: timestamp(v.createdAt, `${path}.createdAt`), updatedAt: timestamp(v.updatedAt, `${path}.updatedAt`),
    stops: unique(list(v.stops, `${path}.stops`, stop), `${path}.stops`), route: unique(list(v.route, `${path}.route`, routePoint), `${path}.route`)
  }
}
function memory(value: unknown, path: string): Memory {
  const v = object(value, path)
  const photos = unique(list(v.photos, `${path}.photos`, photo), `${path}.photos`)
  return {
    id: string(v.id, `${path}.id`, true), tripId: string(v.tripId, `${path}.tripId`, true), stopId: v.stopId === undefined ? undefined : string(v.stopId, `${path}.stopId`, true),
    title: string(v.title, `${path}.title`, true), story: string(v.story, `${path}.story`, true), date: date(v.date, `${path}.date`),
    place: string(v.place, `${path}.place`), mood: string(v.mood, `${path}.mood`), ...coordinates(v, path), photos
  }
}
function profile(value: unknown): Profile {
  const v = object(value, 'profile')
  return { name: string(v.name, 'profile.name', true), home: string(v.home, 'profile.home'), bio: string(v.bio, 'profile.bio'), avatar: string(v.avatar, 'profile.avatar') }
}

// Reconstruct schema fields: imports cannot overwrite store methods or flags.
export function validateTravelData(value: unknown): TravelState {
  const v = object(value, 'atlas')
  const trips = unique(list(v.trips, 'trips', trip), 'trips')
  unique(trips.flatMap(item => item.stops), 'stops')
  const memories = unique(list(v.memories, 'memories', memory), 'memories')
  for (const item of memories) {
    const parent = trips.find(t => t.id === item.tripId)
    if (!parent || (item.stopId !== undefined && !parent.stops.some(s => s.id === item.stopId))) invalid(`memory ${item.id}: missing trip or stop`)
  }
  const trackingTripId = v.trackingTripId === null ? null : string(v.trackingTripId, 'trackingTripId', true)
  if (trackingTripId && !trips.some(t => t.id === trackingTripId)) invalid('trackingTripId: missing trip')
  if (typeof v.hasSeenWelcome !== 'boolean') invalid('hasSeenWelcome')
  return { trips, memories, profile: profile(v.profile), trackingTripId, hasSeenWelcome: v.hasSeenWelcome }
}
