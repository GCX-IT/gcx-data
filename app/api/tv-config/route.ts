import { NextResponse } from 'next/server'

export interface PlaylistItem {
  id: string
  title: string
  url: string
  type: 'youtube' | 'stream' | 'file'
  addedAt: string
}

export interface ImageItem {
  id: string
  url: string
  name: string
  addedAt: string
}

export interface TVConfig {
  nowPlaying: string | null
  nowPlayingId: string | null
  autoNext: boolean
  loop: boolean
  playlist: PlaylistItem[]
  images: ImageItem[]
  videoDuration: number
  marketDataDuration: number
  imageDuration: number
  enableRotation: boolean
}

const DEFAULT_CONFIG: TVConfig = {
  nowPlaying: null,
  nowPlayingId: null,
  autoNext: true,
  loop: true,
  playlist: [],
  images: [],
  videoDuration: 60,
  marketDataDuration: 10,
  imageDuration: 120,
  enableRotation: false,
}

// Go backend base URL — set GCX_BACKEND_URL in Vercel env vars.
// Falls back to the VPS address used by gcx-frontend.
const GCX_BACKEND = process.env.GCX_BACKEND_URL ?? 'http://188.166.159.42:8081'

export async function GET() {
  try {
    const res = await fetch(`${GCX_BACKEND}/api/tv/config`, {
      next: { revalidate: 0 }, // always fresh
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`Backend returned ${res.status}`)
    const data: TVConfig = await res.json()
    return NextResponse.json({
      ...DEFAULT_CONFIG,
      ...data,
      playlist: Array.isArray(data.playlist) ? data.playlist : [],
      images: Array.isArray(data.images) ? data.images : [],
    })
  } catch (err) {
    console.error('GET /api/tv/config error:', err)
    return NextResponse.json({ ...DEFAULT_CONFIG })
  }
}

export async function POST(req: Request) {
  try {
    const body: Partial<TVConfig> = await req.json()

    // Forward auth header from the browser to the Go backend if present
    const authHeader = req.headers.get('Authorization') ?? ''

    const res = await fetch(`${GCX_BACKEND}/api/tv/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Backend POST /api/tv/config error:', res.status, text)
      // Return the current config rather than crashing the client
      const current = await fetch(`${GCX_BACKEND}/api/tv/config`).then(r => r.json()).catch(() => DEFAULT_CONFIG)
      return NextResponse.json(current)
    }

    const updated: TVConfig = await res.json()
    return NextResponse.json(updated)
  } catch (err) {
    console.error('POST /api/tv-config error:', err)
    return NextResponse.json({ ...DEFAULT_CONFIG })
  }
}
