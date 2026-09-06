import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Marker, NavigationControl, Source, type MapRef } from 'react-map-gl/maplibre'
import { LngLatBounds, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { Memory, Trip } from '../types'

const ENGLISH_MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'
// MapLibre 6 requires a bundled worker, including its shared module, in production.
setWorkerUrl(workerUrl)

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
        ['get', 'name:latin'],
        ''
      ])
    } catch {
      // Route-number and icon-only symbol layers do not use place names.
    }
  }
}

export function WorldMap({ trips, memories = [], selectedTripId, focusedStopId, onSelectTrip, className = '' }: { trips: Trip[]; memories?: Memory[]; selectedTripId?: string; focusedStopId?: string; onSelectTrip?: (tripId: string) => void; className?: string }) {
  const mapRef = useRef<MapRef>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [satellite, setSatellite] = useState(true)
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

  const fitRoute = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const focusedStop = selectedTrip?.stops.find((stop) => stop.id === focusedStopId)
    if (focusedStop) {
      map.flyTo({ center: [focusedStop.lng, focusedStop.lat], zoom: 8, padding: { top: 65, bottom: 210, left: 60, right: 60 }, duration: 900 })
      return
    }
    const points = selectedTrip ? (selectedTrip.route.length > 1 ? selectedTrip.route : selectedTrip.stops) : trips.flatMap((trip) => trip.stops)
    if (!points.length) return
    if (points.length === 1) {
      map.flyTo({ center: [points[0].lng, points[0].lat], zoom: selectedTrip ? 7 : 4, duration: 1200 })
      return
    }
    const bounds = new LngLatBounds()
    points.forEach((point) => bounds.extend([point.lng, point.lat]))
    map.fitBounds(bounds, { padding: selectedTrip ? 45 : 70, maxZoom: selectedTrip ? 7 : 4, duration: 1200 })
  }, [selectedTrip, trips, focusedStopId])

  useEffect(() => { if (ready) fitRoute() }, [ready, fitRoute])
  useEffect(() => {
    if (ready) return
    const timer = window.setTimeout(() => setFailed(true), 15000)
    return () => window.clearTimeout(timer)
  }, [ready, attempt])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!ready || !map) return
    map.setLayoutProperty('satellite-imagery', 'visibility', satellite ? 'visible' : 'none')
    for (const layer of map.getStyle().layers) {
      if (layer.type === 'symbol' && map.getLayoutProperty(layer.id, 'text-field')) {
        map.setPaintProperty(layer.id, 'text-color', satellite ? '#ffffff' : '#34434a')
        map.setPaintProperty(layer.id, 'text-halo-color', satellite ? '#182a34' : '#ffffff')
      }
    }
  }, [ready, satellite])

  return (
    <div className={`world-map ${className}`} data-map-state={failed ? 'error' : ready ? 'ready' : 'loading'}>
      <Map
        key={attempt}
        ref={mapRef}
        initialViewState={{ longitude: 15, latitude: 18, zoom: 1.8 }}
        minZoom={1.3}
        maxZoom={17}
        mapStyle={ENGLISH_MAP_STYLE}
        attributionControl={{ compact: true }}
        onLoad={(event) => {
          const map = event.target
          applyEnglishLabels(map)
          map.addSource('satellite-imagery', { type: 'raster', tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community' })
          const firstLabel = map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id
          map.addLayer({ id: 'satellite-imagery', type: 'raster', source: 'satellite-imagery', paint: { 'raster-saturation': -.2, 'raster-brightness-max': .8 } }, firstLabel)
          setReady(true)
          setFailed(false)
        }}
        onIdle={(event) => {
          const map = event.target
          const container = map.getContainer().parentElement
          if (container) {
            const features = map.queryRenderedFeatures()
            container.dataset.renderedFeatures = String(features.filter((feature) => feature.source === 'openmaptiles').length)
            container.dataset.renderedRoutes = String(features.filter((feature) => feature.source === 'travel-routes').length)
            container.dataset.labelFields = JSON.stringify(map.getStyle().layers.filter((layer) => layer.type === 'symbol').map((layer) => map.getLayoutProperty(layer.id, 'text-field')))
            container.dataset.zoom = String(map.getZoom())
          }
        }}
        onError={() => setFailed(true)}
      >
        <NavigationControl position="top-left" showCompass={false} />
        <Source id="travel-routes" type="geojson" data={routeFeatures}>
          <Layer id="planned-route" type="line" filter={['==', ['get', 'status'], 'planned']} paint={{ 'line-color': satellite ? '#ffffff' : '#ec2455', 'line-width': 3, 'line-opacity': .9, 'line-dasharray': [1.2, 2.2] }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
          <Layer id="travelled-route" type="line" filter={['!=', ['get', 'status'], 'planned']} paint={{ 'line-color': satellite ? '#ffffff' : '#ec2455', 'line-width': 3, 'line-opacity': .95 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
        </Source>
        {visibleTrips.flatMap((trip) => trip.stops.map((stop, index) => {
          const memory = memories.find((item) => item.stopId === stop.id)
          const photo = memory?.photos[0]?.src
          return <Marker key={stop.id} longitude={stop.lng} latitude={stop.lat} anchor="center">
            <button className={`map-marker marker-${trip.status}${photo ? ' photo-marker' : ''}`} onClick={() => { onSelectTrip?.(trip.id); if (!onSelectTrip) mapRef.current?.flyTo({ center: [stop.lng, stop.lat], zoom: 9, padding: { top: 50, bottom: 200, left: 30, right: 30 } }) }} aria-label={`${stop.name}, ${stop.country} · ${trip.title} · Location ${index + 1}`} title={`${stop.name}, ${stop.country} · ${trip.title} · Location ${index + 1}`}>
              {photo ? <img src={photo} alt="" /> : <i />}
            </button>
          </Marker>
        }))}
      </Map>
      <button className="map-layer-toggle" onClick={() => setSatellite((value) => !value)}>{satellite ? 'Street map' : 'Satellite'}</button>
      {!ready && !failed && <div className="map-feedback" role="status">Loading map…</div>}
      {failed && <div className="map-feedback" role="alert">Map could not load. Check your connection.<button onClick={() => { setReady(false); setFailed(false); setAttempt((value) => value + 1) }}>Retry map</button></div>}
    </div>
  )
}
