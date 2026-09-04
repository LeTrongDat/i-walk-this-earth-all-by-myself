import { useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, Search } from 'lucide-react'
import { Field, Modal } from './Ui'
import type { PlaceResult, Stop, TransportMode } from '../types'
import { useTravelStore } from '../store/travelStore'
import { uid } from '../lib/format'

async function findPlaces(query: string): Promise<PlaceResult[]> {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('Place search is unavailable')
  const data = await response.json() as Array<{ place_id: number; display_name: string; lat: string; lon: string; name?: string; address?: { country?: string; city?: string; town?: string; village?: string } }>
  return data.map((place) => ({ id: String(place.place_id), name: place.name || place.address?.city || place.address?.town || place.address?.village || place.display_name.split(',')[0], country: place.address?.country ?? '', displayName: place.display_name, lat: Number(place.lat), lng: Number(place.lon) }))
}

export function StopForm({ tripId, stop, onClose }: { tripId: string; stop?: Stop; onClose: () => void }) {
  const addStop = useTravelStore((state) => state.addStop)
  const updateStop = useTravelStore((state) => state.updateStop)
  const [query, setQuery] = useState(stop?.name ?? '')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [place, setPlace] = useState<PlaceResult | null>(stop ? { id: stop.id, name: stop.name, country: stop.country, displayName: `${stop.name}, ${stop.country}`, lat: stop.lat, lng: stop.lng } : null)
  const [arrivalDate, setArrivalDate] = useState(stop?.arrivalDate ?? new Date().toISOString().slice(0, 10))
  const [departureDate, setDepartureDate] = useState(stop?.departureDate ?? '')
  const [transport, setTransport] = useState<TransportMode>(stop?.transport ?? 'train')
  const [accommodation, setAccommodation] = useState(stop?.accommodation ?? '')
  const [activities, setActivities] = useState(stop?.activities.join(', ') ?? '')
  const [notes, setNotes] = useState(stop?.notes ?? '')

  useEffect(() => {
    if (query.trim().length < 3 || query === stop?.name || place?.name === query) { setResults([]); return }
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try { setResults(await findPlaces(query)) } catch { setResults([]) } finally { setSearching(false) }
    }, 450)
    return () => window.clearTimeout(timer)
  }, [place?.name, query, stop?.name])

  function choose(result: PlaceResult) {
    setPlace(result)
    setQuery(result.name)
    setResults([])
  }

  function save(event: FormEvent) {
    event.preventDefault()
    if (!place) return
    const value: Stop = { id: stop?.id ?? uid('stop'), name: place.name, country: place.country, lat: place.lat, lng: place.lng, arrivalDate, departureDate: departureDate || undefined, transport, accommodation: accommodation || undefined, activities: activities.split(',').map((item) => item.trim()).filter(Boolean), notes: notes || undefined }
    if (stop) updateStop(tripId, stop.id, value)
    else addStop(tripId, value)
    onClose()
  }

  return (
    <Modal title={stop ? 'Edit this stop' : 'Add a place'} eyebrow="Build your route" onClose={onClose}>
      <form className="form-stack" onSubmit={save}>
        <Field label="Search for a city or place">
          <div className="place-search">
            <div className="input-with-icon">{searching ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}<input required value={query} onChange={(event) => { setQuery(event.target.value); setPlace(null) }} placeholder="Kyoto, Japan" /></div>
            {results.length > 0 && <div className="search-results">{results.map((result) => <button type="button" key={result.id} onClick={() => choose(result)}><strong>{result.name}</strong><span>{result.displayName}</span></button>)}</div>}
          </div>
        </Field>
        {place && <p className="selected-place">Pinned at {place.lat.toFixed(4)}, {place.lng.toFixed(4)}</p>}
        <div className="form-grid"><Field label="Arrival"><input required type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} /></Field><Field label="Departure"><input type="date" min={arrivalDate} value={departureDate} onChange={(event) => setDepartureDate(event.target.value)} /></Field></div>
        <div className="form-grid"><Field label="Arrive by"><select value={transport} onChange={(event) => setTransport(event.target.value as TransportMode)}><option value="walk">Walking</option><option value="bike">Bike</option><option value="car">Car</option><option value="train">Train</option><option value="boat">Boat</option><option value="flight">Flight</option><option value="other">Other</option></select></Field><Field label="Stay"><input value={accommodation} onChange={(event) => setAccommodation(event.target.value)} placeholder="Hotel, campsite…" /></Field></div>
        <Field label="Things to do" hint="Separate activities with commas"><input value={activities} onChange={(event) => setActivities(event.target.value)} placeholder="Morning market, coastal walk" /></Field>
        <Field label="Notes"><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reservation details, ideas, little reminders…" /></Field>
        {!place && query.length > 2 && !searching && <p className="form-error">Choose a result from the place search to pin it on your route.</p>}
        <footer className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={!place}>{stop ? 'Save stop' : 'Add to route'}</button></footer>
      </form>
    </Modal>
  )
}
