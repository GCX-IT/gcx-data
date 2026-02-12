'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  GripHorizontal,
  X,
  Search,
  LayoutDashboard,
  Activity,
  BarChart3,
  List,
  MapPin,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts'
import { useTheme } from 'next-themes'
import { FullscreenToggle } from '@/components/FullscreenToggle'

interface Commodity {
  symbol: string
  commodity: string
  deliveryCenter: string
  grade: string
  price: number
  closePrice: number
  changeAmount: number
  changePercent: number
  highPrice: number
  lowPrice: number
  lastTradeDate: string
  openingPrice: number
}

interface Widget {
  id: string
  type: 'price' | 'chart' | 'watchlist' | 'topgainer' | 'summary' | 'details'
  title: string
  commoditySymbol?: string
  x: number
  y: number
}

const generateHistoricalData = (basePrice: number, high: number, low: number, openingPrice: number, points = 30) => {
  const data = []

  if (high === low && high === basePrice) {
    for (let i = 0; i < points; i++) {
      data.push({
        time: i,
        price: basePrice,
        high: high,
        low: low
      })
    }
    return data
  }

  const startPrice = openingPrice || basePrice * (0.99 + Math.random() * 0.02)
  let currentPrice = startPrice

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1)
    const trend = (basePrice - startPrice) * progress
    const variance = (high - low) * 0.2 * Math.sin(progress * Math.PI)
    const noise = (Math.random() - 0.5) * ((high - low) || (basePrice * 0.01))

    currentPrice = startPrice + trend + variance + noise
    currentPrice = Math.max(low, Math.min(high, currentPrice))
    if (i === points - 1) currentPrice = basePrice

    data.push({
      time: i,
      price: parseFloat(currentPrice.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2))
    })
  }
  return data
}

function PriceCard({ commodity }: { commodity: Commodity }) {
  const isPositive = commodity.changePercent >= 0
  return (
    <div className="h-full flex flex-col justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="bg-[#ffaa00] text-black text-[10px] font-black px-1.5 py-0.5 rounded-sm uppercase">GCX LIVE</span>
          <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{commodity.symbol}</span>
        </div>
        <div className="text-4xl font-black tracking-tight tabular-nums text-foreground">
          GHC {commodity.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            <span>{isPositive ? '+' : ''}{commodity.changePercent.toFixed(2)}%</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">({commodity.changeAmount > 0 ? '+' : ''}{commodity.changeAmount.toFixed(2)})</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Day Range</div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden relative">
              <div
                className="absolute h-full bg-[#ffaa00]/30"
                style={{
                  left: `${((commodity.lowPrice - (commodity.price * 0.8)) / (commodity.price * 0.4)) * 100}%`,
                  right: `${(1 - (commodity.highPrice - (commodity.price * 0.8)) / (commodity.price * 0.4)) * 100}%`
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>{commodity.lowPrice.toLocaleString()}</span>
              <span>{commodity.highPrice.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Information</div>
            <div className="text-xs font-bold text-foreground/80">Grade {commodity.grade}</div>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin size={12} />
            <span className="text-[10px] font-bold uppercase">{commodity.deliveryCenter}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock size={12} />
            <span className="text-[10px] font-bold uppercase">{commodity.lastTradeDate}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MainChart({ commodity, title }: { commodity: Commodity, title: string }) {
  const [range, setRange] = useState('1M')

  const points = useMemo(() => {
    switch (range) {
      case '1D': return 12
      case '5D': return 24
      case '1M': return 30
      case '3M': return 60
      case '6M': return 90
      case 'YTD': return 45
      case '1Y': return 120
      default: return 30
    }
  }, [range])

  const data = useMemo(() =>
    generateHistoricalData(commodity.price, commodity.highPrice, commodity.lowPrice, commodity.openingPrice, points),
    [commodity.symbol, commodity.price, commodity.highPrice, commodity.lowPrice, commodity.openingPrice, points]
  )

  const { theme } = useTheme()
  const gridColor = theme === 'dark' ? '#222' : '#eee'
  const axisColor = theme === 'dark' ? '#444' : '#999'

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5">
          {['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[9px] font-black px-2 py-1 rounded transition border ${r === range
                ? 'bg-[#ffaa00] border-[#ffaa00] text-black shadow-[0_0_10px_rgba(255,170,0,0.3)]'
                : 'text-muted-foreground border-transparent hover:border-border hover:bg-muted font-bold'
                }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground border-l border-border pl-3">
          <div className="flex flex-col"><span className="text-[8px] opacity-50">OPEN</span><span className="text-foreground font-bold">{commodity.openingPrice?.toLocaleString()}</span></div>
          <div className="flex flex-col"><span className="text-[8px] opacity-50">HIGH</span><span className="text-foreground font-bold">{commodity.highPrice?.toLocaleString()}</span></div>
          <div className="flex flex-col"><span className="text-[8px] opacity-50">LOW</span><span className="text-foreground font-bold">{commodity.lowPrice?.toLocaleString()}</span></div>
          <div className="flex flex-col"><span className="text-[8px] opacity-50">LAST</span><span className="text-foreground font-bold">{commodity.closePrice?.toLocaleString()}</span></div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffaa00" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ffaa00" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} opacity={0.5} />
            <XAxis dataKey="time" hide />
            <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => v.toLocaleString()} />
            <Tooltip
              contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', backdropFilter: 'blur(4px)' }}
              itemStyle={{ color: '#ffaa00', fontSize: '11px', fontWeight: 'bold' }}
              labelStyle={{ display: 'none' }}
              cursor={{ stroke: '#ffaa00', strokeWidth: 1, strokeDasharray: '3 3' }}
              formatter={(value: any) => [`GHC ${value.toLocaleString()}`, 'Price']}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#ffaa00"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#chartGradient)"
              animationDuration={800}
            />
            <ReferenceLine y={commodity.openingPrice} stroke={axisColor} strokeDasharray="3 3" label={{ value: 'OPEN', position: 'right', fill: axisColor, fontSize: 10 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-2 border-t border-border pt-1">
        Trend Analysis for {range} Period
      </div>
    </div>
  )
}

function Watchlist({ commodities, activeSymbol, onSelect }: { commodities: Commodity[], activeSymbol: string, onSelect: (sym: string) => void }) {
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(15)

  const filtered = useMemo(() => {
    return commodities.filter(c => c.symbol.toLowerCase().includes(search.toLowerCase()) || c.commodity.toLowerCase().includes(search.toLowerCase()))
  }, [commodities, search])

  const displayed = useMemo(() => filtered.slice(0, limit), [filtered, limit])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (limit < filtered.length) {
        setLimit(prev => prev + 15)
      }
    }
  }

  useEffect(() => {
    setLimit(15)
  }, [search])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="relative mb-3 flex-shrink-0" data-no-drag>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
        <input
          type="text"
          placeholder="Filter Symbol..."
          className="w-full bg-muted/50 border border-border rounded-md py-1.5 pl-8 pr-3 text-[10px] focus:outline-none focus:border-[#ffaa00]/50 transition text-foreground"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div
        className="flex-1 overflow-y-auto custom-scrollbar pr-1"
        data-no-drag
        onScroll={handleScroll}
      >
        <div className="grid grid-cols-12 px-2 py-1 text-[9px] font-black text-muted-foreground uppercase sticky top-0 bg-card z-10 border-b border-border/50">
          <div className="col-span-4">Symbol</div>
          <div className="col-span-4 text-right">Price</div>
          <div className="col-span-4 text-right">CHG%</div>
        </div>
        <div className="divide-y divide-border/30">
          {displayed.map(item => (
            <button
              key={item.symbol}
              onClick={() => onSelect(item.symbol)}
              className={`w-full grid grid-cols-12 px-2 py-2 text-left transition group border-l-2 ${activeSymbol === item.symbol ? 'bg-[#ffaa00]/10 border-[#ffaa00]' : 'hover:bg-muted/50 border-transparent'
                }`}
            >
              <div className="col-span-4 flex flex-col">
                <span className="text-[11px] font-black group-hover:text-[#ffaa00] transition text-foreground tracking-tighter">{item.symbol}</span>
                <span className="text-[9px] text-muted-foreground truncate opacity-70">{item.commodity}</span>
              </div>
              <div className="col-span-4 text-right text-[11px] font-mono font-bold self-center text-foreground">{item.price.toLocaleString()}</div>
              <div className={`col-span-4 text-right text-[10px] font-black self-center ${item.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {item.changePercent >= 0 ? '▲' : '▼'}{Math.abs(item.changePercent).toFixed(2)}%
              </div>
            </button>
          ))}
          {limit < filtered.length && (
            <div className="py-4 text-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
              Scroll for more
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryStats({ commodities }: { commodities: Commodity[] }) {
  const activeCount = commodities.length
  const totalGainers = commodities.filter(c => c.changePercent > 0).length
  const avgPrice = activeCount > 0 ? commodities.reduce((s, c) => s + c.price, 0) / activeCount : 0
  const avgChange = activeCount > 0 ? commodities.reduce((s, c) => s + c.changePercent, 0) / activeCount : 0

  return (
    <div className="h-full grid grid-cols-1 gap-4 overflow-y-auto custom-scrollbar">
      {[
        { label: 'Active Listings', value: activeCount, color: 'text-muted-foreground', bg: 'bg-muted/20' },
        { label: 'Market Sentiment', value: `${activeCount > 0 ? ((totalGainers / activeCount) * 100).toFixed(0) : 0}% Bullish`, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Average Price', value: `GHC ${avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: 'text-[#ffaa00]', bg: 'bg-amber-500/10' },
        { label: 'Avg Market Change', value: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`, color: avgChange >= 0 ? 'text-emerald-500' : 'text-rose-500', bg: 'bg-muted/20' }
      ].map((stat, i) => (
        <div key={i} className={`${stat.bg} border border-border p-4 rounded-lg flex flex-col justify-between`}>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</div>
          <div className={`text-2xl font-black ${stat.color} mt-2`}>{stat.value}</div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [commodities, setCommodities] = useState<Commodity[]>([])
  const [activeSymbol, setActiveSymbol] = useState<string>('')
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [dragging, setDragging] = useState<{ id: string, startX: number, startY: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const focusCommodity = useMemo(() => commodities.find(c => c.symbol === activeSymbol) || commodities[0], [commodities, activeSymbol])

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/prices')
        const result = await response.json()
        if (result.success) {
          setCommodities(result.data)
          if (!activeSymbol) setActiveSymbol(result.data[0]?.symbol)
          if (widgets.length === 0) {
            setWidgets([
              { id: 'w1', type: 'price', title: 'Real-Time Price', x: 0, y: 0 },
              { id: 'w2', type: 'chart', title: 'Price Performance', x: 1, y: 0 },
              { id: 'w3', type: 'watchlist', title: 'Market Watchlist', x: 3, y: 0 },
              { id: 'w4', type: 'summary', title: 'Market Summary', x: 0, y: 1 },
              { id: 'w5', type: 'chart', title: 'Volatility Index', x: 1, y: 1 }
            ])
          }
        }
      } catch (err) { console.error('Fetch error:', err) }
      finally { setLoading(false) }
    }
    fetchPrices()
    const interval = setInterval(fetchPrices, 30000)
    return () => clearInterval(interval)
  }, [activeSymbol, widgets.length])

  const handleMouseDown = (e: React.MouseEvent, widgetId: string) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    setDragging({ id: widgetId, startX: e.clientX, startY: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // DRAG LOGIC REMOVED FOR STABILITY IN THIS VERSION
  }
  const handleMouseUp = () => setDragging(null)

  const addWidget = (type: any) => {
    setWidgets(prev => [...prev, { id: Date.now().toString(), type, title: (type as string).charAt(0).toUpperCase() + (type as string).slice(1), x: 0, y: 0 }])
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#ffaa00] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <div className="text-[#ffaa00] font-black tracking-widest uppercase text-xs">Authenticating Terminal...</div>
      </div>
    </div>
  )

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-background text-foreground font-sans selection:bg-[#ffaa00] selection:text-black overflow-hidden" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div className="flex-shrink-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tighter text-foreground uppercase">Pro Terminal</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Ghana Commodity Exchange Data</span>
        </div>
        <div className="flex gap-2 items-center">
          <FullscreenToggle />
          <div className="w-[1px] h-8 bg-border mx-2" />
          {[
            { icon: LayoutDashboard, type: 'summary', label: 'Summary' },
            { icon: List, type: 'watchlist', label: 'Watchlist' },
            { icon: BarChart3, type: 'chart', label: 'Chart' },
            { icon: Activity, type: 'price', label: 'Card' }
          ].map((btn) => (
            <button key={btn.label} onClick={() => addWidget(btn.type as any)} className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded transition">
              <btn.icon size={14} />
              <span className="text-[10px] font-bold uppercase">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6 bg-muted/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-auto">
          {widgets.map(widget => (
            <div
              key={widget.id}
              onMouseDown={(e) => handleMouseDown(e, widget.id)}
              className={`bg-card border border-border rounded-lg flex flex-col transition-all duration-200 group relative overflow-hidden ${widget.type === 'chart' ? 'md:col-span-2 md:row-span-1 min-h-[250px]' :
                widget.type === 'watchlist' ? 'md:col-span-1 md:row-span-1 min-h-[250px]' :
                  'md:col-span-1 md:row-span-1 min-h-[120px]'
                } ${dragging?.id === widget.id ? 'z-50 ring-2 ring-[#ffaa00] opacity-90 scale-[1.01]' : 'shadow-xl dark:shadow-black/50 hover:border-foreground/20'}`}
            >
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border cursor-grab active:cursor-grabbing bg-muted/30">
                <div className="flex items-center gap-2">
                  <GripHorizontal size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground transition" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{widget.title}</span>
                </div>
                <button onClick={() => setWidgets(prev => prev.filter(w => w.id !== widget.id))} className="text-muted-foreground hover:text-rose-500 transition-colors">
                  <X size={12} />
                </button>
              </div>
              <div className="flex-1 p-3 overflow-hidden">
                {focusCommodity ? (
                  <>
                    {widget.type === 'price' && <PriceCard commodity={focusCommodity} />}
                    {widget.type === 'chart' && <MainChart commodity={focusCommodity} title={widget.title} />}
                    {widget.type === 'watchlist' && <Watchlist commodities={commodities} activeSymbol={activeSymbol} onSelect={setActiveSymbol} />}
                    {widget.type === 'summary' && <SummaryStats commodities={commodities} />}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-muted-foreground uppercase text-[10px] font-bold animate-pulse">Establishing Stream...</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="flex-shrink-0 bottom-0 left-0 right-0 h-8 bg-background border-t border-border flex items-center z-50">
        <div className="bg-[#ffaa00] h-full px-4 flex items-center text-[10px] font-black text-black uppercase">LIVE</div>
        <div className="flex-1 overflow-hidden relative">
          <div className="flex items-center gap-8 animate-marquee whitespace-nowrap absolute inset-0 py-2">
            {commodities.map(c => (
              <div key={c.symbol} className="flex items-center gap-2 text-[10px] font-bold">
                <span className="text-muted-foreground uppercase">{c.symbol}</span>
                <span className="text-foreground">GHC {c.price.toLocaleString()}</span>
                <span className={c.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                  {c.changePercent >= 0 ? '▲' : '▼'}{Math.abs(c.changePercent).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { 
          animation: marquee 40s linear infinite; 
          width: fit-content;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  )
}
