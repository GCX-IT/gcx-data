'use client'
import { useEffect, useRef, useState, Suspense, useMemo } from 'react'
import { MarketGrid, SidePanel } from '@/components/TerminalComponents'
import type { NewsItem } from '@/components/TerminalComponents'
import { GroupedTicker } from '@/components/TerminalTicker'
import { VideoPlayer } from '@/components/VideoPlayer'
import { MarketDataTable } from '@/components/MarketDataTable'
import { CommodityIndex } from '@/components/CommodityIndex'
import { FolderOpen, HardDrive, KeyRound, Lock, Maximize2, Minimize2, Moon, Sun, Upload } from 'lucide-react'
import { useTheme } from 'next-themes'

const LOCAL_PLAYBACK_SOURCE_KEY = 'gcx_tv_playback_source'
const LOCAL_OFFLINE_FILE_NAMES_KEY = 'gcx_tv_offline_file_names'
const LOCAL_PIN_HASH_KEY = 'gcx_tv_controls_pin_hash'
const LOCAL_UNLOCK_WINDOW_MS = 5 * 60 * 1000
const LOCAL_PIN_MAX_ATTEMPTS = 5
const LOCAL_PIN_COOLDOWN_MS = 30 * 1000

type PlaybackSource = 'online' | 'offline'
type PinDialogMode = 'setup' | 'unlock' | null
type ProtectedAction = 'toggle-source' | 'choose-files' | 'choose-folder' | null

interface Commodity {
  symbol: string;
  commodity: string;
  price: number;
  changePercent: number;
  openingPrice: number;
  highPrice?: number;
  lowPrice?: number;
  lastTradeDate: string;
  history?: { val: number }[];
  deliveryCenter?: string;
  grade?: string;
}

type Phase = 'video' | 'market' | 'image'

interface TVConfigData {
  enableRotation: boolean
  videoDuration: number
  marketDataDuration: number
  imageDuration: number
  images: Array<{ url: string; name: string }>
}

function TVDisplay() {
  const { theme, setTheme } = useTheme()
  const [commodities, setCommodities] = useState<Commodity[]>([])
  const [historyMap, setHistoryMap] = useState<Record<string, { val: number }[]>>({})
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPhase, setCurrentPhase] = useState<Phase>('video')
  const [phaseProgress, setPhaseProgress] = useState(0)
  const [config, setConfig] = useState<TVConfigData>({
    enableRotation: false,
    videoDuration: 60,
    marketDataDuration: 10,
    imageDuration: 120,
    images: [],
  })
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackSource, setPlaybackSource] = useState<PlaybackSource>('online')
  const [offlineFileUrls, setOfflineFileUrls] = useState<string[]>([])
  const [offlineFileNames, setOfflineFileNames] = useState<string[]>([])
  const [offlineNeedsReselect, setOfflineNeedsReselect] = useState(false)
  const [currentOfflineIndex, setCurrentOfflineIndex] = useState(0)
  const [offlinePaused, setOfflinePaused] = useState(false)
  const [pinHash, setPinHash] = useState<string | null>(null)
  const [isControlsUnlocked, setIsControlsUnlocked] = useState(false)
  const [pinDialogMode, setPinDialogMode] = useState<PinDialogMode>(null)
  const [pendingAction, setPendingAction] = useState<ProtectedAction>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinConfirmInput, setPinConfirmInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [failedPinAttempts, setFailedPinAttempts] = useState(0)
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  async function hashPin(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  function applyUnlockWindow() {
    setIsControlsUnlocked(true)
    if (unlockTimeoutRef.current) {
      clearTimeout(unlockTimeoutRef.current)
    }
    unlockTimeoutRef.current = setTimeout(() => {
      setIsControlsUnlocked(false)
    }, LOCAL_UNLOCK_WINDOW_MS)
  }

  function closePinDialog() {
    setPinDialogMode(null)
    setPinInput('')
    setPinConfirmInput('')
    setPinError('')
  }

  function triggerProtectedAction(action: Exclude<ProtectedAction, null>) {
    if (!pinHash) {
      setPendingAction(action)
      setPinDialogMode('setup')
      return
    }
    if (!isControlsUnlocked) {
      setPendingAction(action)
      setPinDialogMode('unlock')
      return
    }

    if (action === 'toggle-source') {
      togglePlaybackSource()
      return
    }
    if (action === 'choose-folder') {
      chooseOfflineFolder()
      return
    }
    chooseOfflineFiles()
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const source = window.localStorage.getItem(LOCAL_PLAYBACK_SOURCE_KEY)
    const savedNames = window.localStorage.getItem(LOCAL_OFFLINE_FILE_NAMES_KEY)
    const storedPinHash = window.localStorage.getItem(LOCAL_PIN_HASH_KEY)
    if (source === 'online' || source === 'offline') {
      setPlaybackSource(source)
    }
    if (storedPinHash) {
      setPinHash(storedPinHash)
    }
    if (savedNames) {
      try {
        const names = JSON.parse(savedNames)
        if (Array.isArray(names)) setOfflineFileNames(names)
      } catch {
        // Ignore invalid local storage payloads.
      }
    }
    if (source === 'offline') {
      setOfflineNeedsReselect(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LOCAL_PLAYBACK_SOURCE_KEY, playbackSource)
  }, [playbackSource])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LOCAL_OFFLINE_FILE_NAMES_KEY, JSON.stringify(offlineFileNames))
  }, [offlineFileNames])

  useEffect(() => {
    return () => {
      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current)
      }
      offlineFileUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [offlineFileUrls])

  useEffect(() => {
    if (!folderInputRef.current) return
    // Enable folder selection in Chromium/WebKit based browsers.
    folderInputRef.current.setAttribute('webkitdirectory', '')
    folderInputRef.current.setAttribute('directory', '')
  }, [])

  // Prices and news are fetched ONCE per page load — no polling. Closing prices
  // and news change rarely (days to weeks apart), so continuous polling is
  // wasted cost. Refresh the TV to pull the latest.
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/prices')
        const result = await response.json()
        if (result.success) {
          setCommodities(result.data)
          if (result.historyMap) setHistoryMap(result.historyMap)
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }

    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news-ticker')
        const result = await res.json()
        if (result.data && Array.isArray(result.data)) setNews(result.data)
      } catch (err) { console.error('News fetch error:', err) }
    }

    fetchPrices()
    fetchNews()
  }, [])

  // Config is fetched ONCE per page load — no polling. It changes very rarely
  // (set-and-forget), so continuous polling is wasted cost. After changing
  // settings in the admin panel, refresh the TV to pick them up. Offline
  // displays ignore remote config entirely, so they don't fetch it at all.
  useEffect(() => {
    if (playbackSource === 'offline') return

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/tv-config')
        if (!res.ok) throw new Error(`API returned ${res.status}`)
        const result = await res.json()
        if (result && typeof result === 'object') {
          setConfig({
            enableRotation: result.enableRotation ?? false,
            videoDuration: result.videoDuration ?? 60,
            marketDataDuration: result.marketDataDuration ?? 10,
            imageDuration: result.imageDuration ?? 120,
            images: Array.isArray(result.images) ? result.images : [],
          })
        }
      } catch (err) {
        console.error('Config fetch error:', err)
        // Keep default config on error
      }
    }

    fetchConfig()
  }, [playbackSource])

  // Phase rotation logic
  useEffect(() => {
    if (!config.enableRotation) return

    const interval = setInterval(() => {
      setPhaseProgress(prev => {
        const next = prev + 1
        
        // Video phase
        if (currentPhase === 'video' && next >= config.videoDuration) {
          setCurrentPhase('market')
          return 0
        }
        
        // Market phase
        if (currentPhase === 'market' && next >= config.marketDataDuration) {
          setCurrentPhase('image')
          return 0
        }
        
        // Image phase
        if (currentPhase === 'image' && next >= config.imageDuration) {
          setCurrentPhase('video')
          setCurrentImageIndex(prev => (prev + 1) % (config.images.length || 1))
          return 0
        }
        
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [config.enableRotation, config.videoDuration, config.marketDataDuration, config.imageDuration, currentPhase, config.images.length])

  function chooseOfflineFiles() {
    fileInputRef.current?.click()
  }

  function chooseOfflineFolder() {
    folderInputRef.current?.click()
  }

  function filterAndSortVideoFiles(files: File[]) {
    const isVideoFile = (file: File) => {
      if (file.type.startsWith('video/')) return true
      const lower = file.name.toLowerCase()
      return ['.mp4', '.mov', '.mkv', '.webm', '.m4v', '.avi'].some(ext => lower.endsWith(ext))
    }

    return files
      .filter(isVideoFile)
      .sort((a, b) => {
        const aPath = a.webkitRelativePath || a.name
        const bPath = b.webkitRelativePath || b.name
        return aPath.localeCompare(bPath)
      })
  }

  function onOfflineFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = filterAndSortVideoFiles(Array.from(e.target.files ?? []))
    offlineFileUrls.forEach(url => URL.revokeObjectURL(url))

    if (files.length === 0) {
      if (playbackSource === 'offline' && offlineFileUrls.length === 0) {
        setOfflineNeedsReselect(true)
      }
      return
    }

    const nextUrls = files.map(file => URL.createObjectURL(file))
    setOfflineFileUrls(nextUrls)
    setOfflineFileNames(files.map(file => file.name))
    setCurrentOfflineIndex(0)
    setOfflinePaused(false)
    setPlaybackSource('offline')
    setOfflineNeedsReselect(false)

    // Allow selecting the same file again.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onOfflineFolderSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = filterAndSortVideoFiles(Array.from(e.target.files ?? []))
    offlineFileUrls.forEach(url => URL.revokeObjectURL(url))

    if (files.length === 0) {
      if (playbackSource === 'offline' && offlineFileUrls.length === 0) {
        setOfflineNeedsReselect(true)
      }
      if (folderInputRef.current) folderInputRef.current.value = ''
      return
    }

    const nextUrls = files.map(file => URL.createObjectURL(file))
    setOfflineFileUrls(nextUrls)
    setOfflineFileNames(files.map(file => file.webkitRelativePath || file.name))
    setCurrentOfflineIndex(0)
    setOfflinePaused(false)
    setPlaybackSource('offline')
    setOfflineNeedsReselect(false)

    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  function togglePlaybackSource() {
    if (playbackSource === 'online') {
      setPlaybackSource('offline')
      if (offlineFileUrls.length === 0) {
        setOfflineNeedsReselect(true)
        chooseOfflineFiles()
      }
      return
    }

    setPlaybackSource('online')
  }

  function playNextOffline() {
    if (offlineFileUrls.length === 0) return
    setCurrentOfflineIndex(prev => (prev + 1) % offlineFileUrls.length)
  }

  function playPrevOffline() {
    if (offlineFileUrls.length === 0) return
    setCurrentOfflineIndex(prev => (prev - 1 + offlineFileUrls.length) % offlineFileUrls.length)
  }

  function toggleOfflinePause() {
    setOfflinePaused(prev => !prev)
  }

  const activeVideoUrl = playbackSource === 'offline'
    ? (offlineFileUrls[currentOfflineIndex] ?? '')
    : undefined
  const showTopMarketStrip = false

  const showOfflineHint = playbackSource === 'offline' && (offlineNeedsReselect || offlineFileUrls.length === 0)

  function renderDisplayControls() {
    const inCooldown = cooldownUntil > Date.now()
    const isDark = theme !== 'light'
    return (
      <div className="fixed top-2 left-2 right-2 sm:left-auto sm:right-4 sm:top-4 z-50 flex items-center justify-end flex-wrap gap-1.5">
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={`px-2 sm:px-2.5 py-2 rounded shadow-lg transition text-[10px] sm:text-[11px] font-black uppercase tracking-wide flex items-center gap-1 ${
            isDark ? 'bg-zinc-900/90 hover:bg-zinc-800 text-yellow-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
          }`}
          title="Toggle theme"
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
        </button>

        <button
          onClick={() => setPinDialogMode(pinHash ? 'unlock' : 'setup')}
          className={`px-2 sm:px-2.5 py-2 rounded shadow-lg transition text-[10px] sm:text-[11px] font-black uppercase tracking-wide flex items-center gap-1 ${
            isControlsUnlocked ? 'bg-emerald-300 hover:bg-emerald-200 text-black' : 'bg-zinc-900/90 hover:bg-zinc-800 text-white'
          }`}
          title={isControlsUnlocked ? 'Controls unlocked' : 'Controls locked'}
        >
          {isControlsUnlocked ? <KeyRound size={14} /> : <Lock size={14} />}
          <span className="hidden sm:inline">{isControlsUnlocked ? 'Unlocked' : 'Locked'}</span>
        </button>

        <button
          onClick={() => triggerProtectedAction('toggle-source')}
          className={`px-2 sm:px-3 py-2 rounded shadow-lg transition text-[10px] sm:text-[11px] font-black uppercase tracking-wide flex items-center gap-1 ${
            playbackSource === 'offline'
              ? 'bg-emerald-400 hover:bg-emerald-300 text-black'
              : 'bg-[#ffaa00] hover:bg-amber-400 text-black'
          }`}
          title={playbackSource === 'offline' ? 'Switch to online playback' : 'Switch to offline playback'}
        >
          <HardDrive size={14} />
          <span className="hidden sm:inline">{playbackSource === 'offline' ? 'Offline' : 'Online'}</span>
        </button>

        {playbackSource === 'offline' && (
          <>
            <button
              onClick={() => triggerProtectedAction('choose-files')}
              className="bg-zinc-900/90 hover:bg-zinc-800 text-white px-2 sm:px-3 py-2 rounded shadow-lg transition text-[10px] sm:text-[11px] font-black uppercase tracking-wide flex items-center gap-1"
              title="Choose local video files"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Choose Files</span>
            </button>
            <button
              onClick={() => triggerProtectedAction('choose-folder')}
              className="bg-zinc-900/90 hover:bg-zinc-800 text-white px-2 sm:px-3 py-2 rounded shadow-lg transition text-[10px] sm:text-[11px] font-black uppercase tracking-wide flex items-center gap-1"
              title="Choose a folder with videos"
            >
              <FolderOpen size={14} />
              <span className="hidden sm:inline">Choose Folder</span>
            </button>
          </>
        )}

        <button
          onClick={toggleFullscreen}
          className="bg-[#ffaa00] hover:bg-amber-400 text-black p-2 rounded shadow-lg transition"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        {inCooldown && (
          <span className="hidden sm:inline bg-rose-900/80 text-rose-100 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide">
            PIN cooldown
          </span>
        )}
      </div>
    )
  }

  function renderOfflineHint() {
    if (!showOfflineHint) return null
    return (
      <div className="fixed top-14 left-2 right-2 sm:left-auto sm:right-4 z-50 w-auto sm:w-[320px] bg-zinc-950/95 border border-zinc-700 text-zinc-100 rounded p-3 text-[11px] shadow-xl">
        <p className="font-black uppercase tracking-wide text-amber-300">Offline Source Needed</p>
        <p className="mt-1 text-zinc-300 leading-relaxed">
          Choose video files or a folder from this machine or USB. This setting affects only this screen.
        </p>
        {offlineFileNames.length > 0 && (
          <p className="mt-2 text-zinc-400">
            Last selected: {offlineFileNames.slice(0, 2).join(', ')}{offlineFileNames.length > 2 ? '...' : ''}
          </p>
        )}
      </div>
    )
  }

  async function submitPinDialog() {
    const inCooldown = cooldownUntil > Date.now()
    if (pinDialogMode === 'unlock' && inCooldown) {
      setPinError('Please wait for cooldown to finish.')
      return
    }

    if (!/^\d{4,6}$/.test(pinInput)) {
      setPinError('PIN must be 4 to 6 digits.')
      return
    }

    if (pinDialogMode === 'setup') {
      if (pinInput !== pinConfirmInput) {
        setPinError('PIN confirmation does not match.')
        return
      }

      const hashed = await hashPin(pinInput)
      setPinHash(hashed)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LOCAL_PIN_HASH_KEY, hashed)
      }
      setFailedPinAttempts(0)
      setCooldownUntil(0)
      applyUnlockWindow()
      const action = pendingAction
      closePinDialog()
      setPendingAction(null)
      if (action) triggerProtectedAction(action)
      return
    }

    if (!pinHash) {
      setPinDialogMode('setup')
      setPinError('No PIN found. Please set one.')
      return
    }

    const hashed = await hashPin(pinInput)
    if (hashed !== pinHash) {
      const nextAttempts = failedPinAttempts + 1
      setFailedPinAttempts(nextAttempts)
      if (nextAttempts >= LOCAL_PIN_MAX_ATTEMPTS) {
        setCooldownUntil(Date.now() + LOCAL_PIN_COOLDOWN_MS)
        setFailedPinAttempts(0)
      }
      setPinError('Invalid PIN.')
      return
    }

    setFailedPinAttempts(0)
    setCooldownUntil(0)
    applyUnlockWindow()
    const action = pendingAction
    closePinDialog()
    setPendingAction(null)
    if (action) triggerProtectedAction(action)
  }

  function renderPinDialog() {
    if (!pinDialogMode) return null
    const inCooldown = cooldownUntil > Date.now()

    return (
      <div className="fixed inset-0 z-[60] bg-black/65 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-zinc-950 border border-zinc-700 rounded-lg p-4 shadow-2xl text-zinc-100">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#ffaa00]">
            {pinDialogMode === 'setup' ? 'Set Controls PIN' : 'Unlock Controls'}
          </h3>
          <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
            {pinDialogMode === 'setup'
              ? 'Create a 4 to 6 digit PIN for this display device.'
              : 'Enter PIN to change playback source or choose local files.'}
          </p>

          <label className="block mt-3 text-[11px] uppercase tracking-wide text-zinc-400">PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="mt-1 w-full bg-zinc-900 border border-zinc-700 focus:border-[#ffaa00] px-3 py-2 text-sm outline-none"
            placeholder="Enter PIN"
          />

          {pinDialogMode === 'setup' && (
            <>
              <label className="block mt-3 text-[11px] uppercase tracking-wide text-zinc-400">Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={pinConfirmInput}
                onChange={(e) => setPinConfirmInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 w-full bg-zinc-900 border border-zinc-700 focus:border-[#ffaa00] px-3 py-2 text-sm outline-none"
                placeholder="Confirm PIN"
              />
            </>
          )}

          {pinError && (
            <p className="mt-3 text-xs text-rose-400">{pinError}</p>
          )}

          {inCooldown && (
            <p className="mt-2 text-xs text-amber-300">Too many attempts. Please wait and try again.</p>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                closePinDialog()
                setPendingAction(null)
              }}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded text-xs font-black uppercase tracking-wide"
            >
              Cancel
            </button>
            <button
              onClick={() => { void submitPinDialog() }}
              disabled={pinDialogMode === 'unlock' && inCooldown}
              className="px-3 py-2 bg-[#ffaa00] hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-black rounded text-xs font-black uppercase tracking-wide"
            >
              {pinDialogMode === 'setup' ? 'Set PIN' : 'Unlock'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const mainSix = useMemo(() => {
    const keywords = [
      { key: 'YELLOW MAIZE', label: 'Yellow Maize', symbol: 'YM', color: '#ffaa00' },
      { key: 'WHITE MAIZE', label: 'White Maize', symbol: 'WM', color: '#ffffff' },
      { key: 'SOYA BEAN', label: 'Soybean', symbol: 'SB', color: '#38bdf8' },
      { key: 'RICE', label: 'Rice', symbol: 'MR', color: '#4ade80' },
      { key: 'SESAME', label: 'Sesame', symbol: 'SS', color: '#f472b6' },
      { key: 'SORGHUM', label: 'Sorghum', symbol: 'SR', color: '#fbbf24' }
    ]
    return keywords.map(kw => {
      const matches = commodities.filter(c => c.commodity.toUpperCase().includes(kw.key))
      const count = matches.length
      const avgPrice = count > 0 ? matches.reduce((s, c) => s + c.price, 0) / count : 0
      const avgChange = count > 0 ? matches.reduce((s, c) => s + c.changePercent, 0) / count : 0

      const latestDate = matches
        .map(c => c.lastTradeDate)
        .filter(Boolean)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || ''

      const allHistoryPoints: { val: number; date: string }[] = []
      matches.forEach(c => {
        const hist = historyMap[c.symbol]
        if (hist && hist.length > 0) {
          hist.forEach((h: any, i: number) => {
            const val = typeof h === 'number' ? h : (h.val ?? h.value ?? 0)
            allHistoryPoints.push({ val, date: String(i) })
          })
        }
      })

      const history = allHistoryPoints.length >= 3
        ? allHistoryPoints.slice(-20).map(h => ({ val: h.val }))
        : Array.from({ length: 12 }).map((_, i) => {
            const progress = i / 11
            const variance = avgPrice * 0.02 * Math.sin(progress * Math.PI)
            const noise = (Math.random() - 0.5) * (avgPrice * 0.01)
            return { val: parseFloat((avgPrice > 0 ? avgPrice * (0.99 + (avgChange / 200)) + variance + noise : 4000 + Math.random() * 500).toFixed(2)) }
          })

      return { ...kw, label: `${kw.label} (${count})`, price: avgPrice, change: avgChange, history, lastTradeDate: latestDate }
    })
  }, [commodities, historyMap])

  const enrichedCommodities = useMemo(() =>
    commodities.map(c => ({
      ...c,
      history: historyMap[c.symbol],
    }))
  , [commodities, historyMap])

  if (loading) return (
    <div className="h-screen w-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#ffaa00] border-t-transparent animate-spin rounded-full" />
    </div>
  )

  // If rotation disabled, show normal layout
  if (!config.enableRotation) {
    return (
      <div className="fixed inset-0 bg-background text-foreground flex flex-col font-mono overflow-y-auto md:overflow-hidden select-none selection:bg-none pt-14 sm:pt-0">
        {/* NO HEADER / NAVBAR - FULL SCREEN DISPLAY */}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={onOfflineFilesSelected}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          onChange={onOfflineFolderSelected}
          className="hidden"
        />

        {!isFullscreen && renderDisplayControls()}
        {!isFullscreen && renderOfflineHint()}
        {!isFullscreen && renderPinDialog()}
        
        {/* Optional top market strip */}
        {showTopMarketStrip && (
          <div className="order-2 md:order-none h-[17vh] sm:h-[20vh] lg:h-[22vh] overflow-hidden">
            <MarketGrid items={mainSix} />
          </div>
        )}

        {/* Main content area: video + news sidebar */}
        <div className="order-1 md:order-none flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          <main className="flex-1 md:flex-[5] flex flex-col bg-background overflow-hidden min-h-[40vh] sm:min-h-[46vh] md:min-h-0">
            <VideoPlayer
              height="100%"
              url={activeVideoUrl}
              localOnly={playbackSource === 'offline'}
              paused={playbackSource === 'offline' ? offlinePaused : undefined}
              onTogglePause={playbackSource === 'offline' ? toggleOfflinePause : undefined}
              onPrev={playbackSource === 'offline' ? playPrevOffline : undefined}
              onNext={playbackSource === 'offline' ? playNextOffline : undefined}
              onEnded={playNextOffline}
              onError={playNextOffline}
            />
          </main>

          <div className="block md:block md:flex-[1.5] md:min-w-[400px] min-w-0 max-h-[30vh] sm:max-h-[32vh] md:max-h-none overflow-hidden">
            <SidePanel news={news} />
          </div>
        </div>

        {/* Bottom ticker */}
        <div className="order-3 md:order-none h-24 overflow-hidden">
          <GroupedTicker commodities={enrichedCommodities} />
        </div>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 2px; }
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
          body { font-family: 'JetBrains+Mono', monospace; }
        `}</style>
      </div>
    )
  }

  // If rotation enabled, cycle through phases
  if (currentPhase === 'market') {
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col font-mono overflow-y-auto md:overflow-hidden select-none pt-14 sm:pt-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={onOfflineFilesSelected}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          onChange={onOfflineFolderSelected}
          className="hidden"
        />
        {!isFullscreen && renderDisplayControls()}
        {!isFullscreen && renderOfflineHint()}
        {!isFullscreen && renderPinDialog()}
        <MarketDataTable
          commodities={commodities}
          phaseProgress={phaseProgress}
          phaseDuration={config.marketDataDuration}
        />
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
          body { font-family: 'JetBrains+Mono', monospace; }
        `}</style>
      </div>
    )
  }

  if (currentPhase === 'image') {
    const currentImage = config.images[currentImageIndex]
    return (
      <div className="fixed inset-0 bg-background text-foreground flex flex-col font-mono overflow-y-auto md:overflow-hidden select-none selection:bg-none pt-14 sm:pt-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={onOfflineFilesSelected}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          onChange={onOfflineFolderSelected}
          className="hidden"
        />
        {!isFullscreen && renderDisplayControls()}
        {!isFullscreen && renderOfflineHint()}
        {!isFullscreen && renderPinDialog()}
        {showTopMarketStrip && (
          <div className="order-2 md:order-none h-[17vh] sm:h-[20vh] lg:h-[22vh] overflow-hidden">
            <MarketGrid items={mainSix} />
          </div>
        )}
        <div className="order-1 md:order-none flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          <main className="flex-1 md:flex-[5] flex flex-col bg-background overflow-hidden min-h-[40vh] sm:min-h-[46vh] md:min-h-0">
            {currentImage ? (
              <img
                key={currentImage.url}
                src={currentImage.url}
                alt={currentImage.name}
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <CommodityIndex commodities={commodities} />
            )}
          </main>
          <div className="block md:block md:flex-[1.5] md:min-w-[400px] min-w-0 max-h-[30vh] sm:max-h-[32vh] md:max-h-none overflow-hidden">
            <SidePanel news={news} />
          </div>
        </div>
        <div className="order-3 md:order-none h-24 overflow-hidden">
          <GroupedTicker commodities={enrichedCommodities} />
        </div>
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 2px; }
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
          body { font-family: 'JetBrains+Mono', monospace; }
        `}</style>
      </div>
    )
  }

  // Default: video phase
  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col font-mono overflow-y-auto md:overflow-hidden select-none selection:bg-none pt-14 sm:pt-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={onOfflineFilesSelected}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        onChange={onOfflineFolderSelected}
        className="hidden"
      />
      {!isFullscreen && renderDisplayControls()}
      {!isFullscreen && renderOfflineHint()}
      {!isFullscreen && renderPinDialog()}
      {showTopMarketStrip && (
        <div className="order-2 md:order-none h-[17vh] sm:h-[20vh] lg:h-[22vh] overflow-hidden">
          <MarketGrid items={mainSix} />
        </div>
      )}
      <div className="order-1 md:order-none flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        <main className="flex-1 md:flex-[5] flex flex-col bg-background overflow-hidden min-h-[40vh] sm:min-h-[46vh] md:min-h-0">
          <VideoPlayer
            height="100%"
            url={activeVideoUrl}
            localOnly={playbackSource === 'offline'}
            paused={playbackSource === 'offline' ? offlinePaused : undefined}
            onTogglePause={playbackSource === 'offline' ? toggleOfflinePause : undefined}
            onPrev={playbackSource === 'offline' ? playPrevOffline : undefined}
            onNext={playbackSource === 'offline' ? playNextOffline : undefined}
            onEnded={playNextOffline}
            onError={playNextOffline}
          />
        </main>
        <div className="block md:block md:flex-[1.5] md:min-w-[400px] min-w-0 max-h-[30vh] sm:max-h-[32vh] md:max-h-none overflow-hidden">
          <SidePanel news={news} />
        </div>
      </div>
      <div className="order-3 md:order-none h-24 overflow-hidden">
        <GroupedTicker commodities={enrichedCommodities} />
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 2px; }
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
        body { font-family: 'JetBrains+Mono', monospace; }
      `}</style>
    </div>
  )
}

export default function PublicTVDisplay() {
  return <Suspense fallback={null}><TVDisplay /></Suspense>
}
