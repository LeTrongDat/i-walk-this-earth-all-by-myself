import { useState, type FormEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { Modal, Field } from './Ui'
import { useTravelStore } from '../store/travelStore'
import type { Trip, TripStatus, TripVisibility } from '../types'
import { uid } from '../lib/format'
import { useDurableSave } from '../lib/useDurableSave'

const fallbackCover = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85'

export function TripForm({ trip, onClose, onSaved }: { trip?: Trip; onClose: () => void; onSaved?: (id: string) => void }) {
  const addTrip = useTravelStore((state) => state.addTrip)
  const updateTrip = useTravelStore((state) => state.updateTrip)
  const [title, setTitle] = useState(trip?.title ?? '')
  const [summary, setSummary] = useState(trip?.summary ?? '')
  const [cover, setCover] = useState(trip?.cover ?? '')
  const [startDate, setStartDate] = useState(trip?.startDate ?? new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(trip?.endDate ?? '')
  const [status, setStatus] = useState<TripStatus>(trip?.status ?? 'planned')
  const [visibility, setVisibility] = useState<TripVisibility>(trip?.visibility ?? 'private')
  const { saving, error, setError, save: commit } = useDurableSave()

  function save(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) { setError('Enter a trip name.'); return }
    const now = new Date().toISOString()
    const id = trip?.id ?? uid('trip')
    const details = { title: title.trim(), summary, cover: cover || fallbackCover, startDate, endDate: endDate || undefined, status, visibility }
    void commit(() => trip ? updateTrip(trip.id, details) : addTrip({ id, ...details, stops: [], route: [], createdAt: now, updatedAt: now }), () => { onSaved?.(id); onClose() })
  }

  return (
    <Modal title={trip ? 'Edit your trip' : 'Where are you going?'} eyebrow={trip ? 'Trip details' : 'A new journey'} onClose={onClose}>
      <form className="form-stack" onSubmit={save}>
        <Field label="Trip name"><input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A slow summer in Italy" /></Field>
        <Field label="A short description"><textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="What do you hope to find along the way?" rows={3} /></Field>
        <div className="form-grid">
          <Field label="Starts"><input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></Field>
          <Field label="Ends"><input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
        </div>
        <Field label="Cover image" hint="Paste an image URL. You can add your own photos to memories.">
          <div className="input-with-icon"><ImagePlus size={18} /><input value={cover} onChange={(event) => setCover(event.target.value)} placeholder="https://…" /></div>
        </Field>
        <div className="form-grid">
          <Field label="Journey state"><select value={status} onChange={(event) => setStatus(event.target.value as TripStatus)}><option value="planned">Planned</option><option value="active">Travelling now</option><option value="completed">Completed</option></select></Field>
          <Field label="Privacy" hint="Stored on this device only. Public sharing is not available."><select value={visibility} onChange={(event) => setVisibility(event.target.value as TripVisibility)}><option value="private">Only me</option><option value="link">Link sharing preference (not published)</option><option value="public">Public preference (not published)</option></select></Field>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <footer className="modal-actions"><button type="button" className="button ghost" disabled={saving} onClick={onClose}>Cancel</button><button className="button primary" type="submit" disabled={saving}>{saving ? 'Saving…' : trip ? 'Save changes' : 'Create trip'}</button></footer>
      </form>
    </Modal>
  )
}
