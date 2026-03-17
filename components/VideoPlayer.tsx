'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Radio, Settings } from 'lucide-react'
import Link from 'next/link'
import ReactPlayer from 'react-player'

interface VideoPlayerProps {
  url?: string
  height?: number | string
}

const TOKEN_KEY = 'gcx_auth_token'

interface PlaylistItem {
  id: string
  title: string
  url: string
  type: 'youtube' | 'stream' | 'file'
  addedAt: string
}

interface TVConfig {
  nowPlaying: string | null
  nowPlayingId: string | null
  autoNext: boolean
  loop: boolean
  playlist: PlaylistItem[]
}

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

export function VideoPlayer({ url: propUrl, height = 200 }: VideoPlayerProps) {
  const [config, setConfig] = useState<TVConfig | null>(null)
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [overrideNowPlaying, setOverrideNowPlaying] = useState<{ id: string | null; url: string | null } | null>(null)
  const lastServerNowPlayingId = useRef<string | null>(null)

  const fetchConfig = useCallback(async () => {
    if (propUrl) return
    try {
      const res = await fetch('/api/tv-config')
      const data = await res.json()

      const next: TVConfig = {
        nowPlaying: typeof data?.nowPlaying === 'string' ? data.nowPlaying : null,
        nowPlayingId: typeof data?.nowPlayingId === 'string' ? data.nowPlayingId : null,
        autoNext: !!data?.autoNext,
        loop: data?.loop !== false,
        playlist: safeArray<PlaylistItem>(data?.playlist),
      }

      // If admin changed what's on-air (server pointer changed), drop any local override.
      if (lastServerNowPlayingId.current !== next.nowPlayingId) {
        setOverrideNowPlaying(null)
        lastServerNowPlayingId.current = next.nowPlayingId
      }

      // If we pushed an override and the server has caught up, clear it.
      setOverrideNowPlaying(prev => {
        if (!prev) return prev
        if (prev.id === next.nowPlayingId && prev.url === next.nowPlaying) return null
        return prev
      })

      setConfig(next)
    } catch { /* ignore */ }
  }, [propUrl])

  useEffect(() => {
    fetchConfig()
    const id = setInterval(fetchConfig, 8000)
    return () => clearInterval(id)
  }, [fetchConfig])

  const effectiveNowPlaying = propUrl ?? overrideNowPlaying?.url ?? config?.nowPlaying ?? null
  const effectiveNowPlayingId = overrideNowPlaying?.id ?? config?.nowPlayingId ?? null
  const playlist = config?.playlist ?? []
  const autoNext = config?.autoNext ?? true
  const loopPlaylist = config?.loop ?? true

  const videoUrl = effectiveNowPlaying || ''

  const canAutoAdvance = useMemo(() => {
    if (propUrl) return false
    if (!autoNext) return false
    if (!effectiveNowPlaying) return false
    if (playlist.length < 1) return false
    return true
  }, [autoNext, effectiveNowPlaying, playlist.length, propUrl])

  const computeNextItem = useCallback((): PlaylistItem | null => {
    if (playlist.length === 0) return null

    let idx = -1
    if (effectiveNowPlayingId) {
      idx = playlist.findIndex(p => p.id === effectiveNowPlayingId)
    }
    if (idx === -1 && effectiveNowPlaying) {
      idx = playlist.findIndex(p => p.url === effectiveNowPlaying)
    }

    // If we can't find it, start from the beginning.
    if (idx === -1) idx = 0

    const nextIdx = idx + 1
    if (nextIdx < playlist.length) return playlist[nextIdx]
    if (loopPlaylist) return playlist[0]
    return null
  }, [effectiveNowPlaying, effectiveNowPlayingId, loopPlaylist, playlist])

  const pushNowPlaying = useCallback(async (nextItem: PlaylistItem | null) => {
    const payload = {
      nowPlaying: nextItem?.url ?? null,
      nowPlayingId: nextItem?.id ?? null,
    }

    // Always update local playback immediately.
    setOverrideNowPlaying({ id: payload.nowPlayingId, url: payload.nowPlaying })

    // If we have an auth token, also persist to backend so all displays stay in sync.
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null
      if (!token) return
      await fetch('/api/tv-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
    } catch {
      // ignore; local override keeps playback moving
    }
  }, [])

  const handleEnded = useCallback(async () => {
    if (!canAutoAdvance) return
    const next = computeNextItem()
    await pushNowPlaying(next)
  }, [canAutoAdvance, computeNextItem, pushNowPlaying])

  const handleError = useCallback(async () => {
    // If something fails to load, try to advance rather than freezing the screen.
    if (!canAutoAdvance) return
    const next = computeNextItem()
    await pushNowPlaying(next)
  }, [canAutoAdvance, computeNextItem, pushNowPlaying])

  const isFill = height === '100%'
  const containerStyle = expanded
    ? { position: 'fixed' as const, inset: 0, zIndex: 9999 }
    : isFill
    ? { flex: 1, minHeight: 0 }
    : { height }

  return (
    <section
      className="relative bg-black border-b border-border flex items-stretch overflow-hidden transition-all duration-300"
      style={containerStyle}
    >
      {/* LEFT BRAND LABEL */}
      <div className="flex-shrink-0 w-[52px] bg-[#ffaa00] text-black flex flex-col items-center justify-center gap-1.5 font-black z-20 shadow-[4px_0_20px_rgba(0,0,0,0.4)]">
        <Radio size={13} className="animate-pulse" />
        <span className="text-[7px] font-black tracking-widest uppercase [writing-mode:vertical-rl] rotate-180 leading-none">
          GCX TV
        </span>
      </div>

      {/* VIDEO AREA */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {!videoUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-700">
            <Radio size={28} />
            <p className="text-[10px] font-black uppercase tracking-widest text-center">
              No video playing
            </p>
            <Link
              href="/tv-admin"
              className="flex items-center gap-1.5 bg-[#ffaa00]/10 hover:bg-[#ffaa00]/20 border border-[#ffaa00]/30 text-[#ffaa00] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition"
            >
              <Settings size={10} /> Open TV Admin
            </Link>
          </div>
        )}

        {videoUrl && (
          <div className="absolute inset-0">
            <ReactPlayer
              key={videoUrl}
              src={videoUrl}
              width="100%"
              height="100%"
              playing={!paused}
              muted={muted}
              controls={false}
              playsInline
              onEnded={() => { void handleEnded() }}
              onError={() => { void handleError() }}
              config={{
                youtube: {
                  playerVars: {
                    autoplay: 1,
                    modestbranding: 1,
                    rel: 0,
                  },
                } as any,
              }}
              style={{ objectFit: 'contain' }}
            />
          </div>
        )}
      </div>

      {/* BOTTOM-RIGHT CONTROLS */}
      <div className="absolute bottom-2 right-3 flex items-center gap-1.5 z-30">
        <button
          onClick={() => setMuted(v => !v)}
          title={muted ? 'Unmute' : 'Mute'}
          className="bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-sm transition backdrop-blur-sm"
        >
          {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
        </button>
        <button
          onClick={() => setPaused(v => !v)}
          title={paused ? 'Play' : 'Pause'}
          className="bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-sm transition backdrop-blur-sm"
        >
          {paused ? <Play size={11} /> : <Pause size={11} />}
        </button>
        <Link
          href="/tv-admin"
          title="TV Admin"
          className="bg-black/60 hover:bg-[#ffaa00]/80 text-white hover:text-black p-1.5 rounded-sm transition backdrop-blur-sm"
        >
          <Settings size={11} />
        </Link>
        <button
          onClick={() => setExpanded(v => !v)}
          title={expanded ? 'Collapse' : 'Expand'}
          className="bg-[#ffaa00]/80 hover:bg-[#ffaa00] text-black p-1.5 rounded-sm transition backdrop-blur-sm"
        >
          {expanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
        </button>
      </div>

      {/* TOP-RIGHT: LIVE / OFF AIR */}
      <div className="absolute top-2 right-3 flex items-center gap-1.5 z-30 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-sm">
        {videoUrl ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[9px] font-black text-white uppercase tracking-widest">Live</span>
          </>
        ) : (
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Off Air</span>
        )}
      </div>
    </section>
  )
}