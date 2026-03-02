'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'

function TVDisplayCard() {
  const [copied, setCopied] = useState(false)

  const copyLink = () => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/tv-display`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-8 md:col-span-2">
      <h3 className="text-2xl font-black mb-4 text-sky-400">TV Public Display</h3>
      <p className="text-zinc-400 mb-6">Share a full-screen market data display with external clients. Perfect for displaying on bank TVs or large screens. You control content from the admin panel — clients see only the terminal.</p>
      <div className="flex flex-wrap gap-3">
        <a href="/tv-display" target="_blank" className="inline-flex items-center gap-2 bg-sky-600 text-white px-6 py-3 font-black hover:bg-sky-500 transition">
          <ExternalLink size={16} />
          OPEN DISPLAY
        </a>
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-2 bg-zinc-800 text-zinc-200 px-6 py-3 font-black hover:bg-zinc-700 transition border border-zinc-700"
        >
          {copied ? (
            <>
              <Check size={16} className="text-emerald-400" />
              COPIED!
            </>
          ) : (
            <>
              <Copy size={16} />
              COPY LINK
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white px-8 py-12">
      <div className="max-w-6xl mx-auto">
        {/* HERO */}
        <div className="mb-16">
          <img src="/GCX_logo_bk_053950-removebg-preview.png" alt="GCX" className="h-20 w-auto mb-8" />
          <h1 className="text-6xl font-black tracking-tighter mb-4">GCX Market Data</h1>
          <p className="text-xl text-zinc-400 mb-8">Real-time commodity pricing for Ghana Commodity Exchange</p>
        </div>

        {/* FEATURES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-zinc-900 border border-zinc-800 p-8">
            <h3 className="text-2xl font-black mb-4 text-[#ff4500]">Real-Time Terminal</h3>
            <p className="text-zinc-400 mb-6">Financial-grade market data terminal with live prices, high/low tracking, and professional data tables.</p>
            <Link href="/tv" className="inline-block bg-[#ff4500] text-black px-6 py-3 font-black hover:bg-orange-500 transition">
              LAUNCH TV TERMINAL →
            </Link>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8">
            <h3 className="text-2xl font-black mb-4 text-emerald-500">Customizable Dashboard</h3>
            <p className="text-zinc-400 mb-6">Build your own personalized dashboard with draggable market widgets. Organize commodities your way.</p>
            <Link href="/dashboard" className="inline-block bg-emerald-600 text-black px-6 py-3 font-black hover:bg-emerald-500 transition">
              OPEN DASHBOARD →
            </Link>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 md:col-span-2">
            <h3 className="text-2xl font-black mb-4 text-[#ffaa00]">TV Admin — Video &amp; Stream Control</h3>
            <p className="text-zinc-400 mb-6">Manage what plays on the GCX TV Terminal. Add YouTube playlists, HLS live streams, or direct MP4 videos. Set what&apos;s on air instantly from the control panel.</p>
            <Link href="/tv-admin" className="inline-block bg-[#ffaa00] text-black px-6 py-3 font-black hover:bg-amber-400 transition">
              OPEN TV ADMIN →
            </Link>
          </div>

          <TVDisplayCard />
        </div>

        {/* COMMODITIES */}
        <div className="bg-zinc-950 border border-zinc-800 p-8">
          <h2 className="text-3xl font-black mb-8">Tracked Commodities</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div className="flex items-center gap-3"><span className="w-2 h-2 bg-yellow-600 rounded-full" /> Yellow Maize</div>
            <div className="flex items-center gap-3"><span className="w-2 h-2 bg-gray-300 rounded-full" /> White Maize</div>
            <div className="flex items-center gap-3"><span className="w-2 h-2 bg-cyan-500 rounded-full" /> Soya Bean</div>
            <div className="flex items-center gap-3"><span className="w-2 h-2 bg-green-500 rounded-full" /> Rice</div>
            <div className="flex items-center gap-3"><span className="w-2 h-2 bg-pink-500 rounded-full" /> Sesame</div>
            <div className="flex items-center gap-3"><span className="w-2 h-2 bg-amber-500 rounded-full" /> Sorghum</div>
            <div className="flex items-center gap-3 col-span-2 md:col-span-3"><span className="text-zinc-500">...and 50+ more commodity contracts</span></div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-16 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
          <p>Ghana Commodity Exchange • Real-time Market Data</p>
          <p className="mt-2">Data updates every 30 seconds from live Firebase feed</p>
        </div>
      </div>
    </div>
  )
}
