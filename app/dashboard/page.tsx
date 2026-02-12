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

const generateHistoricalData = (basePrice: number, high: number, low: number, days = 30) => {
  const data = []
  const startPrice = basePrice * (0.95 + Math.random() * 0.1)
  let currentPrice = startPrice
  
  for (let i = 0; i < days; i++) {
    const progress = i / days
    const trend = (basePrice - startPrice) * progress
    const noise = (Math.random() - 0.5) * (basePrice * 0.02)
    currentPrice = startPrice + trend + noise
    const dayHigh = Math.max(currentPrice * 1.01, high || currentPrice)
    const dayLow = Math.min(currentPrice * 0.99, low || currentPrice)
    data.push({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: i === days - 1 ? basePrice : parseFloat(currentPrice.toFixed(2)),
      high: parseFloat(dayHigh.toFixed(2)),
      low: parseFloat(dayLow.toFixed(2))
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
              <div className="absolute h-full bg-foreground/30" style={{ left: '20%', right: '30%' }} />
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

function MainChart({ commodity }: { commodity: Commodity }) {
  const data = useMemo(() => generateHistoricalData(commodity.price, commodity.highPrice, commodity.lowPrice), [commodity.symbol, commodity.price, commodity.highPrice, commodity.lowPrice])
  const { theme } = useTheme()
  const gridColor = theme === 'dark' ? '#222' : '#eee'
  const axisColor = theme === 'dark' ? '#444' : '#999'

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y'].map((range) => (
            <button 
              key={range} 
              className={`text-[10px] font-bold px-2 py-1 rounded transition ${range === '1M' ? 'bg-[#ffaa00] text-black' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {range}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
          <div>O: <span className="text-foreground">{commodity.openingPrice?.toLocaleString()}</span></div>
          <div>H: <span className="text-foreground">{commodity.highPrice?.toLocaleString()}</span></div>
          <div>L: <span className="text-foreground">{commodity.lowPrice?.toLocaleString()}</span></div>
          <div>C: <span className="text-foreground">{commodity.closePrice?.toLocaleString()}</span></div>
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffaa00" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#ffaa00" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="date" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} padding={{ left: 10, right: 10 }} />
            <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ backgroundColor: theme === 'dark' ? '#000' : '#fff', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px' }}
              itemStyle={{ color: '#ffaa00', fontSize: '11px', fontWeight: 'bold' }}
              labelStyle={{ color: 'var(--muted-foreground)', fontSize: '10px', marginBottom: '4px' }}
              cursor={{ stroke: axisColor, strokeWidth: 1 }}
            />
            <Area type="monotone" dataKey="price" stroke="#ffaa00" strokeWidth={2} fillOpacity={1} fill="url(#chartGradient)" animationDuration={1000} />
            <ReferenceLine y={commodity.openingPrice} stroke={axisColor} strokeDasharray="3 3" label={{ value: 'OPEN', position: 'right', fill: axisColor, fontSize: 10 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Watchlist({ commodities, activeSymbol, onSelect }: { commodities: Commodity[], activeSymbol: string, onSelect: (sym: string) => void }) {
  const [search, setSearch] = useState('')
  const filtered = commodities.filter(c => c.symbol.toLowerCase().includes(search.toLowerCase()) || c.commodity.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="h-full flex flex-col">
      <div className="relative mb-4" data-no-drag>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
        <input 
          type="text" 
          placeholder="Symbol or Commodity..." 
          className="w-full bg-muted/50 border border-border rounded py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:border-foreground/30 transition text-foreground"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1" data-no-drag>
        <div className="grid grid-cols-12 px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
          <div className="col-span-4">Symbol</div>
          <div className="col-span-4 text-right">Price</div>
          <div className="col-span-4 text-right">Change %</div>
        </div>
        {filtered.map(item => (
          <button 
            key={item.symbol} 
            onClick={() => onSelect(item.symbol)}
            className={`w-full grid grid-cols-12 px-2 py-3 rounded text-left transition group ${
              activeSymbol === item.symbol ? 'bg-muted border-l-2 border-[#ffaa00]' : 'hover:bg-muted/50 border-l-2 border-transparent'
            }`}
          >
            <div className="col-span-4 flex flex-col">
              <span className="text-xs font-black group-hover:text-[#ffaa00] transition text-foreground">{item.symbol}</span>
              <span className="text-[10px] text-muted-foreground truncate">{item.commodity}</span>
            </div>
            <div className="col-span-4 text-right text-xs font-mono font-bold mt-1 text-foreground">GHC {item.price.toLocaleString()}</div>
            <div className={`col-span-4 text-right text-xs font-bold mt-1 ${item.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function SummaryStats({ commodities }: { commodities: Commodity[] }) {
  const activeCount = commodities.length
  const totalGainers = commodities.filter(c => c.changePercent > 0).length
  const avgPrice = commodities.reduce((s, c) => s + c.price, 0) / activeCount
  
  return (
    <div className="h-full grid grid-cols-1 gap-4 overflow-y-auto custom-scrollbar">
      {[
        { label: 'Active Listings', value: activeCount, color: 'text-muted-foreground', bg: 'bg-muted/20' },
        { label: 'Market Sentiment', value: `${((totalGainers / activeCount) * 100).toFixed(0)}% Bullish`, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Index Average', value: `${avgPrice.toFixed(2)}`, color: 'text-[#ffaa00]', bg: 'bg-amber-500/10' },
        { label: 'Total Volume (24h)', value: '12,450,200', color: 'text-muted-foreground', bg: 'bg-muted/20' }
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
              { id: 'w5', type: 'chart', title: 'Volume Analysis' , x: 1, y: 1}
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

  const handleMouseDown = (_e: React.MouseEvent, widgetId: string) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    setDragging({ id: widgetId, startX: e.clientX, startY: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {}
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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#ffaa00] selection:text-black overflow-x-hidden" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
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

      <main className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[minmax(300px,_auto)]">
        {widgets.map(widget => (
          <div 
            key={widget.id}
            onMouseDown={(e) => handleMouseDown(e, widget.id)}
            className={`bg-card border border-border rounded-lg flex flex-col transition-all duration-200 group relative ${
              widget.type === 'chart' ? 'md:col-span-2 md:row-span-2' : 
              widget.type === 'watchlist' ? 'md:col-span-1 md:row-span-2' : 
              'md:col-span-1 md:row-span-1'
            } ${dragging?.id === widget.id ? 'z-50 ring-2 ring-[#ffaa00] opacity-90 scale-[1.01]' : 'shadow-xl dark:shadow-black/50'}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <GripHorizontal size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground transition" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{widget.title}</span>
              </div>
              <button onClick={() => setWidgets(prev => prev.filter(w => w.id !== widget.id))} className="text-muted-foreground hover:text-rose-500">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 p-5 overflow-hidden">
               {focusCommodity ? (
                 <>
                   {widget.type === 'price' && <PriceCard commodity={focusCommodity} />}
                   {widget.type === 'chart' && <MainChart commodity={focusCommodity} />}
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
      </main>

      <footer className="fixed bottom-0 left-0 right-0 h-8 bg-background border-t border-border flex items-center z-50">
        <div className="bg-[#ffaa00] h-full px-4 flex items-center text-[10px] font-black text-black uppercase">LIVE</div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
            {commodities.map(c => (
              <div key={c.symbol} className="flex items-center gap-2 text-[10px] font-bold">
                <span className="text-muted-foreground uppercase">{c.symbol}</span>
                <span className="text-foreground">GHC {c.price.toLocaleString()}</span>
                <span className={c.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                  {c.changePercent >= 0 ? '' : ''}{Math.abs(c.changePercent).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .animate-marquee { animation: marquee 80s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 2px; }
      `}</style>
    </div>
  )
}
