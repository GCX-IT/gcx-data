'use client'

import { FormEvent, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const TOKEN_KEY = 'gcx_auth_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours in seconds

function setAuthToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
  // Also set a cookie so Next.js middleware can read it for server-side protection
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If already logged in (localStorage check), sync cookie then redirect
    const token = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null
    if (token) {
      setAuthToken(token)
      router.replace(searchParams.get('from') ?? '/')
    }
  }, [router, searchParams])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Invalid credentials')
        setLoading(false)
        return
      }

      setAuthToken(data.token)
      router.replace(searchParams.get('from') ?? '/')
    } catch (err) {
      console.error('Login error:', err)
      setError('Login failed, please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center font-mono">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#ffaa00] text-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
              Admin
            </span>
            <h1 className="text-xl font-black tracking-tight uppercase">GCX TV Login</h1>
          </div>
          <p className="text-[11px] text-zinc-500">
            Sign in with your GCX CMS credentials to access the terminal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-[#ffaa00] px-3 py-2 text-[13px] outline-none transition"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-[#ffaa00] px-3 py-2 text-[13px] outline-none transition"
            />
          </div>

          {error && (
            <p className="text-[11px] text-rose-400 font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#ffaa00] hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black py-2 text-[11px] font-black uppercase tracking-widest transition"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
