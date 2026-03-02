import { NextRequest, NextResponse } from 'next/server'

const FIREBASE_BASE_URL = 'https://sserp-gcx-webservices-default-rtdb.firebaseio.com/7fc5499a-eccb-4bab-aa52-6ac0269a9dc3/marketdata'

export async function GET() {
  try {
    // Fetch closing prices and symbol metadata in parallel
    const [pricesRes, symbolsRes, historicalRes] = await Promise.all([
      fetch(`${FIREBASE_BASE_URL}/closing_prices.json`, { next: { revalidate: 300 } }),
      fetch(`${FIREBASE_BASE_URL}/commodity_symbols.json`, { next: { revalidate: 3600 } }),
      // Fetch full data dump for historical pricing
      fetch(`${FIREBASE_BASE_URL}.json`, { next: { revalidate: 600 } }).catch(() => null)
    ])

    if (!pricesRes.ok) throw new Error(`Firebase prices error: ${pricesRes.status}`)

    const pricesData = await pricesRes.json()
    const symbolsData = await symbolsRes.json()
    let historicalData: any = {}
    
    // Try to fetch historical data from full dump
    if (historicalRes?.ok) {
      try {
        const fullData = await historicalRes.json()
        // Extract historical records by searching for closingPrices arrays
        for (const [key, val] of Object.entries(fullData)) {
          if (val && typeof val === 'object' && 'symbol' in val && 'closingPrices' in val) {
            const item = val as any
            if (item.closingPrices && Array.isArray(item.closingPrices)) {
              historicalData[item.symbol] = item.closingPrices
            }
          } else if (val && typeof val === 'object') {
            // Search nested entries (like harold@gcx,com,gh)
            for (const [innerKey, innerVal] of Object.entries(val)) {
              if (innerVal && typeof innerVal === 'object' && 'symbol' in innerVal && 'closingPrices' in innerVal) {
                const item = innerVal as any
                if (item.closingPrices && Array.isArray(item.closingPrices)) {
                  historicalData[item.symbol] = item.closingPrices
                }
              }
            }
          }
        }
      } catch { /* ignore historical fetch errors */ }
    }

    // Transform data structure
    const commodities = Object.entries(pricesData.data || {}).map(([key, entry]) => {
      const value = entry as any
      const metadata = (symbolsData as Record<string, any>)[key] || {}
      const close = parseFloat(value.ClosingPrice)
      const open = value.OpeningPrice === '0' || !value.OpeningPrice ? close : parseFloat(value.OpeningPrice)
      const change = close - open
      const changePercent = open !== 0 ? (change / open) * 100 : 0

      return {
        symbol: value.Symbol,
        commodity: value.Commodity,
        deliveryCenter: metadata.DeliveryCentre || 'N/A',
        grade: metadata.Grade || 'N/A',
        price: close,
        closePrice: close,
        changeAmount: change || 0,
        changePercent: changePercent || 0,
        highPrice: parseFloat(value.HighPrice),
        lowPrice: parseFloat(value.LowPrice),
        lastTradeDate: value.LastTradeDate,
        openingPrice: open,
      }
    })

    // Sort by most recent trade date
    const parseDate = (d: string) => { try { return new Date(d).getTime() } catch { return 0 } }
    const sorted = commodities.sort((a, b) => parseDate(b.lastTradeDate) - parseDate(a.lastTradeDate))

    // Build history map: map symbol -> array of { val } for recharts
    const historyMap: Record<string, { val: number }[]> = {}
    for (const [sym, hist] of Object.entries(historicalData)) {
      if (Array.isArray(hist) && hist.length > 0) {
        // Sort by date and convert to chart format
        const sorted = (hist as any[]).sort((a, b) => {
          const aDate = new Date(a.sessionDate || '').getTime()
          const bDate = new Date(b.sessionDate || '').getTime()
          return aDate - bDate
        })
        historyMap[sym] = sorted.map(h => ({ val: parseFloat(h.closing || h.price || 0) }))
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: pricesData.header?.timestamp || new Date().toISOString(),
      count: sorted.length,
      data: sorted,
      historyMap,
    })
  } catch (error) {
    console.error('Error fetching market data:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch market data',
      },
      { status: 500 }
    )
  }
}
