import { NextRequest, NextResponse } from 'next/server'

// Go backend base URL — set GCX_BACKEND_URL in Vercel env vars.
const GCX_BACKEND = process.env.GCX_BACKEND_URL ?? 'http://188.166.159.42:8081'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const name = (formData.get('name') as string | null) ?? ''

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Forward the multipart form to the Go backend which uploads to S3
    const forwardForm = new FormData()
    forwardForm.append('file', file)
    if (name) forwardForm.append('name', name)

    const authHeader = req.headers.get('Authorization') ?? ''

    const res = await fetch(`${GCX_BACKEND}/api/tv/upload/image`, {
      method: 'POST',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: forwardForm,
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('TV image upload backend error:', res.status, text)
      return NextResponse.json({ error: 'Upload failed on backend' }, { status: res.status })
    }

    const result = await res.json()
    // result shape from Go: { success, url, name }
    return NextResponse.json({
      success: true,
      url: result.url,
      name: result.name ?? name ?? file.name,
    })
  } catch (error) {
    console.error('TV image upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
