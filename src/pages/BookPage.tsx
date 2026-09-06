import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useTravelStore } from '../store/travelStore'
import { albumEntries } from '../lib/albums'
import { photoBlob } from '../lib/photoFiles'
import { formatDate } from '../lib/format'

export function BookPage() {
  const { tripId } = useParams()
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'photos' ? 'photos' : 'plan'
  const { trips, memories } = useTravelStore()
  const trip = trips.find(t => t.id === tripId)
  const entries = useMemo(() => albumEntries(trip ? [trip] : [], memories), [trip, memories])
  const [cityId, setCityId] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [country, setCountry] = useState('')
  const [favorites, setFavorites] = useState(false)
  const [sources, setSources] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [printing, setPrinting] = useState(false)
  const selected = useMemo(() => entries.filter(e => (!cityId || e.cityId === cityId) && (!placeId || e.placeId === placeId) && (!country || e.country === country) && (!favorites || e.photo.favorite)), [entries, cityId, placeId, country, favorites])
  useEffect(() => {
    if (mode !== 'photos') return
    let active = true
    const urls: string[] = []
    void (async () => {
      const next: Record<string, string> = {}
      try {
        for (const entry of selected) {
          const blob = await photoBlob(entry.photo.src)
          const url = blob ? URL.createObjectURL(blob) : entry.photo.src
          if (blob) urls.push(url)
          next[entry.photo.id] = url
        }
        if (active) { setSources(next); setError('') }
      } catch { if (active) setError('A photo file is missing. Restore a full backup before printing.') }
      if (!active) urls.forEach(URL.revokeObjectURL)
    })()
    return () => { active = false; urls.forEach(URL.revokeObjectURL) }
  }, [selected, mode])
  if (!trip) return <Navigate to="/trips" replace />
  async function print() {
    setPrinting(true); setError('')
    try {
      await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>('.book-document img')).map(img => img.decode()))
      window.print()
    } catch { setError('Some images could not load. Check your connection for older remote photos, or choose another album.') }
    finally { setPrinting(false) }
  }
  return <div className="book-page"><div className="book-toolbar no-print"><Link className="text-link" to={`/trips/${trip.id}`}>← Back to trip</Link><h1>{mode === 'plan' ? 'Travel playbook' : 'Memory photobook'}</h1><div className="workspace-actions"><button className={`button ${mode === 'plan' ? 'primary' : 'secondary'}`} onClick={() => setParams({ mode: 'plan' })}>Playbook</button><button className={`button ${mode === 'photos' ? 'primary' : 'secondary'}`} onClick={() => setParams({ mode: 'photos' })}>Photobook</button><button className="button primary" disabled={printing || (mode === 'photos' && (!selected.length || selected.some(e => !sources[e.photo.id])))} onClick={() => void print()}>{printing ? 'Preparing…' : 'Print / Save PDF'}</button></div>
    {mode === 'photos' && <div className="book-filters"><select aria-label="Book country" value={country} onChange={e => { setCountry(e.target.value); setCityId(''); setPlaceId('') }}><option value="">All countries</option>{[...new Set(trip.stops.map(c => c.country))].map(c => <option key={c}>{c}</option>)}</select><select aria-label="Book city" value={cityId} onChange={e => { setCityId(e.target.value); setPlaceId('') }}><option value="">All cities</option>{trip.stops.filter(c => !country || c.country === country).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select aria-label="Book place" value={placeId} onChange={e => setPlaceId(e.target.value)}><option value="">All places</option>{trip.stops.filter(c => (!cityId || c.id === cityId) && (!country || c.country === country)).flatMap(c => c.places || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><label><input type="checkbox" checked={favorites} onChange={e => setFavorites(e.target.checked)} /> Favourites only</label><p>{selected.length} photos selected. All selected photos are included; no preview truncation.</p></div>}
    <p>Choose “Save as PDF” in your browser’s print dialog. Photos and notes are not uploaded.</p>{error && <p role="alert" className="form-error">{error}</p>}</div>
    <div className="book-document"><header><p>{mode === 'plan' ? 'TRAVEL PLAYBOOK' : 'MEMORY PHOTOBOOK'}</p><h1>{trip.title}</h1><p>{formatDate(trip.startDate)} — {formatDate(trip.endDate)}</p>{trip.summary && <p>{trip.summary}</p>}</header>
    {mode === 'plan' ? <>
      {trip.days?.map((day, i) => { const city = trip.stops.find(c => c.id === day.cityId)!; const stay = city.places?.find(p => p.id === day.accommodationId); return <section className="book-day" key={day.id}><h2>Day {i + 1} · {formatDate(day.date)} · {city.name}</h2><p><strong>Accommodation:</strong> {stay ? `${stay.name} — ${stay.address}` : 'Not assigned'}</p>{stay?.notes && <p>{stay.notes}</p>}{day.notes && <p className="preserve-lines">{day.notes}</p>}<ol>{day.visits.map(v => { const place = city.places!.find(p => p.id === v.placeId)!; return <li key={v.id}><h3>{v.time || 'Flexible'} · {place.name} · {v.duration} min{v.fixed ? ' · Fixed visit' : ''}</h3><p>{place.address}</p>{v.notes && <p>{v.notes}</p>}{place.notes && <p className="preserve-lines"><strong>Try / notes:</strong> {place.notes}</p>}{place.ideas && <p className="preserve-lines"><strong>Photo / vlog ideas:</strong> {place.ideas}</p>}{[place.mapUrl, ...place.links].filter(Boolean).map((url, j) => <p className="print-link" key={j}>{url}</p>)}</li> })}</ol><p>{day.returnToStay && stay ? `Return to ${stay.name}.` : ''} Route suggestions use approximate straight-line distances. Check travel times and opening hours separately.</p></section> })}
      {!trip.days?.length && <p>No daily plans yet. Add days in the trip’s Daily plan tab.</p>}
      <section className="book-day"><h2>City directory & unscheduled ideas</h2>{trip.stops.map(city => <section key={city.id}><h3>{city.name}, {city.country}</h3><p>{formatDate(city.arrivalDate)} — {formatDate(city.departureDate)}</p>{city.accommodation && <p>City accommodation note: {city.accommodation}</p>}{city.notes && <p>{city.notes}</p>}{city.places?.map(place => <div className="book-place" key={place.id}><strong>{place.name}</strong><p>{place.address}</p><p className="preserve-lines">{place.notes}</p><p className="preserve-lines">{place.ideas}</p>{[place.mapUrl, ...place.links].filter(Boolean).map((url, i) => <p className="print-link" key={i}>{url}</p>)}</div>)}</section>)}</section>
    </> : <>{selected.map(entry => <figure className="book-photo" key={entry.photo.id}>{sources[entry.photo.id] ? <img src={sources[entry.photo.id]} alt={entry.photo.caption || entry.place} /> : <p>Preparing photo…</p>}<figcaption><strong>{entry.city} · {entry.place}</strong><span>{entry.photo.date}</span><p>{entry.photo.caption}</p></figcaption></figure>)}{!selected.length && <p>No photos in this selection.</p>}</>}
    </div>
  </div>
}
