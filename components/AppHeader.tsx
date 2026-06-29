'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AppHeader() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header style={{ background: '#0A0A0A', color: '#fff' }} className="sticky top-0 z-30">
      <div className="max-w-2xl mx-auto px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/m4shield.png" alt="M4" style={{ width: 38, height: 38, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }} />
            <div>
            <h1
              className="text-2xl font-bold uppercase leading-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.01em' }}
            >
              M4 Soccer Academy
            </h1>
            <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Club Tracker
            </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs uppercase tracking-wider transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
