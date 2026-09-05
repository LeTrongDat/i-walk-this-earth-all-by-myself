import { lazy, Suspense, type ComponentProps } from 'react'

const LazyWorldMap = lazy(() => import('./WorldMap').then((module) => ({ default: module.WorldMap })))

export function TravelMap(props: ComponentProps<typeof LazyWorldMap>) {
  return <Suspense fallback={<div className="map-loading"><span /><p>Drawing your map…</p></div>}><LazyWorldMap {...props} /></Suspense>
}
