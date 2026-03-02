'use client'
import { useState, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Radio, Settings } from 'lucide-react'
import Link from 'next/link'

interface VideoPlayerProps {
  url?: string
  height?: number | string
}

interface TVConfig {
  nowPlaying: string | null
  loop: boolean
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') || u.pathname.split('/').pop() || null
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('?')[0] || null
    }
  } catch { /* ignore */ }
  return null
}

function isVideoFile(url: string): boolean {
  return /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url)
}

export function VideoPlayer({ url: propUrl, height = 200 }: VideoPlayerProps) {
  const [apiUrl, setApiUrl] = useState<string | null>(null)
  const [loop, setLoop] = useState(true)
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchConfig = useCallback(async () => {
    if (propUrl) return
    try {
      const res = await fetch('/api/tv-config')
      const data: TVConfig = await res.json()
      setApiUrl(data.nowPlaying)
      setLoop(data.loop ?? true)
    } catch { /* ignore */ }
  }, [propUrl])

  useEffect(() => {
    fetchConfig()
    const id = setInterval(fetchConfig, 8000)
    return () => clearInterval(id)
  }, [fetchConfig])

  const videoUrl = propUrl || apiUrl || ''
  const ytId = videoUrl ? getYouTubeId(videoUrl) : null
  const isFile = videoUrl ? isVideoFile(videoUrl) : false

  const ytEmbedUrl = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&playlist=${ytId}&modestbranding=1&rel=0&controls=1`
    : null

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

        {ytEmbedUrl && (
          <iframe
            key={ytEmbedUrl}
            src={ytEmbedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            title="GCX TV"
          />
        )}

        {isFile && videoUrl && !ytId && (
          <video
            key={videoUrl}
            src={videoUrl}
            autoPlay
            muted={muted}
            loop={loop}
            playsInline
            controls={false}
            className="absolute inset-0 w-full h-full object-contain"
          />
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