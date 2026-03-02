'use client'
import React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { FullscreenToggle } from './FullscreenToggle'
import { Newspaper } from 'lucide-react'

import { useTheme } from 'next-themes'

export interface NewsItem {
  id: number
  title: string
  slug?: string
  excerpt?: string
  content?: string
  author?: string
  featured_image?: string
  published_at: string
  tags?: string[]
  // legacy news fields
  source_name?: string
  category?: string
  is_breaking?: boolean
}

function formatNewsDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr)
    if (isValid(d)) return format(d, 'dd MMM yyyy')
  } catch { /* ignore */ }
  return ''
}

// --- SUB-COMPONENTS ---

export function Sparkline({ data, color }: { data: any[], color: string }) {
  const { theme } = useTheme()
  const displayColor = (theme === 'light' && (color.toLowerCase() === '#ffffff' || color.toLowerCase() === 'white')) ? '#64748b' : color;

  return (
    <div className="h-14 w-full opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area
            type="monotone"
            dataKey="val"
            stroke={displayColor}
            strokeWidth={2}
            fillOpacity={0.1}
            fill={displayColor}
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
  const { theme } = useTheme()

  return (
    <section className="bg-muted/30 p-3 flex gap-3 overflow-hidden border-b border-border">
      {items.map(item => {
        const displayColor = (theme === 'light' && (item.color.toLowerCase() === '#ffffff' || item.color.toLowerCase() === 'white')) ? '#1e293b' : item.color;

        return (
          <div key={item.label} className="flex-1 bg-card p-3 border border-border flex flex-col relative group overflow-hidden">
            <div className="flex justify-between items-start mb-2 z-10">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">{item.label}</span>
                <span className="text-xl font-black tabular-nums tracking-tighter" style={{ color: displayColor }}>
                  {item.price > 0 ? `GHC ${item.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '---'}
                </span>
                {item.lastTradeDate && (
                  <span className="text-[8px] text-muted-foreground/70 font-mono tabular-nums mt-0.5">
                    {item.lastTradeDate}
                  </span>
                )}
              </div>
              <div className={`text-[10px] font-black tabular-nums ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
              </div>
            </div>
            <Sparkline data={item.history} color={item.color} />
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-border opacity-20 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: displayColor }} />
          </div>
        )
      })}
    </section>
  )
}

export function SidePanel({ news }: { news: NewsItem[] }) {
  return (
    <aside className="w-80 bg-background border-l border-border flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex-shrink-0 flex items-center gap-2">
          <Newspaper size={11} className="text-[#ffaa00]" />
          <h3 className="text-[#ffaa00] text-[10px] font-black uppercase tracking-[0.2em]">GCX News</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {news.length === 0 && (
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest text-center pt-8">No posts</p>
          )}
          {news.map(item => (
            <div
              key={item.id}
              className="group p-2.5 border border-border bg-card/30 hover:bg-muted/30 transition-colors cursor-default"
            >
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {item.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[7px] font-black text-[#ffaa00]/80 uppercase tracking-widest bg-[#ffaa00]/10 px-1 py-0.5">{tag}</span>
                  ))}
                </div>
              )}
              <p className="text-[10px] font-bold text-foreground leading-snug line-clamp-3">{item.title}</p>
              {item.excerpt && (
                <p className="text-[8px] text-muted-foreground leading-snug line-clamp-2 mt-1">
                  {item.excerpt.replace(/&[a-z]+;|<[^>]+>/gi, ' ').trim()}
                </p>
              )}
              <div className="flex items-center justify-between mt-1.5 gap-2">
                {item.author && (
                  <span className="text-[8px] text-muted-foreground/70 truncate">{item.author}</span>
                )}
                <time className="text-[8px] text-muted-foreground/60 tabular-nums ml-auto shrink-0">
                  {formatNewsDate(item.published_at)}
                </time>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
