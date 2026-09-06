import { useState, type FormEvent } from 'react'
import { Field, Modal } from './Ui'
import { useTravelStore } from '../store/travelStore'
import { useDurableSave } from '../lib/useDurableSave'
import { uid } from '../lib/format'
import type { Place, Stop } from '../types'

export function PlaceForm({ tripId, city, place, onClose }: { tripId: string; city: Stop; place?: Place; onClose: () => void }) {
  const [name, setName] = useState(place?.name || '')
  const [category, setCategory] = useState<Place['category']>(place?.category || 'sight')
  const [address, setAddress] = useState(place?.address || '')
  const [mapUrl, setMapUrl] = useState(place?.mapUrl || '')
  const [lat, setLat] = useState(place?.lat?.toString() || '')
  const [lng, setLng] = useState(place?.lng?.toString() || '')
  const [notes, setNotes] = useState(place?.notes || '')
  const [ideas, setIdeas] = useState(place?.ideas || '')
  const [links, setLinks] = useState(place?.links.join('\n') || '')
  const [visited, setVisited] = useState(place?.visited || false)
  const [results, setResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([])
  const [searching, setSearching] = useState(false)
  const { saving, error, setError, save } = useDurableSave()
  async function lookup() {
    setSearching(true); setError(null)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&accept-language=en&limit=5&q=${encodeURIComponent(`${name}, ${city.name}, ${city.country}`)}`)
      if (!response.ok) throw new Error('Lookup unavailable. Enter the address manually.')
      const data = await response.json()
      setResults(data)
      if (!data.length) setError('No results. You can enter the place manually.')
    } catch { setError('Lookup unavailable offline. Enter the address and optional coordinates manually.') }
    finally { setSearching(false) }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) { setError('Enter a place name.'); return }
    if (!!lat !== !!lng) { setError('Enter both latitude and longitude, or leave both empty.'); return }
    const value: Place = { id: place?.id || uid('place'), name: name.trim(), category, address, mapUrl, lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined, notes, ideas, links: links.split('\n').map(s => s.trim()).filter(Boolean), visited, photos: place?.photos || [] }
    void save(() => useTravelStore.getState().savePlace(tripId, city.id, value), onClose)
  }
  return <Modal title={place ? 'Edit place' : `Add a place in ${city.name}`} onClose={onClose}><form className="form-stack" onSubmit={submit}>
    <Field label="Place name"><input required autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Restaurant, viewpoint, museum…" /></Field>
    <button className="button secondary" type="button" disabled={searching || name.trim().length < 3} onClick={() => void lookup()}>{searching ? 'Looking up…' : 'Look up on OpenStreetMap (online)'}</button>
    {!!results.length && <div className="lookup-results">{results.map((r, i) => <button type="button" key={i} onClick={() => { setAddress(r.display_name); setLat(r.lat); setLng(r.lon); setResults([]) }}>{r.display_name}</button>)}</div>}
    <Field label="Category"><select value={category} onChange={e => setCategory(e.target.value as Place['category'])}><option value="sight">Sight / attraction</option><option value="restaurant">Restaurant / café</option><option value="stay">Accommodation</option><option value="photo">Photo spot</option><option value="other">Other</option></select></Field>
    <Field label="Address"><input value={address} onChange={e => setAddress(e.target.value)} /></Field>
    <Field label="Google Maps or map link"><input type="url" value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://maps.google.com/…" /></Field>
    <div className="form-grid"><Field label="Latitude" hint="Optional; needed for route suggestions"><input type="number" step="any" min="-90" max="90" value={lat} onChange={e => setLat(e.target.value)} /></Field><Field label="Longitude"><input type="number" step="any" min="-180" max="180" value={lng} onChange={e => setLng(e.target.value)} /></Field></div>
    <Field label="Notes / what to try"><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Order the duck noodles. Reserve a window table…" /></Field>
    <Field label="Vlog and photo ideas"><textarea rows={3} value={ideas} onChange={e => setIdeas(e.target.value)} placeholder="Sunset wide shot; record the chef plating…" /></Field>
    <Field label="Reference links" hint="One http or https link per line"><textarea rows={3} value={links} onChange={e => setLinks(e.target.value)} /></Field>
    <label><input type="checkbox" checked={visited} onChange={e => setVisited(e.target.checked)} /> Already visited</label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <footer className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save place'}</button></footer>
  </form></Modal>
}
