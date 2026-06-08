'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { Maximize2, Minimize2, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

interface Commodity {
  symbol: string
  commodity: string
  price: number
  openingPrice: number
  highPrice?: number
  lowPrice?: number
  changePercent: number
  lastTradeDate: string
  deliveryCenter?: string
  grade?: string
}

const PAGE_SIZE = 10
const SECS_PER_PAGE = 20

function TVMarketContent() {
  const { theme, setTheme } = useTheme()
  const [commodities, setCommodities] = useState<Commodity[]>([])
  const [pageTick, setPageTick] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/prices')
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setCommodities(result.data)
        }
      } catch (err) {
        console.error('TV market fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
    const priceInterval = setInterval(fetchPrices, 30000)
    const tickInterval = setInterval(() => setPageTick((prev) => prev + 1), 1000)

    return () => {
      clearInterval(priceInterval)
      clearInterval(tickInterval)
    }
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen()
      } catch (err) {
        console.error('Failed to enter fullscreen', err)
      }
    } else {
      try {
        await document.exitFullscreen()
      } catch (err) {
        console.error('Failed to exit fullscreen', err)
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(commodities.length / PAGE_SIZE))
  const currentPage = Math.floor(pageTick / SECS_PER_PAGE) % totalPages
  const pageRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE
    return commodities.slice(start, start + PAGE_SIZE)
  }, [commodities, currentPage])

  const markets = useMemo(
    () => [...new Set(pageRows.map((row) => row.deliveryCenter).filter(Boolean))] as string[],
    [pageRows],
  )

  const isDark = theme !== 'light'

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#ffaa00] border-t-transparent animate-spin rounded-full" />
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 overflow-hidden flex flex-col ${isDark ? 'bg-black text-white' : 'bg-white text-zinc-900'}`}>
      {!isFullscreen && (
        <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2 rounded-md border transition ${
              isDark ? 'bg-zinc-900 border-zinc-700 text-yellow-400 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
            }`}
            title="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-md border transition ${
              isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
            }`}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      )}

      <div className={`flex-shrink-0 flex items-center justify-between px-8 pt-6 pb-5 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div>
          <h2 className="text-4xl font-black text-[#ffaa00] uppercase tracking-wider leading-none">
            Market Data
          </h2>
          <p className="text-zinc-500 text-xs font-mono mt-1 uppercase tracking-widest">
            Ghana Commodity Exchange · {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-500 ${
                  i === currentPage ? 'w-6 h-2 bg-[#ffaa00]' : (isDark ? 'w-2 h-2 bg-zinc-700' : 'w-2 h-2 bg-zinc-300')
                }`}
              />
            ))}
          </div>
          <div className="text-right">
            <div className={`text-3xl font-black tabular-nums ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {currentPage + 1}
              <span className={isDark ? 'text-zinc-600 text-lg' : 'text-zinc-400 text-lg'}> / {totalPages}</span>
            </div>
            <div className="text-zinc-500 text-xs uppercase tracking-widest font-black">
              {commodities.length} total rows
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-8 pt-3 pb-1 overflow-hidden">
        <div key={currentPage} className="h-full market-page-fade">
          <table className="w-full h-full text-lg font-mono market-table">
            <thead className="border-b-2 border-[#ffaa00]">
              <tr className="text-left">
                {['Symbol', 'Commodity', 'Open', 'Close', 'High', 'Low', 'Chg %', 'Grade', 'Last Trade'].map((h) => (
                  <th
                    key={h}
                    className={`py-3 px-4 font-black text-[#ffaa00] uppercase tracking-wider text-sm ${
                      ['Open', 'Close', 'High', 'Low', 'Chg %'].includes(h) ? 'text-right' : h === 'Grade' ? 'text-center' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((item, idx) => (
                <tr
                  key={`${item.symbol}-${idx}`}
                  className={`border-b market-table-row ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'} ${
                    idx % 2 === 0 ? (isDark ? 'bg-zinc-950' : 'bg-zinc-50') : (isDark ? 'bg-black' : 'bg-white')
                  }`}
                >
                  <td className={`px-4 text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.symbol}</td>
                  <td className={`${isDark ? 'text-zinc-300' : 'text-zinc-700'} px-4 text-lg whitespace-nowrap`}>{item.commodity}</td>
                  <td className={`${isDark ? 'text-zinc-400' : 'text-zinc-500'} px-4 text-right text-lg`}>{item.openingPrice?.toFixed(2) || '—'}</td>
                  <td className={`px-4 text-right text-lg font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.price?.toFixed(2) || '—'}</td>
                  <td className="px-4 text-right text-emerald-400 text-lg">{item.highPrice?.toFixed(2) || '—'}</td>
                  <td className="px-4 text-right text-rose-400 text-lg">{item.lowPrice?.toFixed(2) || '—'}</td>
                  <td className={`px-4 text-right font-black text-xl ${item.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.changePercent >= 0 ? '▲' : '▼'}&nbsp;{Math.abs(item.changePercent).toFixed(2)}%
                  </td>
                  <td className="px-4 text-zinc-500 text-base text-center">{item.grade || '—'}</td>
                  <td className="px-4 text-zinc-500 text-base">{item.lastTradeDate || '—'}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, PAGE_SIZE - pageRows.length) }).map((_, idx) => (
                <tr
                  key={`filler-${idx}`}
                  className={`border-b market-table-row ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'} ${
                    (pageRows.length + idx) % 2 === 0 ? (isDark ? 'bg-zinc-950' : 'bg-zinc-50') : (isDark ? 'bg-black' : 'bg-white')
                  }`}
                >
                  <td colSpan={9} className="px-4">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`flex-shrink-0 border-t px-8 py-2 flex items-center gap-4 overflow-hidden ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <span className={`text-[9px] font-black uppercase tracking-widest flex-shrink-0 ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>Markets</span>
        {markets.map((dc) => (
          <span
            key={dc}
            className={`text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide border ${
              isDark ? 'text-zinc-500 border-zinc-800' : 'text-zinc-600 border-zinc-300'
            }`}
          >
            {dc}
          </span>
        ))}
      </div>

      <style jsx global>{`
        @keyframes marketPageFade {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .market-page-fade {
          animation: marketPageFade 0.45s ease-out both;
        }
        .market-table {
          table-layout: auto;
        }
        .market-table tbody {
          display: table-row-group;
        }
        .market-table-row {
          height: calc((100% - 44px) / 10);
        }
      `}</style>
    </div>
  )
}

export default function TVMarketPage() {
  return (
    <Suspense fallback={null}>
      <TVMarketContent />
    </Suspense>
  )
}
