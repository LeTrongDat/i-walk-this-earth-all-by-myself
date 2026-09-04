import type { Memory, Trip } from '../types'

const vietnamCover = 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=85'

export const sampleTrips: Trip[] = [
  {
    id: 'trip_vietnam',
    title: 'A slow road through Vietnam',
    summary: 'Night trains, mountain roads, bowls of phở, and a long way home.',
    cover: vietnamCover,
    startDate: '2025-10-03',
    endDate: '2025-10-18',
    status: 'completed',
    visibility: 'private',
    createdAt: '2025-09-04T08:00:00.000Z',
    updatedAt: '2025-10-20T08:00:00.000Z',
    route: [],
    stops: [
      { id: 'stop_hanoi', name: 'Hanoi', country: 'Vietnam', lat: 21.0278, lng: 105.8342, arrivalDate: '2025-10-03', departureDate: '2025-10-06', transport: 'flight', activities: ['Old Quarter walk', 'Street food evening'], accommodation: 'A little room near Hoàn Kiếm', notes: 'Arrive slowly. Leave the first afternoon empty.' },
      { id: 'stop_hagiang', name: 'Hà Giang', country: 'Vietnam', lat: 22.8026, lng: 104.9784, arrivalDate: '2025-10-07', departureDate: '2025-10-11', transport: 'bike', activities: ['Mã Pí Lèng Pass', 'Sunday market'], notes: 'The road is the whole point.' },
      { id: 'stop_hue', name: 'Huế', country: 'Vietnam', lat: 16.4637, lng: 107.5909, arrivalDate: '2025-10-12', departureDate: '2025-10-14', transport: 'train', activities: ['Imperial City', 'Perfume River'], notes: 'Take the overnight train south.' },
      { id: 'stop_hoian', name: 'Hội An', country: 'Vietnam', lat: 15.8801, lng: 108.338, arrivalDate: '2025-10-14', departureDate: '2025-10-18', transport: 'car', activities: ['Early market', 'An Bàng beach'], notes: 'A quiet ending by the sea.' }
    ]
  },
  {
    id: 'trip_japan',
    title: 'Autumn light in Japan',
    summary: 'A future journey through Tokyo, the Alps, and Kyoto.',
    cover: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1600&q=85',
    startDate: '2026-11-06',
    endDate: '2026-11-18',
    status: 'planned',
    visibility: 'private',
    createdAt: '2026-01-02T08:00:00.000Z',
    updatedAt: '2026-01-02T08:00:00.000Z',
    route: [],
    stops: [
      { id: 'stop_tokyo', name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, arrivalDate: '2026-11-06', departureDate: '2026-11-09', transport: 'flight', activities: ['Kiyosumi gardens', 'Kissaten morning'] },
      { id: 'stop_matsumoto', name: 'Matsumoto', country: 'Japan', lat: 36.2381, lng: 137.972, arrivalDate: '2026-11-10', departureDate: '2026-11-12', transport: 'train', activities: ['Castle at opening', 'Nakamachi walk'] },
      { id: 'stop_kyoto', name: 'Kyoto', country: 'Japan', lat: 35.0116, lng: 135.7681, arrivalDate: '2026-11-13', departureDate: '2026-11-18', transport: 'train', activities: ['Philosopher’s Path', 'Kurama day hike'] }
    ]
  }
]

export const sampleMemories: Memory[] = [
  {
    id: 'memory_hanoi', tripId: 'trip_vietnam', stopId: 'stop_hanoi', title: 'The city wakes before us', place: 'Hanoi, Vietnam', date: '2025-10-04', lat: 21.0278, lng: 105.8342, mood: 'Wonderstruck',
    story: 'We followed the sound of metal shutters and tiny stools appearing on the pavement. By seven, the street was already a dining room. The coffee was dark, sweet, and somehow tasted like the beginning of everything.',
    photos: [
      { id: 'photo_hanoi_1', src: 'https://images.unsplash.com/photo-1555921015-5532091f6026?auto=format&fit=crop&w=1400&q=85', caption: 'Morning in the Old Quarter' },
      { id: 'photo_hanoi_2', src: 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=1000&q=85', caption: 'A quiet corner' }
    ]
  },
  {
    id: 'memory_hagiang', tripId: 'trip_vietnam', stopId: 'stop_hagiang', title: 'Above the Nho Quế', place: 'Hà Giang, Vietnam', date: '2025-10-09', lat: 23.253, lng: 105.405, mood: 'Alive',
    story: 'Clouds moved below the road and every bend opened onto another impossible wall of green. We stopped without speaking. Some places make language feel unnecessary.',
    photos: [{ id: 'photo_hagiang_1', src: 'https://images.unsplash.com/photo-1570366583862-f91883984fde?auto=format&fit=crop&w=1400&q=85', caption: 'The road north' }]
  },
  {
    id: 'memory_hoian', tripId: 'trip_vietnam', stopId: 'stop_hoian', title: 'Lantern weather', place: 'Hội An, Vietnam', date: '2025-10-16', lat: 15.8801, lng: 108.338, mood: 'Soft',
    story: 'Rain polished the old streets. We waited it out under a yellow awning, sharing cao lầu and watching bicycles drift between lanterns.',
    photos: [{ id: 'photo_hoian_1', src: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1400&q=85', caption: 'After the rain' }]
  }
]
