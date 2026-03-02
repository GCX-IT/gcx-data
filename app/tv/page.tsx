'use client'
import { useEffect, useState, Suspense, useMemo } from 'react'
import { TerminalHeader, MarketGrid, SidePanel } from '@/components/TerminalComponents'
import type { NewsItem } from '@/components/TerminalComponents'
import { GroupedTicker } from '@/components/TerminalTicker'
import { VideoPlayer } from '@/components/VideoPlayer'

interface Commodity {
  symbol: string;
  commodity: string;
  price: number;
  changePercent: number;
  highPrice?: number;
  lowPrice?: number;
  lastTradeDate: string;
  history?: { val: number }[];
}

function TVContent() {
  const [commodities, setCommodities] = useState<Commodity[]>([])
  const [historyMap, setHistoryMap] = useState<Record<string, { val: number }[]>>({})
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

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

    const priceInterval = setInterval(fetchPrices, 30000)
    const newsInterval = setInterval(fetchNews, 120000) // refresh news every 2 min
    const tInterval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => { clearInterval(priceInterval); clearInterval(newsInterval); clearInterval(tInterval) }
  }, [])

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

      // Use most recent lastTradeDate from matching symbols
      const latestDate = matches
        .map(c => c.lastTradeDate)
        .filter(Boolean)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || ''

      // Build real history by pooling all historical entries for matching symbols
      const allHistoryPoints: { val: number; date: string }[] = []
      matches.forEach(c => {
        const hist = historyMap[c.symbol]
        if (hist && hist.length > 0) {
          // historyMap values are {val} from /api/prices - normalize just in case
          hist.forEach((h: any, i: number) => {
            const val = typeof h === 'number' ? h : (h.val ?? h.value ?? 0)
            allHistoryPoints.push({ val, date: String(i) })
          })
        }
      })

      // If we got real data pool it, otherwise generate sensible fallback
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

  // Enrich commodities with history for the bottom ticker
  const enrichedCommodities = useMemo(() =>
    commodities.map(c => ({
      ...c,
      history: historyMap[c.symbol], // already in { val } format from /api/prices
    }))
  , [commodities, historyMap])

  if (loading) return (
    <div className="h-screen w-screen bg-background flex flex-col items-center justify-center text-[#ffaa00] font-mono">
      <div className="w-12 h-12 border-2 border-[#ffaa00] border-t-transparent animate-spin rounded-full mb-6" />
      <div className="tracking-[0.5em] text-[10px] uppercase font-black">Decrypting Data Stream...</div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col font-mono overflow-hidden select-none selection:bg-none">
      <TerminalHeader currentTime={currentTime} />
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

export default function TVDisplay() {
  return <Suspense fallback={null}><TVContent /></Suspense>
}
