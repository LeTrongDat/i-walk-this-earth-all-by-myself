export type TripStatus = 'planned' | 'active' | 'completed'
export type TripVisibility = 'private' | 'link' | 'public'
export type TransportMode = 'walk' | 'bike' | 'car' | 'train' | 'boat' | 'flight' | 'other'

export interface Coordinates {
  lat: number
  lng: number
}

export interface Photo {
  id: string
  src: string
  caption?: string
}

export interface Stop extends Coordinates {
  id: string
  name: string
  country: string
  arrivalDate: string
  departureDate?: string
  notes?: string
  accommodation?: string
  transport: TransportMode
  activities: string[]
}

export interface Memory extends Coordinates {
  id: string
  tripId: string
  stopId?: string
  title: string
  place: string
  date: string
  story: string
  mood: string
  photos: Photo[]
}

export interface RoutePoint extends Coordinates {
  id: string
  capturedAt: string
  accuracy?: number
}

export interface Trip {
  id: string
  title: string
  summary: string
  cover: string
  startDate: string
  endDate?: string
  status: TripStatus
  visibility: TripVisibility
  stops: Stop[]
  route: RoutePoint[]
  createdAt: string
  updatedAt: string
}

export interface Profile {
  name: string
  home: string
  bio: string
  avatar: string
}

export interface TravelState {
  trips: Trip[]
  memories: Memory[]
  profile: Profile
  trackingTripId: string | null
  hasSeenWelcome: boolean
}

export interface PlaceResult extends Coordinates {
  id: string
  name: string
  country: string
  displayName: string
}
