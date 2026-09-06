import { create } from 'zustand'
import { get, update } from 'idb-keyval'
import { sampleMemories, sampleTrips } from '../data/sample'
import { validateTravelData } from '../lib/validateTravelData'
import type { Memory, Profile, RoutePoint, Stop, TravelState, Trip } from '../types'

const key = 'i-walk-this-earth-data-v1'
type Result = Promise<boolean>
type Store = TravelState & {
  hydrated: boolean
  storageError: string | null
  refreshData: () => Result
  downloadRawData: () => Result
  clearStorageError: () => void
  addTrip: (trip: Trip) => Result
  updateTrip: (id: string, patch: Partial<Trip>) => Result
  deleteTrip: (id: string) => Result
  addStop: (tripId: string, stop: Stop) => Result
  updateStop: (tripId: string, stopId: string, patch: Partial<Stop>) => Result
  deleteStop: (tripId: string, stopId: string) => Result
  addMemory: (memory: Memory) => Result
  updateMemory: (id: string, patch: Partial<Memory>) => Result
  deleteMemory: (id: string) => Result
  addRoutePoint: (tripId: string, point: RoutePoint) => Result
  setTrackingTrip: (tripId: string | null) => Result
  updateProfile: (profile: Partial<Profile>) => Result
  dismissWelcome: () => Result
  replaceData: (data: TravelState) => Result
  resetAll: () => Result
}

const initialState: TravelState = {
  trips: sampleTrips, memories: sampleMemories,
  profile: { name: 'Dat Le', home: 'Ho Chi Minh City, Vietnam', bio: 'Collecting roads, small moments, and places worth returning to.', avatar: '' },
  trackingTripId: null, hasSeenWelcome: false
}

function decode(raw: unknown): TravelState {
  if (raw === undefined) return validateTravelData(initialState)
  if (typeof raw !== 'string') throw new Error('The saved atlas has an invalid format.')
  const envelope = JSON.parse(raw)
  if (!envelope || envelope.version !== 0) throw new Error('The saved atlas version is unsupported.')
  return validateTravelData(envelope.state)
}
function requireId<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find(item => item.id === id)
  if (!item) throw new Error('This item no longer exists. Refresh your atlas before trying again.')
  return item
}
function changeTrip(state: TravelState, id: string, change: (trip: Trip) => Trip): TravelState {
  const trip = requireId(state.trips, id)
  return { ...state, trips: state.trips.map(item => item.id === id ? { ...change(trip), id, updatedAt: new Date().toISOString() } : item) }
}

// Local queue orders publication; IndexedDB readwrite transactions serialize across tabs.
// No in-memory changes are published until the complete transaction commits.
let queue: Promise<unknown> = Promise.resolve()
export const useTravelStore = create<Store>((setState) => {
  function run(work: () => Promise<void>, message: string): Result {
    const operation = queue.then(async () => {
      try { await work(); return true }
      catch (error) {
        setState({ storageError: message + ' ' + (error instanceof Error ? error.message : 'Browser storage is unavailable or full.') })
        return false
      }
    })
    queue = operation
    return operation
  }
  function mutate(change: (state: TravelState) => TravelState, replace = false): Result {
    return run(async () => {
      let committed: TravelState | undefined
      await update(key, (raw: unknown) => {
        committed = validateTravelData(change(replace ? initialState : decode(raw)))
        return JSON.stringify({ state: committed, version: 0 })
      })
      setState({ ...committed!, hydrated: true, storageError: null })
    }, 'Changes were not saved.')
  }
  return {
    ...initialState, hydrated: false, storageError: null,
    clearStorageError: () => setState({ storageError: null }),
    refreshData: () => run(async () => {
      const data = decode(await get(key))
      setState({ ...data, hydrated: true, storageError: null })
    }, 'Your saved atlas could not be opened. It has not been replaced.'),
    downloadRawData: () => run(async () => {
      const raw = await get(key)
      if (raw === undefined) throw new Error('There is no saved atlas to download.')
      const url = URL.createObjectURL(new Blob([typeof raw === 'string' ? raw : JSON.stringify(raw)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'i-walk-this-earth-raw-recovery.json'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'The recovery copy could not be downloaded.'),
    addTrip: trip => mutate(state => ({ ...state, trips: [trip, ...state.trips] })),
    updateTrip: (id, patch) => mutate(state => changeTrip(state, id, trip => ({ ...trip, ...patch }))),
    deleteTrip: id => mutate(state => {
      requireId(state.trips, id)
      return { ...state, trips: state.trips.filter(t => t.id !== id), memories: state.memories.filter(m => m.tripId !== id), trackingTripId: state.trackingTripId === id ? null : state.trackingTripId }
    }),
    addStop: (tripId, stop) => mutate(state => changeTrip(state, tripId, trip => ({ ...trip, stops: [...trip.stops, stop].sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate)) }))),
    updateStop: (tripId, stopId, patch) => mutate(state => changeTrip(state, tripId, trip => {
      requireId(trip.stops, stopId)
      return { ...trip, stops: trip.stops.map(s => s.id === stopId ? { ...s, ...patch, id: stopId } : s).sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate)) }
    })),
    deleteStop: (tripId, stopId) => mutate(state => {
      const next = changeTrip(state, tripId, trip => {
        requireId(trip.stops, stopId)
        return { ...trip, stops: trip.stops.filter(s => s.id !== stopId) }
      })
      return { ...next, memories: state.memories.map(m => m.tripId === tripId && m.stopId === stopId ? { ...m, stopId: undefined } : m) }
    }),
    addMemory: memory => mutate(state => ({ ...state, memories: [memory, ...state.memories] })),
    updateMemory: (id, patch) => mutate(state => {
      requireId(state.memories, id)
      return { ...state, memories: state.memories.map(m => m.id === id ? { ...m, ...patch, id } : m) }
    }),
    deleteMemory: id => mutate(state => {
      requireId(state.memories, id)
      return { ...state, memories: state.memories.filter(m => m.id !== id) }
    }),
    addRoutePoint: (tripId, point) => mutate(state => changeTrip(state, tripId, trip => ({ ...trip, route: [...trip.route, point] }))),
    setTrackingTrip: trackingTripId => mutate(state => ({ ...state, trackingTripId })),
    updateProfile: profile => mutate(state => ({ ...state, profile: { ...state.profile, ...profile } })),
    dismissWelcome: () => mutate(state => ({ ...state, hasSeenWelcome: true })),
    replaceData: data => mutate(() => ({ ...validateTravelData(data), trackingTripId: null }), true),
    resetAll: () => mutate(() => validateTravelData(initialState), true)
  }
})

void useTravelStore.getState().refreshData()
