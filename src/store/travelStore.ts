import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import { sampleMemories, sampleTrips } from '../data/sample'
import type { Memory, Profile, RoutePoint, Stop, TravelState, Trip } from '../types'

const indexedStorage = {
  getItem: async (name: string) => (await get(name)) ?? null,
  setItem: async (name: string, value: string) => set(name, value),
  removeItem: async (name: string) => del(name)
}

type Store = TravelState & {
  hydrated: boolean
  setHydrated: (value: boolean) => void
  addTrip: (trip: Trip) => void
  updateTrip: (id: string, patch: Partial<Trip>) => void
  deleteTrip: (id: string) => void
  addStop: (tripId: string, stop: Stop) => void
  updateStop: (tripId: string, stopId: string, patch: Partial<Stop>) => void
  deleteStop: (tripId: string, stopId: string) => void
  addMemory: (memory: Memory) => void
  updateMemory: (id: string, patch: Partial<Memory>) => void
  deleteMemory: (id: string) => void
  addRoutePoint: (tripId: string, point: RoutePoint) => void
  setTrackingTrip: (tripId: string | null) => void
  updateProfile: (profile: Partial<Profile>) => void
  dismissWelcome: () => void
  replaceData: (data: TravelState) => void
  resetAll: () => void
}

const initialState: TravelState = {
  trips: sampleTrips,
  memories: sampleMemories,
  profile: {
    name: 'Dat Le',
    home: 'Ho Chi Minh City, Vietnam',
    bio: 'Collecting roads, small moments, and places worth returning to.',
    avatar: ''
  },
  trackingTripId: null,
  hasSeenWelcome: false
}

export const useTravelStore = create<Store>()(
  persist(
    (setState) => ({
      ...initialState,
      hydrated: true,
      setHydrated: (hydrated) => setState({ hydrated }),
      addTrip: (trip) => setState((state) => ({ trips: [trip, ...state.trips] })),
      updateTrip: (id, patch) => setState((state) => ({ trips: state.trips.map((trip) => trip.id === id ? { ...trip, ...patch, updatedAt: new Date().toISOString() } : trip) })),
      deleteTrip: (id) => setState((state) => ({ trips: state.trips.filter((trip) => trip.id !== id), memories: state.memories.filter((memory) => memory.tripId !== id), trackingTripId: state.trackingTripId === id ? null : state.trackingTripId })),
      addStop: (tripId, stop) => setState((state) => ({ trips: state.trips.map((trip) => trip.id === tripId ? { ...trip, stops: [...trip.stops, stop].sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate)), updatedAt: new Date().toISOString() } : trip) })),
      updateStop: (tripId, stopId, patch) => setState((state) => ({ trips: state.trips.map((trip) => trip.id === tripId ? { ...trip, stops: trip.stops.map((stop) => stop.id === stopId ? { ...stop, ...patch } : stop), updatedAt: new Date().toISOString() } : trip) })),
      deleteStop: (tripId, stopId) => setState((state) => ({ trips: state.trips.map((trip) => trip.id === tripId ? { ...trip, stops: trip.stops.filter((stop) => stop.id !== stopId), updatedAt: new Date().toISOString() } : trip), memories: state.memories.map((memory) => memory.stopId === stopId ? { ...memory, stopId: undefined } : memory) })),
      addMemory: (memory) => setState((state) => ({ memories: [memory, ...state.memories] })),
      updateMemory: (id, patch) => setState((state) => ({ memories: state.memories.map((memory) => memory.id === id ? { ...memory, ...patch } : memory) })),
      deleteMemory: (id) => setState((state) => ({ memories: state.memories.filter((memory) => memory.id !== id) })),
      addRoutePoint: (tripId, point) => setState((state) => ({ trips: state.trips.map((trip) => trip.id === tripId ? { ...trip, route: [...trip.route, point], updatedAt: new Date().toISOString() } : trip) })),
      setTrackingTrip: (trackingTripId) => setState({ trackingTripId }),
      updateProfile: (profile) => setState((state) => ({ profile: { ...state.profile, ...profile } })),
      dismissWelcome: () => setState({ hasSeenWelcome: true }),
      replaceData: (data) => setState({ ...data, hydrated: true, trackingTripId: null }),
      resetAll: () => setState({ ...initialState, hydrated: true })
    }),
    {
      name: 'i-walk-this-earth-data-v1',
      storage: createJSONStorage(() => indexedStorage),
      partialize: ({ trips, memories, profile, trackingTripId, hasSeenWelcome }) => ({ trips, memories, profile, trackingTripId, hasSeenWelcome }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true)
    }
  )
)
