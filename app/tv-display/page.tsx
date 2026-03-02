'use client'
import { useEffect, useState, Suspense, useMemo } from 'react'
import { MarketGrid, SidePanel } from '@/components/TerminalComponents'
import type { NewsItem } from '@/components/TerminalComponents'
import { GroupedTicker } from '@/components/TerminalTicker'
import { VideoPlayer } from '@/components/VideoPlayer'
import { MarketDataTable } from '@/components/MarketDataTable'
import { Maximize2, Minimize2 } from 'lucide-react'

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

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/tv-config')
        const result = await res.json()
        setConfig({
          enableRotation: result.enableRotation ?? false,
          videoDuration: result.videoDuration ?? 60,
          marketDataDuration: result.marketDataDuration ?? 10,
          imageDuration: result.imageDuration ?? 120,
          images: result.images ?? [],
        })
      } catch (err) { console.error('Config fetch error:', err) }
    }

    fetchPrices()
    fetchNews()
    fetchConfig()

    const priceInterval = setInterval(fetchPrices, 30000)
    const newsInterval = setInterval(fetchNews, 120000)
    const configInterval = setInterval(fetchConfig, 10000) // fetch config every 10s for admin changes
    return () => { 
      clearInterval(priceInterval)
      clearInterval(newsInterval)
      clearInterval(configInterval)
    }
  }, [])

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
    <div className="h-screen w-screen bg-background flex flex-col items-center justify-center text-[#ffaa00] font-mono">
      <div className="w-12 h-12 border-2 border-[#ffaa00] border-t-transparent animate-spin rounded-full mb-6" />
      <div className="tracking-[0.5em] text-[10px] uppercase font-black">Decrypting Data Stream...</div>
    </div>
  )

  // If rotation disabled, show normal layout
  if (!config.enableRotation) {
    return (
      <div className="fixed inset-0 bg-background text-foreground flex flex-col font-mono overflow-hidden select-none selection:bg-none">
        {/* NO HEADER / NAVBAR - FULL SCREEN DISPLAY */}
        
        {/* Floating Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 z-50 bg-[#ffaa00] hover:bg-amber-400 text-black p-2 rounded shadow-lg transition"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        
        {/* Price cards under market grid */}
        <MarketGrid items={mainSix} />

        {/* Main content area: video + news sidebar */}
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-[4] flex flex-col bg-background overflow-hidden">
            <VideoPlayer height="100%" />
          </main>

          <SidePanel news={news} />
        </div>

        {/* Bottom ticker */}
        <GroupedTicker commodities={enrichedCommodities} />

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
      <div className="fixed inset-0 bg-black text-white flex flex-col font-mono overflow-hidden select-none">
        <button
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 z-50 bg-[#ffaa00] hover:bg-amber-400 text-black p-2 rounded shadow-lg transition"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <MarketDataTable commodities={commodities} />
        <div className="absolute bottom-4 right-4 bg-[#ffaa00] text-black px-4 py-2 font-black text-sm rounded">
          {config.marketDataDuration - phaseProgress}s remaining
        </div>
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
          body { font-family: 'JetBrains+Mono', monospace; }
        `}</style>
      </div>
    )
  }

  if (currentPhase === 'image') {
    const currentImage = config.images[currentImageIndex]
    const timeRemaining = config.imageDuration - (phaseProgress - config.marketDataDuration)
    
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden select-none">
        <button
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 z-50 bg-[#ffaa00] hover:bg-amber-400 text-black p-2 rounded shadow-lg transition"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        {currentImage ? (
          <>
            <img 
              src={currentImage.url} 
              alt={currentImage.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-8 right-8 text-white text-sm font-mono bg-black/60 px-4 py-2 rounded">
              {timeRemaining}s
            </div>
          </>
        ) : (
          <div className="text-white text-2xl">No image configured</div>
        )}
      </div>
    )
  }

  // Default: video phase
  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col font-mono overflow-hidden select-none selection:bg-none">
      <button
        onClick={toggleFullscreen}
        className="fixed top-4 right-4 z-50 bg-[#ffaa00] hover:bg-amber-400 text-black p-2 rounded shadow-lg transition"
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
      <MarketGrid items={mainSix} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-[4] flex flex-col bg-background overflow-hidden">
          <VideoPlayer height="100%" />
        </main>
        <SidePanel news={news} />
      </div>
      <GroupedTicker commodities={enrichedCommodities} />
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
