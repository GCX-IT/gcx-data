'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface Commodity {
  symbol: string
  commodity: string
  price: number
  changePercent: number
  highPrice?: number
  lowPrice?: number
}

function MiniSparkline({ color }: { color: string }) {
  // Generate random stable-ish path
  const data = useMemo(() => Array.from({ length: 10 }).map((_, i) => ({
    val: 50 + Math.random() * 30 * (i % 2 === 0 ? 1 : -1)
  })), [])

  return (
    <div className="h-full w-full opacity-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
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
    <div className="w-[280px] h-full flex flex-col justify-center border-r border-border bg-card/40 hover:bg-muted/50 transition-colors px-6 group relative overflow-hidden">
      <div className="flex items-center justify-between mb-1 z-10">
        <span className="text-xs font-black text-[#ffaa00] tracking-tight">{commodity.symbol}</span>
        <div className={`text-[10px] font-bold px-1.5 rounded-sm ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(commodity.changePercent).toFixed(2)}%
        </div>
      </div>
      
      <div className="flex items-end justify-between z-10">
        <span className="text-xl font-black tabular-nums tracking-tighter text-foreground">
          GHC {commodity.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
        <div className="h-8 w-24">
          <MiniSparkline color={color} />
        </div>
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
    </div>
  )
}

export function GroupedTicker({ commodities }: { commodities: Commodity[] }) {
  const [index, setIndex] = useState(0)
  const itemsPerPage = 5
  
  const groups = useMemo(() => {
    const result = []
    for (let i = 0; i < commodities.length; i += itemsPerPage) {
      result.push(commodities.slice(i, i + itemsPerPage))
    }
    return result
  }, [commodities])

  useEffect(() => {
    if (groups.length <= 1) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % groups.length)
    }, 6000) // Switch every 6 seconds
    return () => clearInterval(timer)
  }, [groups])

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
            className="flex transition-all duration-700 ease-in-out"
            style={{ 
              transform: `translateY(-${index * 96}px)`,
              height: `${groups.length * 96}px`,
              flexDirection: 'column' 
            }}
          >
            {groups.map((group, gIdx) => (
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
