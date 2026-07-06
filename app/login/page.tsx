'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Route based on role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'coach') {
      router.push('/game-card')
    } else {
      router.push('/teams')
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ink px-6">
      {/* Logo / brand */}
      <div className="mb-8 text-center flex flex-col items-center gap-3">
        <img src="/m4shield.png" alt="M4 Shield" style={{ width: 72, height: 72, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }} />
        <div>
          <div
            className="font-display text-4xl font-bold text-white uppercase tracking-wide"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            M4 Soccer Academy
          </div>
          <div className="text-sm text-white/50 uppercase tracking-widest mt-1">
            Club Tracker
          </div>
        </div>
      </div>

      {/* Card */}
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-paper-raised rounded-2xl p-6 shadow-card flex flex-col gap-4"
      >
        <h2
          className="text-2xl font-bold text-ink uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Sign In
        </h2>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm bg-paper text-ink focus:outline-none focus:border-orange"
            placeholder="wtxm4soccer@gmail.com"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm bg-paper text-ink focus:outline-none focus:border-orange"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-orange text-white font-semibold rounded-lg py-3 text-sm uppercase tracking-wider disabled:opacity-50 active:brightness-90"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="mt-8 text-white/30 text-xs text-center">
        Love God · Love People · Play Soccer
      </p>
    </div>
  )
}
