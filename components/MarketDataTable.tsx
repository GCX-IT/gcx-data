'use client'

const PAGE_SIZE = 10
const SECS_PER_PAGE = 10

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
  const totalPages = Math.max(1, Math.ceil(commodities.length / PAGE_SIZE))
  const currentPage = Math.floor(phaseProgress / SECS_PER_PAGE) % totalPages

  const pageRows = commodities.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  )

  return (
    <div className="h-full w-full flex flex-col bg-black overflow-hidden">

      {/* HEADER */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 pt-6 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-3xl font-black text-[#ffaa00] uppercase tracking-wider leading-none">
            Live Market Data
          </h2>
          <p className="text-zinc-500 text-[11px] font-mono mt-1 uppercase tracking-widest">
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
                  i === currentPage ? 'w-6 h-2 bg-[#ffaa00]' : 'w-2 h-2 bg-zinc-700'
                }`}
              />
            ))}
          </div>
          {/* Page counter */}
          <div className="text-right">
            <div className="text-2xl font-black text-white tabular-nums">
              {currentPage + 1}
              <span className="text-zinc-600 text-lg"> / {totalPages}</span>
            </div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
              {commodities.length} total rows
            </div>
          </div>
        </div>
      </div>

      {/* TABLE — key triggers slide-in animation on page change */}
      <div key={currentPage} className="flex-1 overflow-hidden px-8 pt-4 pb-4 market-page-slide">
        <table className="w-full text-sm font-mono">
          <thead className="border-b-2 border-[#ffaa00]">
            <tr className="text-left">
              {['Symbol', 'Commodity', 'Open', 'Close', 'High', 'Low', 'Chg %', 'Grade', 'Date'].map(h => (
                <th
                  key={h}
                  className={`py-3 px-4 font-black text-[#ffaa00] uppercase tracking-wider text-[11px] ${
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
                className={`border-b border-zinc-800/60 ${idx % 2 === 0 ? 'bg-zinc-950' : 'bg-black'}`}
              >
                <td className="py-3 px-4 font-black text-white tracking-tight">{item.symbol}</td>
                <td className="py-3 px-4 text-zinc-300">{item.commodity}</td>
                <td className="py-3 px-4 text-right text-zinc-400">{item.openingPrice?.toFixed(2) || '—'}</td>
                <td className="py-3 px-4 text-right font-black text-white">{item.price?.toFixed(2) || '—'}</td>
                <td className="py-3 px-4 text-right text-emerald-400">{item.highPrice?.toFixed(2) || '—'}</td>
                <td className="py-3 px-4 text-right text-rose-400">{item.lowPrice?.toFixed(2) || '—'}</td>
                <td className={`py-3 px-4 text-right font-black text-base ${item.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {item.changePercent >= 0 ? '▲' : '▼'}&nbsp;{Math.abs(item.changePercent).toFixed(2)}%
                </td>
                <td className="py-3 px-4 text-zinc-500 text-xs">{item.grade || '—'}</td>
                <td className="py-3 px-4 text-zinc-500 text-xs">{item.lastTradeDate || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER: delivery centres */}
      <div className="flex-shrink-0 border-t border-zinc-800 px-8 py-2 flex items-center gap-4 overflow-hidden">
        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex-shrink-0">Markets</span>
        {[...new Set(pageRows.map(r => r.deliveryCenter).filter(Boolean))].map(dc => (
          <span key={dc} className="text-[9px] font-bold text-zinc-500 border border-zinc-800 px-2 py-0.5 uppercase tracking-wide">{dc}</span>
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
