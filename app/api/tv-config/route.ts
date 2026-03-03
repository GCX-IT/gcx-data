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

// On Vercel production, /tmp is the only writable directory.
// Locally, we use the project data/ folder.
const IS_VERCEL = process.env.VERCEL === '1'
const __filedir = dirname(fileURLToPath(import.meta.url))
const LOCAL_CONFIG_PATH = path.join(__filedir, '../../../data/tv-config.json')
const TMP_CONFIG_PATH = '/tmp/tv-config.json'
const CONFIG_PATH = IS_VERCEL ? TMP_CONFIG_PATH : LOCAL_CONFIG_PATH

async function safeReadConfig(): Promise<TVConfig> {
  // In production, if /tmp config doesn't exist yet, seed it from the bundled default
  if (IS_VERCEL && !existsSync(TMP_CONFIG_PATH)) {
    try {
      const bundled = await readFile(LOCAL_CONFIG_PATH, 'utf-8')
      await writeFile(TMP_CONFIG_PATH, bundled, 'utf-8')
    } catch {
      // bundled file also not accessible, just use defaults below
    }
  }
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    // Ensure all required fields exist (merges any missing keys with defaults)
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      playlist: parsed.playlist ?? [],
      images: parsed.images ?? [],
    }
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
    // On Vercel, /tmp writes should work. If they don't, log and continue —
    // returning the updated config in-memory is better than crashing with 500.
    console.error('Error writing config (non-fatal):', error, 'at path:', CONFIG_PATH)
  }
}

export async function GET() {
  const config = await safeReadConfig()
  return NextResponse.json(config)
}

export async function POST(req: Request) {
  try {
    const body: Partial<TVConfig> = await req.json()
    const current = await readConfig()
    const updated: TVConfig = {
      ...current,
      ...body,
      playlist: body.playlist ?? current.playlist ?? [],
      images: body.images ?? current.images ?? [],
    }
    await writeConfig(updated)
    return NextResponse.json(updated)
  } catch (err) {
    console.error('POST /api/tv-config error:', err)
    // Return default config instead of error so client doesn't crash
    return NextResponse.json({ ...DEFAULT_CONFIG })
  }
}
