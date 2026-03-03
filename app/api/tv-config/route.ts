import { NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

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

// Use file-based path resolution for both dev and production
const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = path.join(__dirname, '../../../data/tv-config.json')

// Fallback recursive function to safely load the config with error handling
async function safeReadConfig(): Promise<TVConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch (error) {
    console.error('Error reading config:', error, 'at path:', CONFIG_PATH)
    return { ...DEFAULT_CONFIG }
  }
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

async function readConfig(): Promise<TVConfig> {
  return safeReadConfig()
}

async function writeConfig(config: TVConfig) {
  try {
    const dir = path.dirname(CONFIG_PATH)
    if (!existsSync(dir)) await mkdir(dir, { recursive: true })
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing config:', error, 'at path:', CONFIG_PATH)
    throw error
  }
}

export async function GET() {
  try {
    const config = await readConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('GET /api/tv-config error:', error)
    const defaultConfig = DEFAULT_CONFIG
    return NextResponse.json(defaultConfig)
  }
}

export async function POST(req: Request) {
  try {
    const body: Partial<TVConfig> = await req.json()
    const current = await readConfig()
    const updated: TVConfig = { ...current, ...body }
    await writeConfig(updated)
    return NextResponse.json(updated)
  } catch (err) {
    console.error('POST /api/tv-config error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
