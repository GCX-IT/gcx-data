'use client'
import { useEffect, useState, Suspense, useMemo } from 'react'
import { TerminalHeader, MarketGrid, SidePanel } from '@/components/TerminalComponents'
import { GroupedTicker } from '@/components/TerminalTicker'

interface Commodity {
  symbol: string;
  commodity: string;
  price: number;
  changePercent: number;
  highPrice?: number;
  lowPrice?: number;
  lastTradeDate: string;
}

function TVContent() {
  const [commodities, setCommodities] = useState<Commodity[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/prices')
        const result = await response.json()
        if (result.success) setCommodities(result.data)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetchPrices()
    const interval = setInterval(fetchPrices, 30000)
    const tInterval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => { clearInterval(interval); clearInterval(tInterval) }
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
      const avgPrice = count > 0
        ? matches.reduce((sum, c) => sum + c.price, 0) / count
        : 0
      const avgChange = count > 0
        ? matches.reduce((sum, c) => sum + c.changePercent, 0) / count
        : 0

      const basePrice = avgPrice
      const change = avgChange

      // Generate more stable historical data for sparkline
      const history = Array.from({ length: 12 }).map((_, i) => {
        const progress = i / 11
        const variance = basePrice * 0.02 * Math.sin(progress * Math.PI)
        const noise = (Math.random() - 0.5) * (basePrice * 0.01)
        const value = basePrice > 0
          ? basePrice * (0.99 + (change / 200)) + variance + noise
          : 4000 + Math.random() * 500

        return {
          time: i,
          value: parseFloat(value.toFixed(2))
        }
      })

      return {
        ...kw,
        label: `${kw.label} (${count})`,
        price: basePrice,
        change: change,
        history
      }
    })
  }, [commodities])

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
        <main className="flex-[4] flex flex-col bg-background">
          <div className="grid grid-cols-12 bg-muted/50 py-3 px-6 border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <div className="col-span-2">Symbol</div>
            <div className="col-span-3">Commodity</div>
            <div className="col-span-2 text-right">Price (GHS)</div>
            <div className="col-span-1 text-right px-2">High</div>
            <div className="col-span-1 text-right px-2">Low</div>
            <div className="col-span-1 text-right">Change%</div>
            <div className="col-span-2 text-right">Last Trade</div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
            {commodities.map((item, idx) => (
              <div key={item.symbol} className={`grid grid-cols-12 px-6 py-4 border-b border-zinc-200 dark:border-zinc-900/40 items-center transition-colors hover:bg-muted/50 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                <div className="col-span-2 font-black text-[#ffaa00] text-lg tracking-tighter">{item.symbol}</div>
                <div className="col-span-3 text-muted-foreground font-bold text-[11px] uppercase truncate pr-4">{item.commodity}</div>
                <div className="col-span-2 text-right font-black text-2xl tabular-nums tracking-tighter text-foreground">
                  {item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="col-span-1 text-right text-[10px] font-bold text-zinc-400 dark:text-zinc-600 tabular-nums px-2">
                  {item.highPrice?.toLocaleString() || '---'}
                </div>
                <div className="col-span-1 text-right text-[10px] font-bold text-zinc-400 dark:text-zinc-600 tabular-nums px-2">
                  {item.lowPrice?.toLocaleString() || '---'}
                </div>
                <div className={`col-span-1 text-right font-black text-base tabular-nums ${item.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-600'}`}>
                  {item.changePercent > 0 ? '▲' : '▼'}{Math.abs(item.changePercent).toFixed(2)}%
                </div>
                <div className="col-span-2 text-right text-[10px] font-black text-zinc-400 dark:text-zinc-700 uppercase">
                  {item.lastTradeDate}
                </div>
              </div>
            ))}
          </div>
        </main>

        <SidePanel commodities={commodities} />
      </div>

      <GroupedTicker commodities={commodities} />

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
