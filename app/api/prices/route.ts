import { NextRequest, NextResponse } from 'next/server'

const FIREBASE_BASE_URL = 'https://sserp-gcx-webservices-default-rtdb.firebaseio.com/7fc5499a-eccb-4bab-aa52-6ac0269a9dc3/marketdata'

export async function GET() {
  try {
    // Fetch closing prices and symbol metadata in parallel
    const [pricesRes, symbolsRes] = await Promise.all([
      fetch(`${FIREBASE_BASE_URL}/closing_prices.json`, { next: { revalidate: 300 } }),
      fetch(`${FIREBASE_BASE_URL}/commodity_symbols.json`, { next: { revalidate: 3600 } })
    ])

    if (!pricesRes.ok) throw new Error(`Firebase prices error: ${pricesRes.status}`)

    const pricesData = await pricesRes.json()
    const symbolsData = await symbolsRes.json()

    // transform data structure
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
    const sorted = commodities.sort((a, b) => {
      // Custom date parser for DD-MMM-YYYY or common formats
      const parseDate = (d: string) => {
        try { return new Date(d).getTime() } catch { return 0 }
      }
      return parseDate(b.lastTradeDate) - parseDate(a.lastTradeDate)
    })

    return NextResponse.json({
      success: true,
      timestamp: pricesData.header?.timestamp || new Date().toISOString(),
      count: sorted.length,
      data: sorted,
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
