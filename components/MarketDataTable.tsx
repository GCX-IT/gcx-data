'use client'

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

export function MarketDataTable({ commodities }: { commodities: Commodity[] }) {
  return (
    <div className="h-full w-full overflow-hidden bg-black p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-[#ffaa00] uppercase tracking-wider mb-2">
          Live Market Data
        </h2>
        <p className="text-zinc-500 text-sm font-mono">
          Real-time commodity prices • {new Date().toLocaleDateString('en-GB')}
        </p>
      </div>

      <div className="overflow-auto h-[calc(100%-100px)] custom-scrollbar">
        <table className="w-full text-sm font-mono">
          <thead className="sticky top-0 bg-zinc-900 border-b-2 border-[#ffaa00]">
            <tr className="text-left">
              <th className="py-3 px-4 font-black text-[#ffaa00] uppercase tracking-wider">Symbol</th>
              <th className="py-3 px-4 font-black text-[#ffaa00] uppercase tracking-wider">Commodity</th>
              <th className="py-3 px-4 font-black text-[#ffaa00] uppercase tracking-wider text-right">Open</th>
              <th className="py-3 px-4 font-black text-[#ffaa00] uppercase tracking-wider text-right">Close</th>
              <th className="py-3 px-4 font-black text-[#ffaa00] uppercase tracking-wider text-right">High</th>
              <th className="py-3 px-4 font-black text-[#ffaa00] uppercase tracking-wider text-right">Low</th>
              <th className="py-3 px-4 font-black text-[#ffaa00] uppercase tracking-wider text-right">Change %</th>
              <th className="py-3 px-4 font-black text-[#ffaa00] uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody>
            {commodities.map((item, idx) => (
              <tr 
                key={item.symbol}
                className={`border-b border-zinc-800 hover:bg-zinc-900/50 transition ${
                  idx % 2 === 0 ? 'bg-zinc-950' : 'bg-black'
                }`}
              >
                <td className="py-3 px-4 font-bold text-white">{item.symbol}</td>
                <td className="py-3 px-4 text-zinc-300">{item.commodity}</td>
                <td className="py-3 px-4 text-right text-zinc-300">
                  {item.openingPrice?.toFixed(2) || '-'}
                </td>
                <td className="py-3 px-4 text-right font-bold text-white">
                  {item.price?.toFixed(2) || '-'}
                </td>
                <td className="py-3 px-4 text-right text-emerald-400">
                  {item.highPrice?.toFixed(2) || '-'}
                </td>
                <td className="py-3 px-4 text-right text-rose-400">
                  {item.lowPrice?.toFixed(2) || '-'}
                </td>
                <td className={`py-3 px-4 text-right font-black ${
                  item.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {item.changePercent >= 0 ? '+' : ''}{item.changePercent?.toFixed(2)}%
                </td>
                <td className="py-3 px-4 text-zinc-500 text-xs">
                  {item.lastTradeDate || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #18181b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ffaa00;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ff8800;
        }
      `}</style>
    </div>
  )
}
