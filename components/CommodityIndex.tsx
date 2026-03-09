'use client'
import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface Commodity {
  symbol: string
  commodity: string
  price: number
  openingPrice: number
  changePercent: number
}

interface Props {
  commodities: Commodity[]
}

// Build mock 30-week history that ends at the computed current index values
function buildHistory(endGCI: number, endOMCI: number, points = 30) {
  const history = []
  // work backward — add noise + slight trend from a "start" value
  const startGCI = endGCI * (0.88 + Math.random() * 0.06)
  const startOMCI = endOMCI * (0.91 + Math.random() * 0.06)

  for (let i = 0; i < points; i++) {
    const t = i / (points - 1)
    const wavGCI = Math.sin(t * Math.PI * 3) * endGCI * 0.04
    const wavOMCI = Math.sin(t * Math.PI * 2.5 + 0.5) * endOMCI * 0.035
    const noiseGCI = (Math.random() - 0.5) * endGCI * 0.03
    const noiseOMCI = (Math.random() - 0.5) * endOMCI * 0.025

    // first point = start, last point = end
    const gci = parseFloat((startGCI + (endGCI - startGCI) * t + wavGCI + noiseGCI).toFixed(2))
    const omci = parseFloat((startOMCI + (endOMCI - startOMCI) * t + wavOMCI + noiseOMCI).toFixed(2))

    const weekLabel = `W${points - i}`
    history.push({ week: weekLabel, gci, omci })
  }
  return history
}

export function CommodityIndex({ commodities }: Props) {
  const { gciCurrent, gciPrev, omciCurrent, omciPrev, history } = useMemo(() => {
    if (commodities.length === 0) {
      const g = 182, o = 166
      return { gciCurrent: g, gciPrev: g + 0.64, omciCurrent: o, omciPrev: o, history: buildHistory(g, o) }
    }

    // GCI: graded commodity index — keyword matches for graded crops
    const gradedKeys = ['MAIZE', 'SOYA', 'RICE', 'SESAME', 'SORGHUM']
    const graded = commodities.filter(c => gradedKeys.some(k => c.commodity.toUpperCase().includes(k)))
    const all = commodities

    const avg = (arr: Commodity[]) =>
      arr.length ? arr.reduce((s, c) => s + c.price, 0) / arr.length : 0
    const avgChange = (arr: Commodity[]) =>
      arr.length ? arr.reduce((s, c) => s + c.changePercent, 0) / arr.length : 0

    const gciRaw = avg(graded.length ? graded : all)
    const omciRaw = avg(all)

    // normalise roughly to GCX's ~130–200 range
    const norm = (v: number) => parseFloat((v / 20).toFixed(2))
    const gciC = norm(gciRaw)
    const omciC = norm(omciRaw)
    const gciChg = avgChange(graded.length ? graded : all)
    const omciChg = avgChange(all)
    const gciP = parseFloat((gciC / (1 + gciChg / 100)).toFixed(2))
    const omciP = parseFloat((omciC / (1 + omciChg / 100)).toFixed(2))

    return {
      gciCurrent: gciC,
      gciPrev: gciP,
      omciCurrent: omciC,
      omciPrev: omciP,
      history: buildHistory(gciC, omciC),
    }
  }, [commodities])

  const gciChange = parseFloat((gciCurrent - gciPrev).toFixed(2))
  const omciChange = parseFloat((omciCurrent - omciPrev).toFixed(2))
  const gciChangePct = gciPrev ? parseFloat(((gciChange / gciPrev) * 100).toFixed(2)) : 0
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-zinc-900/95 border border-zinc-700 px-3 py-2 text-[11px] font-mono">
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color }} className="font-black">
            {p.name}: {p.value?.toFixed(2)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-background text-foreground font-mono">

      {/* LEFT: chart */}
      <div className="flex-[3] flex flex-col px-6 pt-4 pb-3 min-w-0">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="bg-[#ffaa00] text-black text-[9px] font-black px-1.5 py-0.5 uppercase tracking-widest">GCX LIVE</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Commodity Index</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground leading-none">
              GCX Commodity Index
            </h2>
            <p className="text-[9px] text-zinc-500 mt-0.5">Mock data · updates with live prices when API is ready</p>
          </div>
          <div className="text-right text-[10px] text-zinc-500 font-mono">{today}</div>
        </div>

        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gciGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="omciGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffaa00" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ffaa00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="week" hide />
              <YAxis
                stroke="#52525b"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={v => v.toFixed(0)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '4px' }}
              />
              <Area
                type="monotone"
                dataKey="gci"
                name="GCX-GCI"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gciGrad)"
                dot={false}
                activeDot={{ r: 3 }}
              />
              <Area
                type="monotone"
                dataKey="omci"
                name="GCX-OMCI"
                stroke="#ffaa00"
                strokeWidth={2}
                fill="url(#omciGrad)"
                dot={false}
                activeDot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[8px] text-zinc-600 mt-1">
          Fig. The GCX Graded Commodity Index (GCX-GCI) and GCX Open Market Commodity Index (GCX-OMCI) · Source: Ghana Commodity Exchange
        </p>
      </div>

      {/* RIGHT: stats table */}
      <div className="flex-[1.4] border-l border-border flex flex-col px-5 pt-4 pb-3 min-w-0">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#ffaa00] mb-3">Index Summary</div>

        {/* Table header */}
        <div className="grid grid-cols-3 gap-1 text-[9px] font-black uppercase text-zinc-600 border-b border-border pb-1 mb-2">
          <div></div>
          <div className="text-right">GCX-GCI</div>
          <div className="text-right">GCX-OMCI</div>
        </div>

        {/* Rows */}
        {[
          {
            label: `Previous (${new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-GB')})`,
            gci: gciPrev.toFixed(2),
            omci: omciPrev.toFixed(2),
            accent: false,
          },
          {
            label: `Current (${today})`,
            gci: gciCurrent.toFixed(2),
            omci: omciCurrent.toFixed(2),
            accent: true,
          },
          {
            label: 'Change (points)',
            gci: (gciChange >= 0 ? '+' : '') + gciChange,
            omci: (omciChange >= 0 ? '+' : '') + omciChange,
            accent: false,
            colorGci: gciChange >= 0 ? 'text-emerald-400' : 'text-rose-400',
            colorOmci: omciChange >= 0 ? 'text-emerald-400' : 'text-rose-400',
          },
          {
            label: 'Change: Year to Date',
            gci: (gciChangePct >= 0 ? '▲ ' : '▼ ') + Math.abs(gciChangePct).toFixed(2) + '%',
            omci: (omciChange >= 0 ? '▲ ' : '▼ ') + Math.abs(omciChange / omciPrev * 100).toFixed(2) + '%',
            accent: false,
            colorGci: gciChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400',
            colorOmci: omciChange >= 0 ? 'text-emerald-400' : 'text-rose-400',
          },
          {
            label: 'Change: Week to Date',
            gci: (gciChange >= 0 ? '▲ ' : '▼ ') + Math.abs(gciChangePct / 4).toFixed(2) + '%',
            omci: '—',
            accent: false,
            colorGci: gciChange >= 0 ? 'text-emerald-400' : 'text-rose-400',
          },
        ].map((row, i) => (
          <div
            key={i}
            className={`grid grid-cols-3 gap-1 py-2 border-b border-border/50 text-[10px] ${row.accent ? 'bg-[#ffaa00]/5' : ''}`}
          >
            <div className={`font-bold ${row.accent ? 'text-[#ffaa00]' : 'text-zinc-400'} leading-tight pr-1`}>{row.label}</div>
            <div className={`text-right font-black ${(row as any).colorGci ?? 'text-foreground'}`}>{row.gci}</div>
            <div className={`text-right font-black ${(row as any).colorOmci ?? 'text-foreground'}`}>{row.omci}</div>
          </div>
        ))}

        {/* About */}
        <div className="mt-4 space-y-3">
          <div>
            <div className="text-[9px] font-black uppercase text-[#ffaa00] tracking-widest mb-1">About GCX</div>
            <p className="text-[9px] text-zinc-500 leading-relaxed">
              The Ghana Commodity Exchange is a regulated national exchange linking buyers and sellers of listed commodities, assuring market quantity, quality, timely delivery, and settlement.
            </p>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-1">Contact</div>
            <p className="text-[9px] text-zinc-600 leading-relaxed">
              Tel: +233 59 416 4465<br />
              Email: marketdataservices@gcx.com.gh<br />
              gcx.com.gh
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
