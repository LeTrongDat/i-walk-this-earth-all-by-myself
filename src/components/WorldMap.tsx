import { useEffect, useMemo, useRef } from 'react'
import Map, { Layer, Marker, NavigationControl, Source, type MapRef } from 'react-map-gl/maplibre'
import { LngLatBounds } from 'maplibre-gl'
import type { Memory, Trip } from '../types'

const ENGLISH_MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

function applyEnglishLabels(map: ReturnType<MapRef['getMap']>) {
  const style = map.getStyle()
  for (const layer of style.layers ?? []) {
    if (layer.type !== 'symbol') continue
    const current = map.getLayoutProperty(layer.id, 'text-field')
    if (current === undefined || !JSON.stringify(current).includes('name')) continue
    try {
      map.setLayoutProperty(layer.id, 'text-field', [
        'coalesce',
        ['get', 'name_en'],
        ['get', 'name:en'],
        ['get', 'name']
      ])
    } catch {
      // Route-number and icon-only symbol layers do not use place names.
    }
  }
}

export function WorldMap({ trips, memories = [], selectedTripId, onSelectTrip, className = '' }: { trips: Trip[]; memories?: Memory[]; selectedTripId?: string; onSelectTrip?: (tripId: string) => void; className?: string }) {
  const mapRef = useRef<MapRef>(null)
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId)
  const visibleTrips = useMemo(() => selectedTrip ? [selectedTrip] : trips, [selectedTrip, trips])
  const routeFeatures = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: visibleTrips.flatMap((trip) => {
      const points = trip.route.length > 1 ? trip.route : trip.stops
      if (points.length < 2) return []
      return [{
        type: 'Feature' as const,
        properties: { id: trip.id, status: trip.status },
        geometry: { type: 'LineString' as const, coordinates: points.map((point) => [point.lng, point.lat]) }
      }]
    })
  }), [visibleTrips])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const points = selectedTrip ? (selectedTrip.route.length > 1 ? selectedTrip.route : selectedTrip.stops) : trips.flatMap((trip) => trip.stops)
    if (!points.length) return
    if (points.length === 1) {
      map.flyTo({ center: [points[0].lng, points[0].lat], zoom: selectedTrip ? 7 : 4, duration: 1200 })
      return
    }
    const bounds = new LngLatBounds()
    points.forEach((point) => bounds.extend([point.lng, point.lat]))
    map.fitBounds(bounds, { padding: 70, maxZoom: selectedTrip ? 7 : 4, duration: 1200 })
  }, [selectedTrip, trips])

  return (
    <div className={`world-map ${className}`}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 15, latitude: 18, zoom: 1.8 }}
        minZoom={1.3}
        maxZoom={17}
        mapStyle={ENGLISH_MAP_STYLE}
        attributionControl={{ compact: true }}
        onLoad={(event) => applyEnglishLabels(event.target)}
      >
        <NavigationControl position="top-left" showCompass={false} />
        <Source id="travel-routes" type="geojson" data={routeFeatures}>
          <Layer id="planned-route" type="line" filter={['==', ['get', 'status'], 'planned']} paint={{ 'line-color': '#607d74', 'line-width': selectedTrip ? 4 : 3, 'line-opacity': .9, 'line-dasharray': [1.2, 2.2] }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
          <Layer id="travelled-route" type="line" filter={['!=', ['get', 'status'], 'planned']} paint={{ 'line-color': '#ef5b43', 'line-width': selectedTrip ? 4 : 3, 'line-opacity': .95 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
        </Source>
        {visibleTrips.flatMap((trip) => trip.stops.map((stop, index) => {
          const memory = memories.find((item) => item.stopId === stop.id)
          const photo = memory?.photos[0]?.src
          return <Marker key={stop.id} longitude={stop.lng} latitude={stop.lat} anchor="center">
            <button className={`map-marker marker-${trip.status}${photo ? ' photo-marker' : ''}`} onClick={() => onSelectTrip?.(trip.id)} title={`${stop.name}, ${stop.country} · ${trip.title} · Step ${index + 1}`}>
              {photo ? <img src={photo} alt="" /> : <i />}
            </button>
          </Marker>
        }))}
      </Map>
      <span className="map-language-badge">Labels · English</span>
    </div>
  )
}
