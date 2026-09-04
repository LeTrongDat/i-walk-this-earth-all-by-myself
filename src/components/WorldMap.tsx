import L from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { useEffect, useMemo } from 'react'
import type { LatLngBoundsExpression } from 'leaflet'
import type { Memory, Trip } from '../types'

function MapFocus({ trips, selectedTrip }: { trips: Trip[]; selectedTrip?: Trip }) {
  const map = useMap()

  useEffect(() => {
    const selectedPoints = selectedTrip ? (selectedTrip.route.length > 1 ? selectedTrip.route : selectedTrip.stops) : trips.flatMap((trip) => trip.stops)
    if (!selectedPoints.length) return
    if (selectedPoints.length === 1) {
      map.flyTo([selectedPoints[0].lat, selectedPoints[0].lng], selectedTrip ? 7 : 4, { duration: 1.2 })
      return
    }
    const bounds = selectedPoints.map((point) => [point.lat, point.lng]) as LatLngBoundsExpression
    map.flyToBounds(bounds, { padding: [58, 58], maxZoom: selectedTrip ? 7 : 4, duration: 1.2 })
  }, [map, selectedTrip, trips])
  return null
}

const pinIcon = (status: Trip['status'], hasPhoto: boolean) => L.divIcon({
  className: 'map-marker-wrap',
  html: `<span class="map-marker marker-${status}${hasPhoto ? ' has-photo' : ''}"><i></i></span>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
})

export function WorldMap({ trips, memories = [], selectedTripId, onSelectTrip, className = '' }: { trips: Trip[]; memories?: Memory[]; selectedTripId?: string; onSelectTrip?: (tripId: string) => void; className?: string }) {
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId)
  const visibleTrips = useMemo(() => selectedTrip ? [selectedTrip] : trips, [selectedTrip, trips])
  const routeSets = useMemo(() => visibleTrips.map((trip) => ({
    trip,
    points: (trip.route.length > 1 ? trip.route : trip.stops).map((point) => [point.lat, point.lng] as [number, number])
  })), [visibleTrips])

  return (
    <div className={`world-map ${className}`}>
      <MapContainer center={[18, 15]} zoom={2} minZoom={2} maxZoom={17} zoomControl attributionControl>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapFocus trips={trips} selectedTrip={selectedTrip} />
        {routeSets.map(({ trip, points }) => points.length > 1 && <Polyline key={trip.id} positions={points} pathOptions={{ color: trip.status === 'planned' ? '#668378' : '#ed5a3a', weight: selectedTrip ? 4 : 3, opacity: .9, dashArray: trip.status === 'planned' ? '4 10' : undefined }} />)}
        {visibleTrips.flatMap((trip) => trip.stops.map((stop, index) => {
          const memory = memories.find((item) => item.stopId === stop.id)
          return (
            <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={pinIcon(trip.status, Boolean(memory?.photos.length))} eventHandlers={{ click: () => onSelectTrip?.(trip.id) }}>
              <Tooltip direction="top" offset={[0, -12]}><strong>{stop.name}</strong><br /><span>{trip.title} · Step {index + 1}</span></Tooltip>
            </Marker>
          )
        }))}
      </MapContainer>
    </div>
  )
}
