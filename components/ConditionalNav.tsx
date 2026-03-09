'use client'
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/ThemeToggle"
import { FullscreenToggle } from "@/components/FullscreenToggle"

export function ConditionalNav() {
  const pathname = usePathname()

  if (pathname === '/tv-display' || pathname === '/login') {
    return null
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 z-50 px-8 py-3 flex gap-8 items-center h-16">
      <img src="/GCX_logo_bk_053950-removebg-preview.png" alt="GCX" className="h-10 w-auto invert dark:invert-0" />
      <div className="flex gap-8 flex-1">
        <Link href="/" className="text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition uppercase tracking-tight">Home</Link>
        <Link href="/tv" className="text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition uppercase tracking-tight">TV Terminal</Link>
        <Link href="/tv-admin" className="text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition uppercase tracking-tight">TV Admin</Link>
      </div>
      <div className="flex items-center gap-2">
        <FullscreenToggle />
        <ThemeToggle />
      </div>
    </nav>
  )
}

export function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // No padding where we hide the navbar
  if (pathname === '/tv-display' || pathname === '/login') {
    return <>{children}</>
  }

  return <main className="pt-16">{children}</main>
}
