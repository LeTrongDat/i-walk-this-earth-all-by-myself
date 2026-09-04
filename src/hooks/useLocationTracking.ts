import { useEffect } from 'react'
import { useTravelStore } from '../store/travelStore'
import { uid } from '../lib/format'

export function useLocationTracking() {
  const trackingTripId = useTravelStore((state) => state.trackingTripId)
  const addRoutePoint = useTravelStore((state) => state.addRoutePoint)
  const setTrackingTrip = useTravelStore((state) => state.setTrackingTrip)

  useEffect(() => {
    if (!trackingTripId || !('geolocation' in navigator)) return
    const watchId = navigator.geolocation.watchPosition(
      ({ coords, timestamp }) => addRoutePoint(trackingTripId, { id: uid('point'), lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy, capturedAt: new Date(timestamp).toISOString() }),
      () => setTrackingTrip(null),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [addRoutePoint, setTrackingTrip, trackingTripId])
}
