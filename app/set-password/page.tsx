'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetPasswordPage() {
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [ready, setReady]           = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function exchange() {
      // Parse hash params manually
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken  = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (!error) { setReady(true); return }
      }

      // Fallback: check existing session
      const { data } = await supabase.auth.getSession()
      if (data.session) setReady(true)
    }

    exchange()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check role and redirect
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()

    router.push(profile?.role === 'director' ? '/teams' : '/game-card')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ink px-6">
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

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-paper-raised rounded-2xl p-6 shadow-card flex flex-col gap-4"
      >
        <h2
          className="text-2xl font-bold text-ink uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Set Your Password
        </h2>

        {!ready && (
          <p className="text-sm text-muted">Verifying invite link…</p>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">
            New Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={!ready}
            className="border border-line rounded-lg px-3 py-2 text-sm bg-paper text-ink focus:outline-none focus:border-orange disabled:opacity-50"
            placeholder="••••••••"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">
            Confirm Password
          </label>
          <input
            type="password"
            required
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            disabled={!ready}
            className="border border-line rounded-lg px-3 py-2 text-sm bg-paper text-ink focus:outline-none focus:border-orange disabled:opacity-50"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !ready}
          className="bg-orange text-white font-semibold rounded-lg py-3 text-sm uppercase tracking-wider disabled:opacity-50 active:brightness-90"
        >
          {loading ? 'Saving…' : 'Set Password & Sign In'}
        </button>
      </form>

      <p className="mt-8 text-white/30 text-xs text-center">
        Love God · Love People · Play Soccer
      </p>
    </div>
  )
}
