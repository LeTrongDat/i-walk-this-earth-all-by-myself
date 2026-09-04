import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ImagePlus, MapPin, Trash2 } from 'lucide-react'
import { Field, Modal } from './Ui'
import { useTravelStore } from '../store/travelStore'
import type { Memory, Photo, Trip } from '../types'
import { uid } from '../lib/format'

async function readPhotos(files: FileList): Promise<Photo[]> {
  const selected = Array.from(files).slice(0, 8)
  const allowed = selected.filter((file) => file.type.startsWith('image/') && file.size <= 8 * 1024 * 1024)
  return Promise.all(allowed.map((file) => new Promise<Photo>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ id: uid('photo'), src: String(reader.result), caption: file.name.replace(/\.[^.]+$/, '') })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })))
}

export function MemoryForm({ trip, memory, initialStopId, onClose }: { trip: Trip; memory?: Memory; initialStopId?: string; onClose: () => void }) {
  const addMemory = useTravelStore((state) => state.addMemory)
  const updateMemory = useTravelStore((state) => state.updateMemory)
  const [title, setTitle] = useState(memory?.title ?? '')
  const [story, setStory] = useState(memory?.story ?? '')
  const [date, setDate] = useState(memory?.date ?? new Date().toISOString().slice(0, 10))
  const [stopId, setStopId] = useState(memory?.stopId ?? initialStopId ?? trip.stops[0]?.id ?? '')
  const [mood, setMood] = useState(memory?.mood ?? 'Grateful')
  const [photos, setPhotos] = useState<Photo[]>(memory?.photos ?? [])
  const stop = trip.stops.find((item) => item.id === stopId) ?? trip.stops[0]

  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      const nextPhotos = await readPhotos(event.target.files)
      setPhotos((current) => [...current, ...nextPhotos].slice(0, 8))
    }
  }

  function save(event: FormEvent) {
    event.preventDefault()
    if (!stop) return
    const value: Memory = { id: memory?.id ?? uid('memory'), tripId: trip.id, stopId: stop.id, title, story, date, mood, photos, place: `${stop.name}, ${stop.country}`, lat: stop.lat, lng: stop.lng }
    if (memory) updateMemory(memory.id, value)
    else addMemory(value)
    onClose()
  }

  return (
    <Modal title={memory ? 'Edit this memory' : 'Remember this moment'} eyebrow={trip.title} onClose={onClose} size="large">
      <form className="form-stack" onSubmit={save}>
        <div className="form-grid"><Field label="Title"><input required autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The road above the clouds" /></Field><Field label="Date"><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field></div>
        <div className="form-grid"><Field label="Place"><select required value={stopId} onChange={(event) => setStopId(event.target.value)}>{trip.stops.map((item) => <option key={item.id} value={item.id}>{item.name}, {item.country}</option>)}</select></Field><Field label="How did it feel?"><input value={mood} onChange={(event) => setMood(event.target.value)} placeholder="Alive, peaceful, curious…" /></Field></div>
        <Field label="Your story"><textarea required rows={7} value={story} onChange={(event) => setStory(event.target.value)} placeholder="Write down what you never want to forget…" /></Field>
        <div className="photo-uploader">
          <div><strong>Photos</strong><span>Up to 8 images, 8 MB each. Saved privately in this browser.</span></div>
          <label className="button secondary"><ImagePlus size={18} /> Add photos<input hidden multiple type="file" accept="image/*" onChange={onFiles} /></label>
        </div>
        {photos.length > 0 && <div className="upload-grid">{photos.map((photo) => <div key={photo.id}><img src={photo.src} alt={photo.caption ?? ''} /><button type="button" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))} aria-label="Remove photo"><Trash2 size={16} /></button></div>)}</div>}
        {!trip.stops.length && <p className="form-error"><MapPin size={16} /> Add a place to the trip before creating a memory.</p>}
        <footer className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={!trip.stops.length}>{memory ? 'Save memory' : 'Add to journal'}</button></footer>
      </form>
    </Modal>
  )
}
