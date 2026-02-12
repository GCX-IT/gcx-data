'use client'
import React from 'react'
import { format } from 'date-fns'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { FullscreenToggle } from './FullscreenToggle'

// --- SUB-COMPONENTS ---

export function Sparkline({ data, color }: { data: any[], color: string }) {
  return (
    <div className="h-14 w-full opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2} 
            fillOpacity={0.1}
            fill={color}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TerminalHeader({ currentTime }: { currentTime: Date }) {
  return (
    <header className="h-16 bg-background flex items-center justify-between px-8 border-b border-border">
      <div className="flex items-center gap-6">
        <img src="/GCX_logo_bk_053950-removebg-preview.png" alt="GCX Logo" className="h-12 w-auto invert dark:invert-0" />
        <div className="flex flex-col">
          <h1 className="text-lg font-black tracking-tight leading-none text-foreground uppercase">Market Terminal</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-500 font-black tracking-widest uppercase">Live Connectivity</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-4">
          <FullscreenToggle />
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Exchange Time</div>
          <div className="text-2xl font-black tabular-nums tracking-tighter text-foreground/70">
            {format(currentTime, 'HH:mm:ss')} <span className="text-xs text-muted-foreground ml-1">GMT</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export function MarketGrid({ items }: { items: any[] }) {
  return (
    <section className="bg-muted/30 p-3 flex gap-3 overflow-hidden border-b border-border">
      {items.map(item => (
        <div key={item.label} className="flex-1 bg-card p-3 border border-border flex flex-col relative group overflow-hidden">
          <div className="flex justify-between items-start mb-2 z-10">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">{item.label}</span>
              <span className="text-xl font-black tabular-nums tracking-tighter" style={{color: item.color}}>
                {item.price > 0 ? `GHC ${item.price.toLocaleString()}` : '---'}
              </span>
            </div>
            <div className={`text-[10px] font-black tabular-nums ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
            </div>
          </div>
          <Sparkline data={item.history} color={item.color} />
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-border opacity-20 group-hover:opacity-100 transition-opacity" style={{backgroundColor: item.color}} />
        </div>
      ))}
    </section>
  )
}

export function SidePanel({ commodities }: { commodities: any[] }) {
  return (
    <aside className="w-80 bg-background border-l border-border flex flex-col overflow-hidden">
      <div className="p-5 border-b border-border bg-muted/20">
        <h3 className="text-[#ffaa00] text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-center border border-border py-1 bg-card">Watchlist</h3>
        <div className="space-y-3">
          {commodities.slice(0, 10).map(item => (
            <div key={item.symbol} className="flex justify-between items-center group">
              <span className="text-[11px] font-black text-muted-foreground group-hover:text-[#ffaa00] transition-colors">{item.symbol}</span>
              <div className="flex flex-col items-end leading-none">
                <span className="text-[11px] font-black tabular-nums text-foreground">GHC {item.price.toLocaleString()}</span>
                <span className={`text-[9px] font-bold ${item.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-600'}`}>
                  {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
