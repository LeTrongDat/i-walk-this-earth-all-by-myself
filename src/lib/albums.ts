import type { Memory, Photo, TravelState, Trip } from '../types'

export type AlbumEntry = { photo: Photo; tripId: string; cityId: string; city: string; country: string; placeId: string; place: string; memoryId?: string }
export function albumEntries(trips: Trip[], memories: Memory[]): AlbumEntry[] {
  return trips.flatMap(trip => [
    ...trip.stops.flatMap(city => (city.places ?? []).flatMap(place => place.photos.map(photo => ({ photo, tripId: trip.id, cityId: city.id, city: city.name, country: city.country, placeId: place.id, place: place.name })))),
    ...memories.filter(m => m.tripId === trip.id).flatMap(memory => {
      const city = trip.stops.find(c => c.id === memory.stopId)
      return memory.photos.map(photo => ({ photo: { ...photo, date: photo.date || memory.date }, tripId: trip.id, cityId: city?.id ?? '', city: city?.name ?? memory.place, country: city?.country ?? '', placeId: '', place: memory.title, memoryId: memory.id }))
    })
  ])
}
export function allPhotos(data: TravelState): Photo[] {
  return [...data.memories.flatMap(m => m.photos), ...data.trips.flatMap(t => t.stops.flatMap(c => c.places?.flatMap(p => p.photos) ?? []))]
}
