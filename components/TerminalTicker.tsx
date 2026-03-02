'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface Commodity {
  symbol: string
  commodity: string
  price: number
  changePercent: number
  highPrice?: number
  lowPrice?: number
  lastTradeDate?: string
  history?: { val: number }[]
}

function MiniSparkline({ color, data }: { color: string; data?: { val: number }[] }) {
  const fallback = useMemo(() => Array.from({ length: 10 }).map((_, i) => ({
    val: 50 + Math.sin(i * 0.8) * 15
  })), [])
  const chartData = data && data.length >= 2 ? data : fallback

  return (
    <div className="h-full w-full opacity-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <Area
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={1}
            fillOpacity={0.1}
            fill={color}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TickerBox({ commodity }: { commodity: Commodity }) {
  const isPositive = commodity.changePercent >= 0
  const color = isPositive ? '#10b981' : '#f43f5e'

  return (
    <div className="w-[280px] h-full flex flex-col justify-center border-r border-border bg-card/40 hover:bg-muted/50 transition-colors px-4 group relative overflow-hidden">
      <div className="flex items-center justify-between mb-0.5 z-10">
        <span className="text-xs font-black text-[#ffaa00] tracking-tight">{commodity.symbol}</span>
        <div className={`text-[10px] font-bold px-1.5 rounded-sm ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(commodity.changePercent).toFixed(2)}%
        </div>
      </div>

      <div className="flex items-end justify-between z-10">
        <div className="flex flex-col">
          <span className="text-lg font-black tabular-nums tracking-tighter text-foreground leading-none">
            GHC {commodity.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          {commodity.lastTradeDate && (
            <span className="text-[8px] text-muted-foreground/60 font-mono tabular-nums mt-0.5">
              {commodity.lastTradeDate}
            </span>
          )}
        </div>
        <div className="h-8 w-20 shrink-0">
          <MiniSparkline color={color} data={commodity.history} />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
    </div>
  )
}

export function GroupedTicker({ commodities }: { commodities: Commodity[] }) {
  const itemsPerPage = 5

  const groups = useMemo(() => {
    const result: Commodity[][] = []
    for (let i = 0; i < commodities.length; i += itemsPerPage) {
      result.push(commodities.slice(i, i + itemsPerPage))
    }
    return result
  }, [commodities])

  // Seamless loop: prepend clone of last, append clone of first
  // Render order: [last, g0, g1, ..., gN, first]
  // Start at index 1 (= real g0)
  const renderGroups = useMemo(() => {
    if (groups.length === 0) return []
    if (groups.length === 1) return groups
    return [groups[groups.length - 1], ...groups, groups[0]]
  }, [groups])

  const [index, setIndex] = useState(1)
  const animated = useRef(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Reset starting position when groups change
    setIndex(1)
  }, [groups])

  useEffect(() => {
    if (renderGroups.length <= 1) return
    const timer = setInterval(() => {
      animated.current = true
      setIndex(prev => prev + 1)
    }, 6000)
    return () => clearInterval(timer)
  }, [renderGroups.length])

  // Seamless snap: after landing on the cloned-first at the end, jump to real first
  useEffect(() => {
    if (renderGroups.length <= 1) return
    if (index === renderGroups.length - 1) {
      const t = setTimeout(() => {
        animated.current = false
        setIndex(1)
        // Re-enable animation on next tick so state flush happens first
        requestAnimationFrame(() => { animated.current = true })
      }, 720)
      return () => clearTimeout(t)
    }
  }, [index, renderGroups.length])

  if (!commodities.length) return null

  return (
    <div className="h-24 w-full bg-background border-t border-border flex items-center overflow-hidden">
      {/* BRAND LABEL */}
      <div className="h-full bg-[#ffaa00] text-black px-6 flex items-center gap-3 font-black z-30 shadow-[10px_0_30px_rgba(0,0,0,0.2)] dark:shadow-[10px_0_30px_rgba(0,0,0,0.8)] min-w-[180px]">
        <span className="text-xl italic tracking-tighter">GCX LIVE</span>
        <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
      </div>

      {/* ANIMATED GROUPS */}
      <div className="flex-1 h-full relative overflow-hidden bg-muted/20">
        <div
          ref={containerRef}
          style={{
            transform: `translateY(-${index * 96}px)`,
            transition: animated.current ? 'transform 0.7s ease-in-out' : 'none',
            height: `${renderGroups.length * 96}px`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {renderGroups.map((group, gIdx) => (
            <div key={gIdx} className="h-24 min-w-full flex shrink-0 items-center gap-0">
              {group.map((item) => (
                <TickerBox key={item.symbol} commodity={item} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
