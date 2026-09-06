import { useRef, useState } from 'react'
import { Edit3, MapPin, Plus, Upload } from 'lucide-react'
import { PlaceForm } from './PlaceForm'
import { AlbumGallery } from './AlbumGallery'
import { TravelMap } from './TravelMap'
import { albumEntries } from '../lib/albums'
import { discardPhotoFile, savePhotoFile } from '../lib/photoFiles'
import { useTravelStore } from '../store/travelStore'
import type { Place, Stop, Trip } from '../types'

export function CityWorkspace({ trip, city }: { trip: Trip; city: Stop }) {
  const memories = useTravelStore(s => s.memories)
  const [editing, setEditing] = useState<Place | 'new' | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const busy = useRef(false)
  const [showMap, setShowMap] = useState(false)
  const selected = city.places?.find(p => p.id === selectedId)
  const entries = albumEntries([trip], memories).filter(e => e.cityId === city.id && (!selected || e.placeId === selected.id))
  const mapped = (city.places ?? []).filter(p => p.lat !== undefined && p.lng !== undefined)
  const mapTrip: Trip = { ...trip, route: [], stops: mapped.map(p => ({ ...city, id: p.id, name: p.name, lat: p.lat!, lng: p.lng! })) }
  async function upload(files: FileList | null) {
    if (!files || !selected || busy.current) return
    busy.current = true; setError('')
    const list = Array.from(files)
    let saved = 0
    try {
      for (const file of list) {
        setProgress(`Saving photo ${saved + 1} of ${list.length}…`)
        const photo = await savePhotoFile(file)
        const ok = await useTravelStore.getState().albumPhoto(trip.id, city.id, selected.id, photo)
        if (!ok) { await discardPhotoFile(photo); throw new Error('Storage is full or unavailable. Export a backup and check storage.') }
        saved++
      }
    } catch (failure) { setError(`${saved} of ${list.length} saved. ${failure instanceof Error ? failure.message : 'Could not save photos.'} Previously saved photos are kept.`) }
    finally { setProgress(''); busy.current = false }
  }
  return <div className="city-workspace">
    <div className="workspace-heading"><div><p className="eyebrow">{city.country}</p><h2>{city.name}</h2><p>{city.places?.length || 0} places · {entries.length} photos</p></div><div className="workspace-actions"><button className="button secondary" onClick={() => setShowMap(v => !v)}><MapPin size={16} /> {showMap ? 'Hide map' : 'City map'}</button><button className="button primary" onClick={() => setEditing('new')}><Plus size={16} /> Add place</button></div></div>
    {showMap && <div className="city-map"><TravelMap trips={[mapTrip]} selectedTripId={trip.id} focusedStopId={selected?.id} /><p>{mapped.length} mapped places. Add coordinates to show other places. Map tiles need a connection.</p></div>}
    <div className="city-columns"><aside className="place-list"><button className={!selected ? 'selected' : ''} onClick={() => { if (!busy.current) setSelectedId('') }}>All city photos</button>{city.places?.map(p => <button key={p.id} className={p.id === selected?.id ? 'selected' : ''} onClick={() => { if (!busy.current) setSelectedId(p.id) }}><strong>{p.name}</strong><span>{p.category === 'stay' ? 'Accommodation' : p.category} · {p.photos.length} photos {p.visited ? '· Visited' : ''}</span></button>)}</aside>
    <div className="place-content">{selected ? <>
      <div className="workspace-heading"><div><h3>{selected.name}</h3><p>{selected.address || 'No address added'}</p></div><button className="icon-button" aria-label="Edit place" onClick={() => setEditing(selected)}><Edit3 size={18} /></button></div>
      <div className="place-notes">{selected.notes && <div><h4>Notes / what to try</h4><p>{selected.notes}</p></div>}{selected.ideas && <div><h4>Vlog & photo ideas</h4><p>{selected.ideas}</p></div>}</div>
      <div className="reference-links">{selected.mapUrl && <a href={selected.mapUrl} target="_blank" rel="noreferrer">Open map link ↗</a>}{selected.links.map((link, i) => <a key={i} href={link} target="_blank" rel="noreferrer">Reference {i + 1} ↗</a>)}</div>
      <label className={`button primary upload-album ${progress ? 'disabled' : ''}`}><Upload size={16} /> {progress || 'Add photos to album'}<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple disabled={!!progress} onChange={e => { void upload(e.target.files); e.target.value = '' }} /></label>
      <p className="local-help">Originals stay on this device. Import in batches; no post, title, or photo-count limit. Export a full backup regularly.</p>
      <button className="text-danger" disabled={!!progress} onClick={async () => { if (confirm(`Delete ${selected.name}, its album, and planned visits? Export a backup first. Local files are retained until unused-file cleanup.`) && await useTravelStore.getState().deletePlace(trip.id, city.id, selected.id)) setSelectedId('') }}>Delete place</button>
    </> : <p className="local-help">Choose a place to add photos or keep notes. Existing journal photos remain in this city’s collection.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}{progress && <p role="status">{progress}</p>}
    <AlbumGallery entries={entries} title={selected ? `${selected.name} album` : `${city.name} photos`} />
    </div></div>
    {editing && <PlaceForm tripId={trip.id} city={city} place={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
  </div>
}
