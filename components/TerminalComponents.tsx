'use client'
import React, { useState, useEffect, useMemo } from 'react'
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
  const [page, setPage] = useState(0)
  
  const sortedNews = useMemo(() => {
    return [...news].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
  }, [news])

  const ITEMS_PER_PAGE = 5

  useEffect(() => {
    if (sortedNews.length <= ITEMS_PER_PAGE) return
    const timer = setInterval(() => {
      setPage(p => ((p + 1) * ITEMS_PER_PAGE >= sortedNews.length ? 0 : p + 1))
    }, 10000)
    return () => clearInterval(timer)
  }, [sortedNews.length])

  useEffect(() => {
    setPage(0)
  }, [news])

  const visibleNews = sortedNews.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  // Empty slots to maintain grid structure perfectly even if page has fewer items
  const displayItems = [...visibleNews]
  while (displayItems.length < ITEMS_PER_PAGE && displayItems.length > 0) {
    displayItems.push({ id: -displayItems.length, title: '', published_at: '' } as unknown as NewsItem)
  }

  return (
    <aside className="w-full h-full min-w-0 bg-background border-l border-border flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper size={11} className="text-[#ffaa00]" />
            <h3 className="text-[#ffaa00] text-[10px] font-black uppercase tracking-[0.2em]">GCX News</h3>
          </div>
          {sortedNews.length > ITEMS_PER_PAGE && (
             <div className="flex gap-1.5">
               {Array.from({ length: Math.ceil(sortedNews.length / ITEMS_PER_PAGE) }).map((_, i) => (
                 <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === page ? 'bg-[#ffaa00]' : 'bg-border'}`} />
               ))}
             </div>
          )}
        </div>
        <div className="flex-1 p-3 font-sans h-full">
          {sortedNews.length === 0 && (
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest text-center pt-8">No posts</p>
          )}
          {sortedNews.length > 0 && (
            <div className="h-full grid grid-rows-5 gap-3">
              {displayItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`group flex flex-col px-4 py-2 border-l-[3px] transition-all overflow-hidden ${item.title ? 'border-border bg-gradient-to-r from-muted/20 to-transparent hover:border-[#ffaa00] hover:bg-muted/40 cursor-default' : 'border-transparent opacity-0'}`}
                >
                  {item.title && (
                    <div className="flex-1 flex flex-col justify-center h-full">
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-[1vh] shrink-0">
                          {item.tags.slice(0, 1).map(tag => (
                            <span key={tag} className="text-[1vh] font-black text-[#ffaa00]/80 uppercase tracking-widest bg-[#ffaa00]/10 px-[0.5vh] py-[0.25vh] leading-none">{tag}</span>
                          ))}
                        </div>
                      )}
                      <p className="text-[1.8vh] font-bold text-foreground leading-snug line-clamp-2 break-words shrink-0">{item.title}</p>
                      {item.excerpt && (
                        <p className="text-[1.4vh] text-foreground/85 leading-relaxed line-clamp-2 mt-[1vh] break-words shrink-0">
                          {item.excerpt.replace(/&[a-z]+;|<[^>]+>/gi, ' ').trim()}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-[1vh] gap-2 shrink-0">
                        {item.author && (
                          <span className="text-[1.2vh] text-foreground/75 truncate leading-none">{item.author}</span>
                        )}
                        <time className="text-[1.2vh] text-foreground/70 tabular-nums ml-auto shrink-0 leading-none">
                          {formatNewsDate(item.published_at)}
                        </time>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
