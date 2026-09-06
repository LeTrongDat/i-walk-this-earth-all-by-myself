import { useState, type FormEvent } from 'react'
import { LoaderCircle, Search } from 'lucide-react'
import { Field, Modal } from './Ui'
import type { PlaceResult, Stop, TransportMode } from '../types'
import { useTravelStore } from '../store/travelStore'
import { uid } from '../lib/format'
import { useDurableSave } from '../lib/useDurableSave'

async function findPlaces(query: string): Promise<PlaceResult[]> {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&accept-language=en&limit=5&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } })
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
  const [manual, setManual] = useState(true)
  const [country, setCountry] = useState(stop?.country || '')
  const [lat, setLat] = useState(stop?.lat.toString() || '')
  const [lng, setLng] = useState(stop?.lng.toString() || '')
  const { saving, error, setError, save: commit } = useDurableSave()

  async function lookup() {
    setSearching(true); setError(null)
    try { const found = await findPlaces(query); setResults(found); if (!found.length) setError('No city found. Try another name or enter it manually.') }
    catch { setError('Online lookup unavailable. You can enter the city manually.') }
    finally { setSearching(false) }
  }

  function choose(result: PlaceResult) {
    setPlace(result)
    setQuery(result.name)
    setResults([])
  }

  function save(event: FormEvent) {
    event.preventDefault()
    const chosen = manual ? { name: query.trim(), country: country.trim(), lat: Number(lat), lng: Number(lng) } : place
    if (!chosen?.name || (manual && (!country.trim() || !lat || !lng))) { setError('Enter the city name, country, and coordinates.'); return }
    const value: Stop = { ...stop, id: stop?.id ?? uid('stop'), name: chosen.name, country: chosen.country, lat: chosen.lat, lng: chosen.lng, arrivalDate, departureDate: departureDate || undefined, transport, accommodation: accommodation || undefined, activities: activities.split(',').map((item) => item.trim()).filter(Boolean), notes: notes || undefined }
    void commit(() => stop ? updateStop(tripId, stop.id, value) : addStop(tripId, value), onClose)
  }

  return (
    <Modal title={stop ? 'Edit city' : 'Add a city'} eyebrow="Your trip" onClose={onClose}>
      <form className="form-stack" onSubmit={save}>
        <button type="button" className="button secondary" onClick={() => setManual(v => !v)}>{manual ? 'Use online city lookup' : 'Enter city manually (offline)'}</button>
        {manual ? <><Field label="City name"><input required value={query} onChange={e => setQuery(e.target.value)} /></Field><Field label="Country"><input required value={country} onChange={e => setCountry(e.target.value)} /></Field><div className="form-grid"><Field label="City latitude" hint="City centre, for the map"><input required type="number" step="any" min="-90" max="90" value={lat} onChange={e => setLat(e.target.value)} /></Field><Field label="City longitude"><input required type="number" step="any" min="-180" max="180" value={lng} onChange={e => setLng(e.target.value)} /></Field></div></> : <>
        <Field label="Search for a city or place">
          <div className="place-search">
            <div className="input-with-icon">{searching ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}<input required value={query} onChange={(event) => { setQuery(event.target.value); setPlace(null) }} placeholder="Kyoto, Japan" /></div>
            {results.length > 0 && <div className="search-results">{results.map((result) => <button type="button" key={result.id} onClick={() => choose(result)}><strong>{result.name}</strong><span>{result.displayName}</span></button>)}</div>}
          </div>
        </Field>
        <button type="button" className="button secondary" disabled={searching || query.trim().length < 3} onClick={() => void lookup()}>Search cities</button>
        {place && <p className="selected-place">Pinned at {place.lat.toFixed(4)}, {place.lng.toFixed(4)}</p>}
        </>}
        <div className="form-grid"><Field label="Arrival"><input required type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} /></Field><Field label="Departure"><input type="date" min={arrivalDate} value={departureDate} onChange={(event) => setDepartureDate(event.target.value)} /></Field></div>
        <div className="form-grid"><Field label="Arrive by"><select value={transport} onChange={(event) => setTransport(event.target.value as TransportMode)}><option value="walk">Walking</option><option value="bike">Bike</option><option value="car">Car</option><option value="train">Train</option><option value="boat">Boat</option><option value="flight">Flight</option><option value="other">Other</option></select></Field><Field label="Stay"><input value={accommodation} onChange={(event) => setAccommodation(event.target.value)} placeholder="Hotel, campsite…" /></Field></div>
        <Field label="Things to do" hint="Separate activities with commas"><input value={activities} onChange={(event) => setActivities(event.target.value)} placeholder="Morning market, coastal walk" /></Field>
        <Field label="Notes"><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reservation details, ideas, little reminders…" /></Field>
        {!manual && !place && query.length > 2 && !searching && <p className="form-error">Choose a city search result.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <footer className="modal-actions"><button type="button" className="button ghost" disabled={saving} onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={(!manual && !place) || saving}>{saving ? 'Saving…' : stop ? 'Save city' : 'Add city'}</button></footer>
      </form>
    </Modal>
  )
}
