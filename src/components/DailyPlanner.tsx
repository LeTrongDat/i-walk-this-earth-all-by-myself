import { useState, type FormEvent } from 'react'
import { Plus, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Field, Modal } from './Ui'
import { useTravelStore } from '../store/travelStore'
import { uid, formatDate } from '../lib/format'
import { useDurableSave } from '../lib/useDurableSave'
import { scheduleWarnings, suggestOrder } from '../lib/routePlanner'
import type { DayPlan, Trip, Visit } from '../types'

export function DailyPlanner({ trip }: { trip: Trip }) {
  const [editing, setEditing] = useState<DayPlan | 'new' | null>(null)
  return <section className="daily-planner"><div className="workspace-heading"><div><h2>Day-by-day plan</h2><p>Visits, accommodation, reservations, and ideas.</p></div><div className="workspace-actions"><Link className="button secondary" to={`/trips/${trip.id}/book?mode=plan`}><Printer size={16} /> Print playbook</Link><button className="button primary" disabled={!trip.stops.length} onClick={() => setEditing('new')}><Plus size={16} /> Add day</button></div></div>
    {!trip.days?.length && <p className="workspace-empty">{trip.stops.length ? 'Add places inside a city, then arrange them into days.' : 'Add your first city before planning a day.'}</p>}
    <div className="day-cards">{trip.days?.map((day, index) => {
      const city = trip.stops.find(c => c.id === day.cityId)!
      const stay = city.places?.find(p => p.id === day.accommodationId)
      return <article className="day-card" key={day.id}><div className="workspace-heading"><div><p className="eyebrow">Day {index + 1} · {city.name}</p><h3>{formatDate(day.date, 'EEE, d MMM yyyy')}</h3></div><button className="button secondary" onClick={() => setEditing(day)}>Edit day</button></div>
        <p className="day-stay">Accommodation: {stay?.name || 'Not assigned'}{stay?.address ? ` · ${stay.address}` : ''}</p>
        <ol className="day-visits">{day.visits.map(v => { const place = city.places?.find(p => p.id === v.placeId); return <li key={v.id}><time>{v.time || 'Flexible'}</time><div><strong>{place?.name}</strong><span>{v.duration} min {v.fixed ? '· Fixed position' : ''}</span>{v.notes && <p>{v.notes}</p>}{place?.address && <small>{place.address}</small>}</div></li> })}</ol>
        {day.notes && <p className="preserve-lines">{day.notes}</p>}{scheduleWarnings(day.visits).map(w => <p className="form-error" key={w}>{w}</p>)}
      </article>
    })}</div>
    {editing && <DayEditor trip={trip} day={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
  </section>
}

function DayEditor({ trip, day, onClose }: { trip: Trip; day?: DayPlan; onClose: () => void }) {
  const [draft, setDraft] = useState<DayPlan>(day || { id: uid('day'), date: trip.startDate, cityId: trip.stops[0]?.id || '', accommodationId: '', returnToStay: true, notes: '', visits: [] })
  const [addId, setAddId] = useState('')
  const [suggestion, setSuggestion] = useState<ReturnType<typeof suggestOrder> | null>(null)
  const { saving, error, setError, save } = useDurableSave()
  const city = trip.stops.find(c => c.id === draft.cityId)!
  const places = city.places || []
  function patch(value: Partial<DayPlan>) { setDraft(d => ({ ...d, ...value })); setSuggestion(null) }
  function visitPatch(id: string, value: Partial<Visit>) { patch({ visits: draft.visits.map(v => v.id === id ? { ...v, ...value } : v) }) }
  function move(index: number, offset: number) { const visits = [...draft.visits]; [visits[index], visits[index + offset]] = [visits[index + offset], visits[index]]; patch({ visits }) }
  function submit(e: FormEvent) { e.preventDefault(); void save(() => useTravelStore.getState().saveDay(trip.id, draft, day), onClose) }
  return <Modal title={day ? 'Edit day plan' : 'Plan a day'} size="large" onClose={onClose}><form className="form-stack" onSubmit={submit}>
    <div className="form-grid"><Field label="Day date"><input required type="date" value={draft.date} onChange={e => patch({ date: e.target.value })} /></Field><Field label="City"><select value={draft.cityId} onChange={e => { if (!draft.visits.length || confirm('Changing city clears this draft’s visits and accommodation. Continue?')) patch({ cityId: e.target.value, accommodationId: '', visits: [] }) }}>{trip.stops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field></div>
    <Field label="Accommodation for this day"><select value={draft.accommodationId} onChange={e => patch({ accommodationId: e.target.value })}><option value="">Not assigned</option>{places.filter(p => p.category === 'stay').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <label><input type="checkbox" checked={draft.returnToStay} onChange={e => patch({ returnToStay: e.target.checked })} /> Return to accommodation after the last visit</label>
    <div className="visit-add"><select aria-label="Place to schedule" value={addId} onChange={e => setAddId(e.target.value)}><option value="">Choose a place…</option>{places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button type="button" className="button secondary" disabled={!addId || !places.some(p => p.id === addId)} onClick={() => { patch({ visits: [...draft.visits, { id: uid('visit'), placeId: addId, time: '', duration: 60, fixed: false, notes: '' }] }); setAddId('') }}>Add visit</button></div>
    {draft.visits.map((v, i) => <div className="visit-editor" key={v.id}><div className="workspace-heading"><strong>{i + 1}. {places.find(p => p.id === v.placeId)?.name}</strong><div><button type="button" aria-label={`Move visit ${i + 1} up`} disabled={!i} onClick={() => move(i, -1)}>↑</button><button type="button" aria-label={`Move visit ${i + 1} down`} disabled={i === draft.visits.length - 1} onClick={() => move(i, 1)}>↓</button><button type="button" aria-label={`Remove visit ${i + 1}`} onClick={() => patch({ visits: draft.visits.filter(x => x.id !== v.id) })}>Remove</button></div></div><div className="form-grid"><Field label={`Visit ${i + 1} time`}><input type="time" value={v.time} onChange={e => visitPatch(v.id, { time: e.target.value })} /></Field><Field label={`Visit ${i + 1} duration (minutes)`}><input type="number" required min="0" max="1440" value={v.duration} onChange={e => visitPatch(v.id, { duration: Number(e.target.value) })} /></Field></div><label><input type="checkbox" checked={v.fixed} onChange={e => visitPatch(v.id, { fixed: e.target.checked })} /> Keep this visit’s position (reservation / fixed visit)</label><input aria-label={`Visit ${i + 1} notes`} value={v.notes} onChange={e => visitPatch(v.id, { notes: e.target.value })} placeholder="Booking details, tickets, reminder…" /></div>)}
    <button type="button" className="button secondary" disabled={draft.visits.length < 2} onClick={() => { try { setSuggestion(suggestOrder(draft, places)); setError(null) } catch (e) { setError(e instanceof Error ? e.message : 'Cannot suggest a route') } }}>Suggest route order</button>
    <p className="local-help">Offline straight-line distances only, not roads or travel times. Fixed positions are preserved. Opening hours and travel time must be checked manually.</p>
    {suggestion && <div className="route-suggestion"><strong>Approximate distance: {suggestion.before.toFixed(1)} → {suggestion.after.toFixed(1)} km</strong><p>{suggestion.visits.map(v => places.find(p => p.id === v.placeId)?.name).join(' → ')}</p><button type="button" className="button primary" onClick={() => patch({ visits: suggestion.visits })}>Apply suggested order</button><p>Review appointment times, then save the day.</p></div>}
    {scheduleWarnings(draft.visits).map(w => <p className="form-error" key={w}>{w}</p>)}
    <Field label="Day notes"><textarea value={draft.notes} onChange={e => patch({ notes: e.target.value })} rows={3} /></Field>
    {error && <p className="form-error" role="alert">{error}</p>}
    <footer className="modal-actions">{day && <button type="button" className="button danger-button" onClick={() => { if (confirm('Delete this day plan? Places and photos will be kept.')) void save(() => useTravelStore.getState().deleteDay(trip.id, day.id), onClose) }}>Delete day</button>}<button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save day'}</button></footer>
  </form></Modal>
}
