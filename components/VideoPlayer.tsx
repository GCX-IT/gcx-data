'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Radio, Settings, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react'
import Link from 'next/link'
import ReactPlayer from 'react-player'

interface VideoPlayerProps {
  url?: string
  /** Forces a remount when the same URL should restart (e.g. offline playlist loop). */
  mediaKey?: string | number
  height?: number | string
  onEnded?: () => void
  onError?: () => void
  paused?: boolean
  onTogglePause?: () => void
  onPrev?: () => void
  onNext?: () => void
  seekStepSeconds?: number
  fitMode?: 'cover' | 'contain'
  localOnly?: boolean
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

export function VideoPlayer({
  url: propUrl,
  mediaKey,
  height = 200,
  onEnded,
  onError,
  paused: controlledPaused,
  onTogglePause,
  onPrev,
  onNext,
  seekStepSeconds = 10,
  fitMode = 'contain',
  localOnly = false,
}: VideoPlayerProps) {
  const [config, setConfig] = useState<TVConfig | null>(null)
  const [muted, setMuted] = useState(true)
  const [isPausedLocal, setIsPausedLocal] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [overrideNowPlaying, setOverrideNowPlaying] = useState<{ id: string | null; url: string | null } | null>(null)
  const lastServerNowPlayingId = useRef<string | null>(null)
  const playerRef = useRef<any>(null)

  const fetchConfig = useCallback(async () => {
    if (localOnly || propUrl !== undefined) return
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
  }, [localOnly, propUrl])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const effectiveNowPlaying = localOnly
    ? (propUrl ?? null)
    : (propUrl ?? overrideNowPlaying?.url ?? config?.nowPlaying ?? null)
  const effectiveNowPlayingId = overrideNowPlaying?.id ?? config?.nowPlayingId ?? null
  const playlist = config?.playlist ?? []
  const autoNext = config?.autoNext ?? true
  const loopPlaylist = config?.loop ?? true

  const videoUrl = effectiveNowPlaying || ''

  const canAutoAdvance = useMemo(() => {
    if (localOnly) return false
    if (propUrl) return false
    if (!autoNext) return false
    if (!effectiveNowPlaying) return false
    if (playlist.length < 1) return false
    return true
  }, [autoNext, effectiveNowPlaying, localOnly, playlist.length, propUrl])

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
    if (propUrl) {
      onEnded?.()
      return
    }
    if (!canAutoAdvance) return
    const next = computeNextItem()
    await pushNowPlaying(next)
  }, [canAutoAdvance, computeNextItem, onEnded, propUrl, pushNowPlaying])

  const handleError = useCallback(async () => {
    if (propUrl) {
      onError?.()
      return
    }
    // If something fails to load, try to advance rather than freezing the screen.
    if (!canAutoAdvance) return
    const next = computeNextItem()
    await pushNowPlaying(next)
  }, [canAutoAdvance, computeNextItem, onError, propUrl, pushNowPlaying])

  const isFill = height === '100%'
  const containerStyle = expanded
    ? { position: 'fixed' as const, inset: 0, zIndex: 9999 }
    : isFill
    ? { flex: 1, minHeight: 0 }
    : { height }

  function seekBy(delta: number) {
    const player = playerRef.current
    if (!player || typeof player.getCurrentTime !== 'function' || typeof player.seekTo !== 'function') return
    const current = Number(player.getCurrentTime?.() ?? 0)
    const target = Math.max(0, current + delta)
    player.seekTo(target, 'seconds')
  }

  function togglePause() {
    if (onTogglePause) {
      onTogglePause()
      return
    }
    setIsPausedLocal(v => !v)
  }

  const resolvedPaused = typeof controlledPaused === 'boolean' ? controlledPaused : isPausedLocal

  return (
    <section
      className="relative bg-black border-b border-border flex items-stretch overflow-hidden transition-all duration-300"
      style={containerStyle}
    >
      {/* LEFT BRAND LABEL */}
      <div className="flex-shrink-0 w-8 sm:w-[52px] bg-[#ffaa00] text-black flex flex-col items-center justify-center gap-1.5 font-black z-20 shadow-[4px_0_20px_rgba(0,0,0,0.4)]">
        <Radio size={13} className="animate-pulse" />
        <span className="hidden sm:inline text-[7px] font-black tracking-widest uppercase [writing-mode:vertical-rl] rotate-180 leading-none">
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
          <div className="absolute inset-0 flex items-center justify-center bg-black gcx-react-player">
            <ReactPlayer
              ref={playerRef}
              key={`${mediaKey ?? ''}:${videoUrl}`}
              src={videoUrl}
              width="100%"
              height="100%"
              playing={!resolvedPaused}
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
              } as any}
              style={{ objectFit: fitMode, objectPosition: 'center center' }}
            />
          </div>
        )}
      </div>

      {/* BOTTOM-RIGHT CONTROLS */}
      <div className="absolute bottom-2 left-2 right-2 sm:left-auto sm:right-3 flex items-center justify-end flex-wrap gap-1.5 z-30">
        <button
          onClick={() => seekBy(-Math.abs(seekStepSeconds))}
          title={`Back ${seekStepSeconds}s`}
          className="bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-sm transition backdrop-blur-sm"
        >
          <Rewind size={11} />
        </button>
        {onPrev && (
          <button
            onClick={onPrev}
            title="Previous"
            className="bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-sm transition backdrop-blur-sm"
          >
            <SkipBack size={11} />
          </button>
        )}
        <button
          onClick={() => setMuted(v => !v)}
          title={muted ? 'Unmute' : 'Mute'}
          className="bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-sm transition backdrop-blur-sm"
        >
          {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
        </button>
        <button
          onClick={togglePause}
          title={resolvedPaused ? 'Play' : 'Pause'}
          className="bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-sm transition backdrop-blur-sm"
        >
          {resolvedPaused ? <Play size={11} /> : <Pause size={11} />}
        </button>
        {onNext && (
          <button
            onClick={onNext}
            title="Next"
            className="bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-sm transition backdrop-blur-sm"
          >
            <SkipForward size={11} />
          </button>
        )}
        <button
          onClick={() => seekBy(Math.abs(seekStepSeconds))}
          title={`Forward ${seekStepSeconds}s`}
          className="bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-sm transition backdrop-blur-sm"
        >
          <FastForward size={11} />
        </button>
        <Link
          href="/tv-admin"
          title="TV Admin"
          className="hidden sm:inline-flex bg-black/60 hover:bg-[#ffaa00]/80 text-white hover:text-black p-1.5 rounded-sm transition backdrop-blur-sm"
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
      <div className="absolute top-2 right-2 sm:right-3 flex items-center gap-1.5 z-30 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-sm">
        {videoUrl ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[9px] font-black text-white uppercase tracking-widest">Live</span>
          </>
        ) : (
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Off Air</span>
        )}
      </div>

      <style jsx global>{`
        .gcx-react-player,
        .gcx-react-player > * {
          width: 100% !important;
          height: 100% !important;
          background: #000;
        }
        .gcx-react-player video {
          width: 100% !important;
          height: 100% !important;
          object-fit: ${fitMode};
          object-position: center center;
          background: #000;
        }
        .gcx-react-player iframe {
          width: 100% !important;
          height: 100% !important;
          background: #000;
        }
      `}</style>
    </section>
  )
}
