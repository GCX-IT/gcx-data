import { NextRequest, NextResponse } from 'next/server'

const GCX_BACKEND = process.env.GCX_BACKEND_URL ?? 'http://188.166.159.42:8081'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const res = await fetch(`${GCX_BACKEND}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('Auth login error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 500 },
    )
  }
}

