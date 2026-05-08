'use client'

import { useTheme } from 'next-themes'

const PAGE_SIZE = 10
const SECS_PER_PAGE = 20

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

interface Props {
  commodities: Commodity[]
  phaseProgress: number
  phaseDuration: number
}

export function MarketDataTable({ commodities, phaseProgress }: Props) {
  const { theme } = useTheme()
  const isDark = theme !== 'light'
  const totalPages = Math.max(1, Math.ceil(commodities.length / PAGE_SIZE))
  const currentPage = Math.floor(phaseProgress / SECS_PER_PAGE) % totalPages

  const pageRows = commodities.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  )

  return (
    <div className={`h-full w-full flex flex-col overflow-hidden ${isDark ? 'bg-black text-white' : 'bg-white text-zinc-900'}`}>

      {/* HEADER */}
      <div className={`flex-shrink-0 flex items-center justify-between px-8 pt-6 pb-5 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div>
          <h2 className="text-4xl font-black text-[#ffaa00] uppercase tracking-wider leading-none">
            Live Market Data
          </h2>
          <p className={`text-xs font-mono mt-1 uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            Ghana Commodity Exchange · {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>
        <div className="flex items-center gap-6">
          {/* Page indicator dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-500 ${
                  i === currentPage
                    ? 'w-6 h-2 bg-[#ffaa00]'
                    : (isDark ? 'w-2 h-2 bg-zinc-700' : 'w-2 h-2 bg-zinc-300')
                }`}
              />
            ))}
          </div>
          {/* Page counter */}
          <div className="text-right">
            <div className={`text-3xl font-black tabular-nums ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {currentPage + 1}
              <span className={`${isDark ? 'text-zinc-600' : 'text-zinc-400'} text-lg`}> / {totalPages}</span>
            </div>
            <div className={`text-xs uppercase tracking-widest font-black ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              {commodities.length} total rows
            </div>
          </div>
        </div>
      </div>

      {/* TABLE — key triggers slide-in animation on page change */}
      <div key={currentPage} className="flex-1 overflow-hidden px-8 pt-3 pb-1 market-page-slide">
        <table className="w-full text-base font-mono">
          <thead className="border-b-2 border-[#ffaa00]">
            <tr className="text-left">
              {['Symbol', 'Commodity', 'Open', 'Close', 'High', 'Low', 'Chg %', 'Grade', 'Last Traded Date'].map(h => (
                <th
                  key={h}
                  className={`py-3 px-4 font-black text-[#ffaa00] uppercase tracking-wider text-xs ${
                    ['Open', 'Close', 'High', 'Low', 'Chg %'].includes(h) ? 'text-right' : ''
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
                key={item.symbol}
                className={`border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'} ${
                  idx % 2 === 0 ? (isDark ? 'bg-zinc-950' : 'bg-zinc-50') : (isDark ? 'bg-black' : 'bg-white')
                }`}
              >
                <td className={`py-4 px-4 text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.symbol}</td>
                <td className={`py-4 px-4 text-base ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{item.commodity}</td>
                <td className={`py-4 px-4 text-right text-base ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{item.openingPrice?.toFixed(2) || '—'}</td>
                <td className={`py-4 px-4 text-right text-base font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.price?.toFixed(2) || '—'}</td>
                <td className="py-4 px-4 text-right text-base text-emerald-400">{item.highPrice?.toFixed(2) || '—'}</td>
                <td className="py-4 px-4 text-right text-base text-rose-400">{item.lowPrice?.toFixed(2) || '—'}</td>
                <td className={`py-4 px-4 text-right font-black text-lg ${item.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {item.changePercent >= 0 ? '▲' : '▼'}&nbsp;{Math.abs(item.changePercent).toFixed(2)}%
                </td>
                <td className="py-4 px-4 text-zinc-500 text-sm">{item.grade || '—'}</td>
                <td className="py-4 px-4 text-zinc-500 text-sm">{item.lastTradeDate || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER: delivery centres */}
      <div className={`flex-shrink-0 border-t px-8 py-2 flex items-center gap-4 overflow-hidden ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <span className={`text-[9px] font-black uppercase tracking-widest flex-shrink-0 ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>Markets</span>
        {[...new Set(pageRows.map(r => r.deliveryCenter).filter(Boolean))].map(dc => (
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
        @keyframes marketSlideIn {
          from { opacity: 0; transform: translateX(60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .market-page-slide {
          animation: marketSlideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  )
}
