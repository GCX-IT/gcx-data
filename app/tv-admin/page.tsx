'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Play, Square, Trash2, Plus, Radio, Settings,
  Youtube, Film, Wifi, RefreshCw, ToggleLeft, ToggleRight,
  List, ExternalLink, Check, Image, Upload, LogOut, Clock,
  Video, Layers, ChevronUp, ChevronDown,
} from 'lucide-react'
import type { TVConfig, PlaylistItem, ImageItem } from '@/app/api/tv-config/route'
import { VideoPlayer } from '@/components/VideoPlayer'

const TOKEN_KEY = 'gcx_auth_token'

function getToken() {
  return typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null
}
function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  const t = getToken()
  return { ...extra, ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}
function clearAuthToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`
}

// ─── type helpers ─────────────────────────────────────────────────────────────
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

// ─── duration helpers ──────────────────────────────────────────────────────────
function secToDisplay(sec: number): { value: number; unit: 'sec' | 'min' | 'hr' } {
  if (sec >= 3600 && sec % 3600 === 0) return { value: sec / 3600, unit: 'hr' }
  if (sec >= 60 && sec % 60 === 0) return { value: sec / 60, unit: 'min' }
  return { value: sec, unit: 'sec' }
}
function toSec(value: number, unit: 'sec' | 'min' | 'hr'): number {
  if (unit === 'min') return value * 60
  if (unit === 'hr') return value * 3600
  return value
}

// ─── DurationInput ─────────────────────────────────────────────────────────────
function DurationInput({ seconds, onChange }: { seconds: number; onChange: (s: number) => void }) {
  const d = secToDisplay(seconds)
  const [val, setVal] = useState(String(d.value))
  const [unit, setUnit] = useState<'sec' | 'min' | 'hr'>(d.unit)

  useEffect(() => {
    const d2 = secToDisplay(seconds)
    setVal(String(d2.value))
    setUnit(d2.unit)
  }, [seconds])

  function commit() {
    const n = parseInt(val, 10)
    if (!isNaN(n) && n > 0) onChange(toSec(n, unit))
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        className="w-24 bg-zinc-800 border border-zinc-700 focus:border-[#ffaa00] px-2 py-1 text-[12px] font-mono text-white outline-none transition"
      />
      <select
        value={unit}
        onChange={e => {
          const u = e.target.value as 'sec' | 'min' | 'hr'
          setUnit(u)
          const n = parseInt(val, 10)
          if (!isNaN(n) && n > 0) onChange(toSec(n, u))
        }}
        className="bg-zinc-800 border border-zinc-700 focus:border-[#ffaa00] px-2 py-1 text-[11px] font-black uppercase text-zinc-300 outline-none transition"
      >
        <option value="sec">Sec</option>
        <option value="min">Min</option>
        <option value="hr">Hr</option>
      </select>
    </div>
  )
}

// ─── main page ─────────────────────────────────────────────────────────────────
type Tab = 'control' | 'playlist' | 'media' | 'settings'

export default function TVAdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('control')
  const [config, setConfig] = useState<TVConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // playlist add
  const [addTitle, setAddTitle] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addType, setAddType] = useState<PlaylistItem['type']>('youtube')

  // image upload
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageName, setImageName] = useState('')
  const imageRef = useRef<HTMLInputElement>(null)

  // video upload
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoName, setVideoName] = useState('')
  const [videoProgress, setVideoProgress] = useState('')
  const videoRef = useRef<HTMLInputElement>(null)

  // ── auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = window.localStorage.getItem(TOKEN_KEY)
    if (!token) { router.replace('/login'); return }
    setCheckingAuth(false)
  }, [router])

  function logout() { clearAuthToken(); router.replace('/login') }

  // ── config fetch / save ─────────────────────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    const res = await fetch('/api/tv-config', { headers: authHeaders() })
    const data = await res.json()
    setConfig(data)
  }, [])

  useEffect(() => { if (!checkingAuth) fetchConfig() }, [fetchConfig, checkingAuth])
  useEffect(() => { if (addUrl) setAddType(detectType(addUrl)) }, [addUrl])

  async function save(patch: Partial<TVConfig>) {
    setSaving(true)
    const res = await fetch('/api/tv-config', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    setConfig(data)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  // ── playlist actions ────────────────────────────────────────────────────────
  function setNowPlaying(item: PlaylistItem | null) {
    save({ nowPlaying: item?.url ?? null, nowPlayingId: item?.id ?? null })
  }
  function stopPlaying() { save({ nowPlaying: null, nowPlayingId: null }) }

  function addToPlaylist() {
    if (!addUrl.trim() || !config) return
    const item: PlaylistItem = {
      id: Date.now().toString(),
      title: addTitle.trim() || addUrl,
      url: addUrl.trim(),
      type: addType,
      addedAt: new Date().toISOString(),
    }
    save({ playlist: [...config.playlist, item] })
    setAddTitle(''); setAddUrl('')
  }

  function removeFromPlaylist(id: string) {
    if (!config) return
    const updated = config.playlist.filter(i => i.id !== id)
    const patch: Partial<TVConfig> = { playlist: updated }
    if (config.nowPlayingId === id) { patch.nowPlaying = null; patch.nowPlayingId = null }
    save(patch)
  }

  function movePlaylistItem(id: string, dir: 'up' | 'down') {
    if (!config) return
    const idx = config.playlist.findIndex(i => i.id === id)
    if (idx < 0) return
    const arr = [...config.playlist]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    save({ playlist: arr })
  }

  // ── image upload ────────────────────────────────────────────────────────────
  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !config) return
    setUploadingImage(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', imageName.trim() || file.name)
    try {
      const res = await fetch('/api/tv-upload-image', { method: 'POST', headers: authHeaders(), body: fd })
      const result = await res.json()
      if (result.success) {
        const img: ImageItem = { url: result.url, name: result.name, id: Date.now().toString(), addedAt: new Date().toISOString() }
        await save({ images: [...config.images, img] })
        setImageName('')
        if (imageRef.current) imageRef.current.value = ''
      } else {
        alert('Image upload failed: ' + (result.error ?? 'Unknown error'))
      }
    } catch (err) { console.error('Image upload error:', err) }
    finally { setUploadingImage(false) }
  }

  // ── video upload ─────────────────────────────────────────────────────────────
  async function uploadVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !config) return
    setUploadingVideo(true)
    setVideoProgress('Uploading…')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', videoName.trim() || file.name)
    try {
      const res = await fetch('/api/tv-upload-video', { method: 'POST', headers: authHeaders(), body: fd })
      const result = await res.json()
      if (result.success) {
        setVideoProgress('Uploaded! Adding to playlist…')
        const item: PlaylistItem = {
          id: Date.now().toString(),
          title: result.name ?? file.name,
          url: result.url,
          type: 'file',
          addedAt: new Date().toISOString(),
        }
        await save({ playlist: [...config.playlist, item] })
        setVideoName('')
        setVideoProgress('')
        if (videoRef.current) videoRef.current.value = ''
        setTab('playlist')
      } else {
        setVideoProgress('Upload failed: ' + (result.error ?? 'Unknown error'))
      }
    } catch (err) {
      console.error('Video upload error:', err)
      setVideoProgress('Upload failed')
    } finally { setUploadingVideo(false) }
  }

  function removeImage(id: string) {
    if (!config) return
    save({ images: config.images.filter(i => i.id !== id) })
  }

  // ── render guards ──────────────────────────────────────────────────────────
  if (checkingAuth || !config) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-[#ffaa00]">
      <div className="w-10 h-10 border-2 border-[#ffaa00] border-t-transparent animate-spin rounded-full" />
    </div>
  )

  const nowPlayingItem = config.playlist.find(i => i.id === config.nowPlayingId) ?? null

  // ── tab classes ────────────────────────────────────────────────────────────
  const tc = (t: Tab) => `flex items-center gap-1.5 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest border-b-2 transition ${
    tab === t
      ? 'border-[#ffaa00] text-[#ffaa00]'
      : 'border-transparent text-zinc-500 hover:text-zinc-300'
  }`

  // ── TSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-mono">

      {/* HEADER */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <span className="bg-[#ffaa00] text-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">ADMIN</span>
              <h1 className="text-xl font-black tracking-tighter uppercase">GCX TV Control</h1>
              {config.nowPlaying
                ? <span className="flex items-center gap-1 text-rose-400 text-[10px] font-black uppercase"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />On Air</span>
                : <span className="text-[10px] text-zinc-600 font-black uppercase">Off Air</span>}
            </div>
            <p className="text-[10px] text-zinc-500">Playlist · Media · Settings · Playout</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/tv-display" target="_blank" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 px-4 py-2 text-[11px] font-black uppercase transition">
              <ExternalLink size={11} /> Public Display
            </a>
            <a href="/tv" target="_blank" className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 text-[11px] font-black uppercase transition">
              <ExternalLink size={11} /> TV Terminal
            </a>
            <button onClick={fetchConfig} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 p-2 transition">
              <RefreshCw size={13} />
            </button>
            <button onClick={logout} className="flex items-center gap-1.5 bg-zinc-800 hover:bg-rose-900/40 border border-zinc-700 hover:border-rose-700 text-zinc-400 hover:text-rose-400 px-3 py-2 text-[11px] font-black uppercase transition">
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="max-w-7xl mx-auto mt-4 flex border-b border-zinc-800">
          <button className={tc('control')} onClick={() => setTab('control')}><Radio size={12} /> Now Playing</button>
          <button className={tc('playlist')} onClick={() => setTab('playlist')}><List size={12} /> Playlist ({config.playlist.length})</button>
          <button className={tc('media')} onClick={() => setTab('media')}><Layers size={12} /> Media Library ({config.images.length} img)</button>
          <button className={tc('settings')} onClick={() => setTab('settings')}><Settings size={12} /> Settings</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">

        {/* ════════════════════ TAB: CONTROL ════════════════════ */}
        {tab === 'control' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT: PREVIEW */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black uppercase text-zinc-400">Live Preview</span>
                  {config.nowPlaying && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={stopPlaying}
                        className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1 text-[10px] font-black uppercase transition"
                      >
                        <Square size={10} /> Stop Broadcast
                      </button>
                    </div>
                  )}
                </div>
                <div className="w-full bg-black relative overflow-hidden border border-zinc-800">
                  {config.nowPlaying ? (
                    <VideoPlayer url={config.nowPlaying ?? undefined} height={320} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-700">
                      <Radio size={32} />
                      <span className="text-[11px] font-black uppercase tracking-widest">Nothing Playing</span>
                      <span className="text-[10px] text-zinc-600">Go to Playlist → Set Live on an item</span>
                    </div>
                  )}
                </div>

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
            </div>

            {/* RIGHT: QUICK ACTIONS */}
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 p-5">
                <h2 className="text-[11px] font-black uppercase text-zinc-400 mb-4 flex items-center gap-2"><Radio size={12} /> Status</h2>
                <div className="space-y-2 text-[11px]">
                  {[
                    { label: 'Now Playing', value: config.nowPlaying ? 'Active' : 'Off', ok: !!config.nowPlaying },
                    { label: 'Rotation', value: config.enableRotation ? 'On' : 'Off', ok: config.enableRotation },
                    { label: 'Auto-advance', value: config.autoNext ? 'On' : 'Off', ok: config.autoNext },
                    { label: 'Loop', value: config.loop ? 'On' : 'Off', ok: config.loop },
                    { label: 'Playlist items', value: String(config.playlist.length), ok: config.playlist.length > 0 },
                    { label: 'Images', value: String(config.images.length), ok: config.images.length > 0 },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between">
                      <span className="text-zinc-500 uppercase font-bold">{r.label}</span>
                      <span className={`font-black uppercase ${r.ok ? 'text-emerald-400' : 'text-zinc-600'}`}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-5">
                <h2 className="text-[11px] font-black uppercase text-zinc-400 mb-3 flex items-center gap-2"><Clock size={12} /> Cycle Preview</h2>
                {config.enableRotation ? (
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between"><span className="text-zinc-500">Video</span><span>{secToDisplay(config.videoDuration).value} {secToDisplay(config.videoDuration).unit}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Market</span><span>{secToDisplay(config.marketDataDuration).value} {secToDisplay(config.marketDataDuration).unit}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Images</span><span>{secToDisplay(config.imageDuration).value} {secToDisplay(config.imageDuration).unit}</span></div>
                    <div className="flex justify-between border-t border-zinc-800 pt-2 mt-2"><span className="text-zinc-400 font-black">Total</span><span className="text-[#ffaa00] font-black">{secToDisplay(config.videoDuration + config.marketDataDuration + config.imageDuration).value} {secToDisplay(config.videoDuration + config.marketDataDuration + config.imageDuration).unit}</span></div>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-600">Rotation is off. Enable it in Settings.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════ TAB: PLAYLIST ════════════════════ */}
        {tab === 'playlist' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ADD FORM */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <h2 className="text-[11px] font-black uppercase text-zinc-400 mb-4 flex items-center gap-2"><Plus size={12} /> Add URL to Playlist</h2>
                <div className="space-y-3">
                  <input type="text" placeholder="Title (optional)" value={addTitle} onChange={e => setAddTitle(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-[#ffaa00] px-4 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 outline-none transition" />
                  <input type="text" placeholder="URL — YouTube, .m3u8 stream, or direct MP4/WEBM"
                    value={addUrl} onChange={e => setAddUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addToPlaylist()}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-[#ffaa00] px-4 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 outline-none transition" />
                  <div className="flex gap-2 flex-wrap">
                    {(['youtube', 'stream', 'file'] as PlaylistItem['type'][]).map(t => (
                      <button key={t} onClick={() => setAddType(t)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase border transition ${addType === t ? 'bg-[#ffaa00] text-black border-[#ffaa00]' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}>
                        {typeIcon(t)} {typeLabel(t)}
                      </button>
                    ))}
                    <div className="flex-1" />
                    <button onClick={addToPlaylist} disabled={!addUrl.trim()}
                      className="flex items-center gap-2 bg-[#ffaa00] hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black px-5 py-1.5 text-[10px] font-black uppercase transition">
                      <Plus size={12} /> Add to Playlist
                    </button>
                  </div>
                  <div className="pt-1 border-t border-zinc-800">
                    <div className="text-[9px] text-zinc-600 font-black uppercase mb-2">Quick Examples</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'YouTube Playlist', ex: 'https://www.youtube.com/playlist?list=PLxxxxxxxx' },
                        { label: 'YouTube Video', ex: 'https://youtu.be/dQw4w9WgXcQ' },
                        { label: 'HLS Stream', ex: 'https://your-server.com/live/stream.m3u8' },
                        { label: 'Hosted MP4', ex: 'https://your-server.com/gcx-tv/videos/promo.mp4' },
                      ].map(ex => (
                        <button key={ex.label} onClick={() => setAddUrl(ex.ex)}
                          className="text-[9px] font-black bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2 py-1 text-zinc-400 hover:text-[#ffaa00] transition">
                          {ex.label} ↗
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* VIDEO FILE UPLOAD */}
              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <h2 className="text-[11px] font-black uppercase text-zinc-400 mb-4 flex items-center gap-2"><Video size={12} /> Upload Video File</h2>
                <p className="text-[10px] text-zinc-500 mb-3">Upload an MP4/WEBM file. It will be stored in the cloud and automatically added to your playlist.</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="Video title (optional)" value={videoName} onChange={e => setVideoName(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-[#ffaa00] px-3 py-2 text-[11px] font-mono text-white placeholder:text-zinc-600 outline-none transition" />
                  <label className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase cursor-pointer transition ${uploadingVideo ? 'bg-zinc-700 text-zinc-400' : 'bg-[#ffaa00] hover:bg-amber-400 text-black'}`}>
                    <Upload size={12} />
                    <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/*" onChange={uploadVideo} disabled={uploadingVideo} className="hidden" />
                    {uploadingVideo ? 'Uploading…' : 'Upload Video'}
                  </label>
                </div>
                {videoProgress && <p className="mt-2 text-[10px] text-[#ffaa00]">{videoProgress}</p>}
              </div>
            </div>

            {/* PLAYLIST LIST */}
            <div className="bg-zinc-900 border border-zinc-800">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-[11px] font-black uppercase text-zinc-400 flex items-center gap-2"><List size={12} /> Playlist ({config.playlist.length})</h2>
              </div>
              {config.playlist.length === 0 ? (
                <div className="px-5 py-12 text-center text-zinc-600 text-[10px] font-black uppercase">No items — add above</div>
              ) : (
                <div className="divide-y divide-zinc-800/60 max-h-[600px] overflow-y-auto">
                  {config.playlist.map((item, idx) => {
                    const isActive = item.id === config.nowPlayingId
                    return (
                      <div key={item.id} className={`flex items-center gap-2 px-3 py-3 group transition ${isActive ? 'bg-[#ffaa00]/10 border-l-2 border-[#ffaa00]' : 'hover:bg-zinc-800/40 border-l-2 border-transparent'}`}>
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button onClick={() => movePlaylistItem(item.id, 'up')} disabled={idx === 0} className="text-zinc-700 hover:text-zinc-400 disabled:opacity-20"><ChevronUp size={10} /></button>
                          <button onClick={() => movePlaylistItem(item.id, 'down')} disabled={idx === config.playlist.length - 1} className="text-zinc-700 hover:text-zinc-400 disabled:opacity-20"><ChevronDown size={10} /></button>
                        </div>
                        <div className="flex-shrink-0">{typeIcon(item.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[12px] font-black truncate ${isActive ? 'text-[#ffaa00]' : ''}`}>{item.title}</div>
                          <div className="text-[9px] text-zinc-600 truncate">{item.url.slice(0, 45)}{item.url.length > 45 ? '…' : ''}</div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                          {isActive ? (
                            <button onClick={stopPlaying} title="Stop" className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 p-1.5"><Square size={10} /></button>
                          ) : (
                            <button onClick={() => setNowPlaying(item)} title="Set Live" className="bg-[#ffaa00]/20 hover:bg-[#ffaa00]/40 text-[#ffaa00] p-1.5"><Play size={10} /></button>
                          )}
                          <button onClick={() => removeFromPlaylist(item.id)} className="bg-zinc-800 hover:bg-rose-900/40 text-zinc-500 hover:text-rose-400 p-1.5"><Trash2 size={10} /></button>
                        </div>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse block flex-shrink-0" />}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════ TAB: MEDIA ════════════════════ */}
        {tab === 'media' && (
          <div className="space-y-8">

            {/* IMAGE UPLOAD + LIBRARY */}
            <div className="bg-zinc-900 border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-black uppercase text-zinc-400 flex items-center gap-2"><Image size={12} /> Display Images ({config.images.length})</h2>
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Image name (optional)" value={imageName} onChange={e => setImageName(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 focus:border-[#ffaa00] px-3 py-1.5 text-[11px] font-mono text-white placeholder:text-zinc-600 outline-none transition w-52" />
                  <label className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-black uppercase cursor-pointer transition ${uploadingImage ? 'bg-zinc-700 text-zinc-400' : 'bg-[#ffaa00] hover:bg-amber-400 text-black'}`}>
                    <Upload size={11} />
                    <input ref={imageRef} type="file" accept="image/*" onChange={uploadImage} disabled={uploadingImage} className="hidden" />
                    {uploadingImage ? 'Uploading…' : 'Upload Image'}
                  </label>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 mb-4">Images are stored in the cloud and displayed during the rotation phase — shown full-screen in sequence.</p>

              {config.images.length === 0 ? (
                <div className="border-2 border-dashed border-zinc-800 rounded p-12 text-center text-zinc-600 text-[11px] font-black uppercase">
                  No images yet — upload one above
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {config.images.map(img => (
                    <div key={img.id} className="relative group bg-zinc-800 border border-zinc-700 rounded overflow-hidden">
                      <img src={img.url} alt={img.name} className="w-full aspect-video object-cover" />
                      <div className="p-2 border-t border-zinc-700">
                        <div className="text-[10px] font-black text-[#ffaa00] truncate">{img.name}</div>
                        <div className="text-[9px] text-zinc-600">{new Date(img.addedAt).toLocaleDateString()}</div>
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <button onClick={() => removeImage(img.id)} className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* VIDEO LIBRARY (playlist items of type 'file') */}
            <div className="bg-zinc-900 border border-zinc-800 p-6">
              <h2 className="text-[11px] font-black uppercase text-zinc-400 mb-4 flex items-center gap-2"><Video size={12} /> Uploaded Videos (cloud files in playlist)</h2>
              {config.playlist.filter(i => i.type === 'file').length === 0 ? (
                <p className="text-[10px] text-zinc-600">No uploaded videos yet. Go to <button onClick={() => setTab('playlist')} className="text-[#ffaa00] underline">Playlist</button> to upload an MP4.</p>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {config.playlist.filter(i => i.type === 'file').map(item => (
                    <div key={item.id} className="flex items-center gap-4 py-3">
                      <Film size={16} className="text-sky-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-black truncate">{item.title}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{item.url}</div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => { setNowPlaying(item); setTab('control') }}
                          className="flex items-center gap-1 bg-[#ffaa00]/20 hover:bg-[#ffaa00]/40 text-[#ffaa00] px-3 py-1 text-[10px] font-black uppercase">
                          <Play size={10} /> Set Live
                        </button>
                        <button onClick={() => removeFromPlaylist(item.id)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2 py-1">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════ TAB: SETTINGS ════════════════════ */}
        {tab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* PLAYBACK */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-4">
              <h2 className="text-[11px] font-black uppercase text-zinc-400 mb-2 flex items-center gap-2"><Settings size={12} /> Playback</h2>
              {[
                { label: 'Auto-advance', sub: 'Play next item automatically when one ends', key: 'autoNext' as keyof TVConfig },
                { label: 'Loop playlist', sub: 'Restart from beginning when last item ends', key: 'loop' as keyof TVConfig },
              ].map(r => (
                <div key={r.key} className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-black">{r.label}</div>
                    <div className="text-[10px] text-zinc-500">{r.sub}</div>
                  </div>
                  <button onClick={() => save({ [r.key]: !config[r.key] })} className="text-[#ffaa00] transition">
                    {config[r.key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-zinc-600" />}
                  </button>
                </div>
              ))}
            </div>

            {/* ROTATION */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-black flex items-center gap-2"><RefreshCw size={12} /> Phase Rotation</div>
                  <div className="text-[10px] text-zinc-500">Cycle: Video → Market Data → Images</div>
                </div>
                <button onClick={() => save({ enableRotation: !config.enableRotation })} className="text-[#ffaa00] transition">
                  {config.enableRotation ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-zinc-600" />}
                </button>
              </div>

              {config.enableRotation && (
                <div className="space-y-5 pt-2 border-t border-zinc-800">
                  {[
                    { label: 'Video phase duration', key: 'videoDuration', color: 'text-sky-400' },
                    { label: 'Market data phase duration', key: 'marketDataDuration', color: 'text-[#ffaa00]' },
                    { label: 'Images phase duration', key: 'imageDuration', color: 'text-emerald-400' },
                  ].map(r => (
                    <div key={r.key}>
                      <div className="flex items-center justify-between mb-2">
                        <label className={`text-[11px] font-black uppercase ${r.color}`}>{r.label}</label>
                        <span className="text-[10px] text-zinc-500">{(config as any)[r.key]}s total</span>
                      </div>
                      <DurationInput
                        seconds={(config as any)[r.key]}
                        onChange={s => save({ [r.key]: s })}
                      />
                    </div>
                  ))}

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-zinc-400">Total cycle</span>
                    <span className="text-[#ffaa00] font-black">
                      {(() => { const t = config.videoDuration + config.marketDataDuration + config.imageDuration; const d = secToDisplay(t); return `${d.value} ${d.unit}` })()}
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* SAVE TOAST */}
      {(saving || saved) && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 font-black text-[11px] uppercase shadow-xl ${saved ? 'bg-emerald-500 text-black' : 'bg-[#ffaa00] text-black'}`}>
          {saved ? <><Check size={12} /> Saved</> : <><RefreshCw size={12} className="animate-spin" /> Saving…</>}
        </div>
      )}
    </div>
  )
}
