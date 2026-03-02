import { NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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
  nowPlaying: string | null   // URL currently playing (null = nothing)
  nowPlayingId: string | null // ID of the playlist item currently playing
  autoNext: boolean           // auto-advance through playlist
  loop: boolean               // loop playlist when finished
  playlist: PlaylistItem[]
  // Phase rotation settings
  images: ImageItem[]         // Images to display in rotation
  videoDuration: number       // How long to show video before rotating (seconds)
  marketDataDuration: number  // How long to show market data (seconds)
  imageDuration: number       // How long to show each image (seconds)
  enableRotation: boolean     // Enable rotation cycle
}

const CONFIG_PATH = path.join(process.cwd(), 'data', 'tv-config.json')

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

async function readConfig(): Promise<TVConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

async function writeConfig(config: TVConfig) {
  const dir = path.dirname(CONFIG_PATH)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export async function GET() {
  const config = await readConfig()
  return NextResponse.json(config)
}

export async function POST(req: Request) {
  try {
    const body: Partial<TVConfig> = await req.json()
    const current = await readConfig()
    const updated: TVConfig = { ...current, ...body }
    await writeConfig(updated)
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
