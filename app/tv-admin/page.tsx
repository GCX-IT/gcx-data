'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import {
  Play, Square, Trash2, Plus, Radio, Settings,
  Youtube, Film, Wifi, RefreshCw, ChevronRight,
  ToggleLeft, ToggleRight, List, ExternalLink, Copy, Check, Image, Upload
} from 'lucide-react'
import type { TVConfig, PlaylistItem } from '@/app/api/tv-config/route'

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as ComponentType<any>

// ─── helpers ────────────────────────────────────────────────────────────────
function detectType(url: string): PlaylistItem['type'] {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  if (/\.m3u8|rtmp:|rtsp:|udp:/i.test(url)) return 'stream'
  return 'file'
}

function typeIcon(type: PlaylistItem['type']) {
  if (type === 'youtube') return <Youtube size={12} className="text-rose-500" />
  if (type === 'stream') return <Wifi size={12} className="text-emerald-500" />
  return <Film size={12} className="text-sky-400" />
}

function typeLabel(type: PlaylistItem['type']) {
  if (type === 'youtube') return 'YouTube'
  if (type === 'stream') return 'Live Stream'
  return 'Video File'
}

// ─── main component ──────────────────────────────────────────────────────────
export default function TVAdminPage() {
  const [config, setConfig] = useState<TVConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // add-form state
  const [addTitle, setAddTitle] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addType, setAddType] = useState<PlaylistItem['type']>('youtube')

  // image upload state
  const [uploading, setUploading] = useState(false)
  const [imageName, setImageName] = useState('')

  const fetchConfig = useCallback(async () => {
    const res = await fetch('/api/tv-config')
    const data = await res.json()
    setConfig(data)
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  // Auto-detect type as user types URL
  useEffect(() => {
    if (addUrl) setAddType(detectType(addUrl))
  }, [addUrl])

  async function save(patch: Partial<TVConfig>) {
    setSaving(true)
    const res = await fetch('/api/tv-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    setConfig(data)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function setNowPlaying(item: PlaylistItem | null) {
    save({ nowPlaying: item?.url ?? null, nowPlayingId: item?.id ?? null })
  }

  function stopPlaying() {
    save({ nowPlaying: null, nowPlayingId: null })
  }

  function addToPlaylist() {
    if (!addUrl.trim() || !config) return
    const newItem: PlaylistItem = {
      id: Date.now().toString(),
      title: addTitle.trim() || addUrl,
      url: addUrl.trim(),
      type: addType,
      addedAt: new Date().toISOString(),
    }
    const updated = [...config.playlist, newItem]
    save({ playlist: updated })
    setAddTitle('')
    setAddUrl('')
  }

  function removeFromPlaylist(id: string) {
    if (!config) return
    const updated = config.playlist.filter(i => i.id !== id)
    const patch: Partial<TVConfig> = { playlist: updated }
    if (config.nowPlayingId === id) { patch.nowPlaying = null; patch.nowPlayingId = null }
    save(patch)
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !config) return

    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', imageName.trim() || file.name)

    try {
      const res = await fetch('/api/tv-upload-image', {
        method: 'POST',
        body: fd,
      })
      const result = await res.json()
      if (result.success) {
        const newImage = { url: result.url, name: result.name, id: Date.now().toString(), addedAt: new Date().toISOString() }
        save({ images: [...config.images, newImage] })
        setImageName('')
        e.target.value = '' // reset input
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  function removeImage(url: string) {
    if (!config) return
    const updated = config.images.filter(i => i.url !== url)
    save({ images: updated })
  }

  if (!config) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-[#ffaa00]">
      <div className="w-10 h-10 border-2 border-[#ffaa00] border-t-transparent animate-spin rounded-full" />
    </div>
  )

  const nowPlayingItem = config.playlist.find(i => i.id === config.nowPlayingId) ?? null

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-mono">

      {/* PAGE HEADER */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-[#ffaa00] text-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">ADMIN</span>
              <h1 className="text-2xl font-black tracking-tighter uppercase">TV Control Panel</h1>
            </div>
            <p className="text-zinc-500 text-xs tracking-wider">Manage the GCX TV Terminal — playlist, live streams, YouTube</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/tv-display"
              target="_blank"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 px-4 py-2 text-[11px] font-black uppercase tracking-widest transition"
            >
              <ExternalLink size={12} />
              Public Display
            </a>
            <a
              href="/tv"
              target="_blank"
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2 text-[11px] font-black uppercase tracking-widest transition"
            >
              <ExternalLink size={12} />
              Admin TV Terminal
            </a>
            <button
              onClick={fetchConfig}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 text-[11px] font-black uppercase transition"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── LEFT: NOW PLAYING ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* NOW PLAYING CARD */}
          <div className="bg-zinc-900 border border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {config.nowPlaying
                  ? <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /><span className="text-[10px] font-black uppercase tracking-widest text-rose-400">On Air</span></span>
                  : <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-600" /><span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Off Air</span></span>
                }
              </div>
              {config.nowPlaying && (
                <button
                  onClick={stopPlaying}
                  className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 text-[10px] font-black uppercase transition"
                >
                  <Square size={10} /> Stop
                </button>
              )}
            </div>

            {/* PREVIEW PLAYER */}
            <div className="w-full bg-black aspect-video relative overflow-hidden border border-zinc-800">
              {config.nowPlaying ? (
                <>
                  <ReactPlayer
                    url={config.nowPlaying}
                    playing
                    muted
                    loop={config.loop}
                    width="100%"
                    height="100%"
                    style={{ position: 'absolute', top: 0, left: 0 }}
                  />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Live Preview</span>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-700">
                  <Radio size={32} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Nothing Playing</span>
                  <span className="text-[10px] text-zinc-600">Add items to the playlist and press Set Live</span>
                </div>
              )}
            </div>

            {/* NOW PLAYING INFO */}
            {nowPlayingItem && (
              <div className="mt-3 flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 px-4 py-3">
                {typeIcon(nowPlayingItem.type)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black truncate">{nowPlayingItem.title}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{nowPlayingItem.url}</div>
                </div>
                <span className="text-[9px] text-zinc-500 font-black uppercase">{typeLabel(nowPlayingItem.type)}</span>
              </div>
            )}
          </div>

          {/* ADD VIDEO FORM */}
          <div className="bg-zinc-900 border border-zinc-800 p-6">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <Plus size={12} /> Add to Playlist
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Title (optional — auto-filled from URL)"
                value={addTitle}
                onChange={e => setAddTitle(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-[#ffaa00] px-4 py-3 text-sm font-mono text-white placeholder:text-zinc-600 outline-none transition"
              />
              <input
                type="text"
                placeholder="URL — YouTube link, .m3u8 stream, or direct MP4 URL"
                value={addUrl}
                onChange={e => setAddUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addToPlaylist()}
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-[#ffaa00] px-4 py-3 text-sm font-mono text-white placeholder:text-zinc-600 outline-none transition"
              />

              {/* TYPE SELECTOR */}
              <div className="flex gap-2">
                {(['youtube', 'stream', 'file'] as PlaylistItem['type'][]).map(t => (
                  <button
                    key={t}
                    onClick={() => setAddType(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase border transition ${addType === t ? 'bg-[#ffaa00] text-black border-[#ffaa00]' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
                  >
                    {typeIcon(t)} {typeLabel(t)}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  onClick={addToPlaylist}
                  disabled={!addUrl.trim()}
                  className="flex items-center gap-2 bg-[#ffaa00] hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black px-5 py-1.5 text-[10px] font-black uppercase transition"
                >
                  <Plus size={12} /> Add
                </button>
              </div>

              {/* QUICK EXAMPLES */}
              <div className="pt-2 border-t border-zinc-800">
                <div className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-2">Examples</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'YouTube Playlist', example: 'https://www.youtube.com/playlist?list=PLxxxxxxxx' },
                    { label: 'YouTube Video', example: 'https://youtu.be/dQw4w9WgXcQ' },
                    { label: 'HLS Stream', example: 'https://your-server.com/live/stream.m3u8' },
                    { label: 'MP4 File', example: 'https://your-server.com/videos/promo.mp4' },
                  ].map(ex => (
                    <button
                      key={ex.label}
                      onClick={() => setAddUrl(ex.example)}
                      className="text-[9px] font-black bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2 py-1 text-zinc-400 hover:text-[#ffaa00] transition"
                    >
                      {ex.label} ↗
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT: PLAYLIST + SETTINGS ───────────────────────────── */}
        <div className="space-y-6">

          {/* PLAYLIST */}
          <div className="bg-zinc-900 border border-zinc-800">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <List size={12} /> Playlist ({config.playlist.length})
              </h2>
            </div>

            {config.playlist.length === 0 ? (
              <div className="px-5 py-10 text-center text-zinc-600 text-[11px] font-black uppercase tracking-widest">
                No items yet — add a video above
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60 max-h-[500px] overflow-y-auto">
                {config.playlist.map(item => {
                  const isActive = item.id === config.nowPlayingId
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-4 py-3 group transition ${isActive ? 'bg-[#ffaa00]/10 border-l-2 border-[#ffaa00]' : 'hover:bg-zinc-800/40 border-l-2 border-transparent'}`}
                    >
                      <div className="flex-shrink-0">{typeIcon(item.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[12px] font-black truncate ${isActive ? 'text-[#ffaa00]' : 'text-white'}`}>{item.title}</div>
                        <div className="text-[9px] text-zinc-600 truncate">{item.url.slice(0, 50)}{item.url.length > 50 ? '…' : ''}</div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                        {isActive ? (
                          <button
                            onClick={stopPlaying}
                            title="Stop"
                            className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 p-1.5 transition"
                          >
                            <Square size={10} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setNowPlaying(item)}
                            title="Set as Live"
                            className="bg-[#ffaa00]/20 hover:bg-[#ffaa00]/40 text-[#ffaa00] p-1.5 transition"
                          >
                            <Play size={10} />
                          </button>
                        )}
                        <button
                          onClick={() => removeFromPlaylist(item.id)}
                          title="Remove"
                          className="bg-zinc-800 hover:bg-rose-900/40 text-zinc-500 hover:text-rose-400 p-1.5 transition"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                      {isActive && (
                        <div className="flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse block" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* SETTINGS */}
          <div className="bg-zinc-900 border border-zinc-800 p-5">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <Settings size={12} /> Playback Settings
            </h2>
            <div className="space-y-3">

              {/* Auto-next */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-black">Auto-advance</div>
                  <div className="text-[10px] text-zinc-500">Automatically play next item in playlist</div>
                </div>
                <button
                  onClick={() => save({ autoNext: !config.autoNext })}
                  className="transition text-[#ffaa00]"
                >
                  {config.autoNext ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-zinc-600" />}
                </button>
              </div>

              {/* Loop */}
              <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                <div>
                  <div className="text-[12px] font-black">Loop playlist</div>
                  <div className="text-[10px] text-zinc-500">Restart from beginning when finished</div>
                </div>
                <button
                  onClick={() => save({ loop: !config.loop })}
                  className="transition text-[#ffaa00]"
                >
                  {config.loop ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-zinc-600" />}
                </button>
              </div>

            </div>
          </div>

          {/* PHASE ROTATION SETTINGS */}
          <div className="bg-zinc-900 border border-zinc-800 p-5">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
              <RefreshCw size={12} /> Phase Rotation
            </h2>

            {/* Enable Rotation */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
              <div>
                <div className="text-[12px] font-black">Enable Rotation</div>
                <div className="text-[10px] text-zinc-500">Cycle: Video → Market → Image</div>
              </div>
              <button
                onClick={() => save({ enableRotation: !config.enableRotation })}
                className="transition text-[#ffaa00]"
              >
                {config.enableRotation ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-zinc-600" />}
              </button>
            </div>

            {config.enableRotation && (
              <div className="space-y-4">
                {/* Video Duration */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-black uppercase text-zinc-400">Video Duration</label>
                    <span className="bg-sky-500 text-black px-2 py-0.5 text-[9px] font-black">{config.videoDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={config.videoDuration}
                    onChange={e => save({ videoDuration: parseInt(e.target.value) })}
                    className="w-full h-2 bg-zinc-800 border border-zinc-700 cursor-pointer accent-sky-500"
                  />
                </div>

                {/* Market Data Duration */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-black uppercase text-zinc-400">Market Data Duration</label>
                    <span className="bg-[#ffaa00] text-black px-2 py-0.5 text-[9px] font-black">{config.marketDataDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="180"
                    step="5"
                    value={config.marketDataDuration}
                    onChange={e => save({ marketDataDuration: parseInt(e.target.value) })}
                    className="w-full h-2 bg-zinc-800 border border-zinc-700 cursor-pointer accent-[#ffaa00]"
                  />
                </div>

                {/* Image Duration */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-black uppercase text-zinc-400">Image Duration</label>
                    <span className="bg-[#ffaa00] text-black px-2 py-0.5 text-[9px] font-black">{config.imageDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={config.imageDuration}
                    onChange={e => save({ imageDuration: parseInt(e.target.value) })}
                    className="w-full h-2 bg-zinc-800 border border-zinc-700 cursor-pointer accent-[#ffaa00]"
                  />
                </div>

                <div className="pt-2 border-t border-zinc-800 text-[9px] text-zinc-500">
                  Total cycle: {config.videoDuration + config.marketDataDuration + config.imageDuration}s
                </div>
              </div>
            )}
          </div>

          {/* IMAGE UPLOAD */}
          {config.enableRotation && (
            <div className="bg-zinc-900 border border-zinc-800 p-5">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                <Image size={12} /> Display Images
              </h2>

              {/* Upload Form */}
              <div className="mb-4 pb-4 border-b border-zinc-800">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Image name (optional)"
                    value={imageName}
                    onChange={e => setImageName(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-[#ffaa00] px-3 py-2 text-[11px] font-mono text-white placeholder:text-zinc-600 outline-none transition"
                  />
                  <label className="flex items-center gap-1.5 bg-[#ffaa00] hover:bg-amber-400 disabled:opacity-40 text-black px-3 py-2 text-[10px] font-black uppercase cursor-pointer transition">
                    <Upload size={12} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadImage}
                      disabled={uploading}
                      className="hidden"
                    />
                    {uploading ? 'Uploading…' : 'Upload'}
                  </label>
                </div>
              </div>

              {/* Images List */}
              {config.images.length === 0 ? (
                <div className="text-center text-zinc-600 text-[10px] font-black uppercase py-4">
                  No images — upload one to display during rotation
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                  {config.images.map(img => (
                    <div key={img.url} className="relative group">
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full aspect-video object-cover border border-zinc-700 rounded"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <button
                          onClick={() => removeImage(img.url)}
                          className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 right-1 bg-black/70 px-2 py-1 text-[8px] font-black text-[#ffaa00] truncate">
                        {img.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STATUS */}
          <div className="bg-zinc-900 border border-zinc-800 p-5">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
              <Radio size={12} /> Status
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 font-bold uppercase">Admin Panel</span>
                <a href="/tv-admin" target="_blank" className="text-[#ffaa00] font-black hover:underline flex items-center gap-1">This page <ExternalLink size={9} /></a>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 font-bold uppercase">Public Display</span>
                <a href="/tv-display" target="_blank" className="text-[#ffaa00] font-black hover:underline flex items-center gap-1">Share This <ExternalLink size={9} /></a>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 font-bold uppercase">TV Terminal</span>
                <a href="/tv" target="_blank" className="text-[#ffaa00] font-black hover:underline flex items-center gap-1">Live <ExternalLink size={9} /></a>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 font-bold uppercase">Now Playing</span>
                <span className={`font-black uppercase ${config.nowPlaying ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {config.nowPlaying ? 'Active' : 'Off'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 font-bold uppercase">Rotation</span>
                <span className={`font-black uppercase ${config.enableRotation ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {config.enableRotation ? 'On' : 'Off'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 font-bold uppercase">Items</span>
                <span className="text-white font-black">{config.playlist.length}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 font-bold uppercase">Images</span>
                <span className="text-white font-black">{config.images.length}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 font-bold uppercase">Config API</span>
                <a href="/api/tv-config" target="_blank" className="text-sky-400 font-black hover:underline flex items-center gap-1">/api/tv-config <ExternalLink size={9} /></a>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SAVE INDICATOR */}
      {(saving || saved) && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 font-black text-[11px] uppercase ${saved ? 'bg-emerald-500 text-black' : 'bg-[#ffaa00] text-black'} transition-all`}>
          {saved ? <><Check size={12} /> Saved</> : <><RefreshCw size={12} className="animate-spin" /> Saving…</>}
        </div>
      )}
    </div>
  )
}
