import { NextResponse } from 'next/server'

// Go backend base URL — set GCX_BACKEND_URL in Vercel env vars.
const GCX_BACKEND = process.env.GCX_BACKEND_URL ?? 'http://188.166.159.42:8081'

export async function GET() {
  try {
    // Fetch blog posts and news ticker items in parallel with higher limits
    const [postsRes, newsRes] = await Promise.allSettled([
      fetch(`${GCX_BACKEND}/api/posts?limit=100`, {
        next: { revalidate: 300 },
        headers: { 'Accept': 'application/json' },
      }),
      fetch(`${GCX_BACKEND}/api/news?limit=100`, {
        next: { revalidate: 120 },
        headers: { 'Accept': 'application/json' },
      }),
    ])

    type Item = { id: number; title: string; published_at: string; [k: string]: unknown }
    let items: Item[] = []

    if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
      const d = await postsRes.value.json()
      const posts: Item[] = Array.isArray(d) ? d : (d.data ?? [])
      // Normalise blog post fields to match NewsItem shape
      items.push(...posts.map((p: Item) => ({ ...p, _source: 'blog' })))
    }

    if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
      const d = await newsRes.value.json()
      const news: Item[] = Array.isArray(d) ? d : (d.data ?? [])
      // Map news ticker fields: title -> title, content -> excerpt, source_name -> author
      items.push(...news.map((n: Item) => ({
        id: (n.id as number) + 1_000_000, // avoid id collision with posts
        title: n.title,
        excerpt: typeof n.content === 'string' ? n.content.slice(0, 200) : '',
        author: n.source_name as string | undefined,
        category: n.category as string | undefined,
        tags: n.is_breaking ? ['Breaking'] : [],
        published_at: n.published_at,
        is_breaking: n.is_breaking,
        _source: 'news',
      })))
    }

    // Sort by published_at descending (most recent first)
    items.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())

    // Limit to the 5 most recent combined blog+news items
    const limited = items.slice(0, 5)

    return NextResponse.json({ success: true, data: limited, count: limited.length })
  } catch (error) {
    return NextResponse.json({
      success: false,
      data: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch',
    })
  }
}
