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
            <img src="/m4shield.png" alt="M4" style={{ width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }} />
            <div>
              <h1
                className="font-bold uppercase leading-none"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.01em', fontSize: 'clamp(14px, 4vw, 22px)' }}
              >
                M4 Soccer Academy
              </h1>
              <p className="uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>
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
