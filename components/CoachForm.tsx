'use client'

import { useState } from 'react'
import type { Coach, Team } from '@/lib/types'
import { upsertCoach } from '@/lib/supabase/queries'
import { seedCoachCertifications, seedCoachApparel } from '@/lib/supabase/coach-queries'

const ROLES: Coach['role'][] = ['Club Director', 'Head Coach', 'Assistant Coach', 'Team Manager', 'Volunteer']

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
}

type Props = {
  teams: Team[]
  coach?: Coach
  onSave: (coach: Coach) => void
  onCancel: () => void
}

export default function CoachForm({ teams, coach, onSave, onCancel }: Props) {
  const isNew = !coach?.id

  const [form, setForm] = useState({
    first_name: coach?.first_name ?? '',
    last_name:  coach?.last_name  ?? '',
    role:       coach?.role       ?? 'Head Coach' as Coach['role'],
    teams:      coach?.teams      ?? [] as string[],
    email:      coach?.email      ?? '',
    phone:      coach?.phone      ?? '',
    notes:      coach?.notes      ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function toggleTeam(id: string) {
    setForm(f => ({
      ...f,
      teams: f.teams.includes(id) ? f.teams.filter(t => t !== id) : [...f.teams, id],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...(coach?.id ? { id: coach.id } : {}),
        ...form,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
      }
      const saved = await upsertCoach(payload)
      if (isNew) {
        await Promise.all([
          seedCoachCertifications(saved.id),
          seedCoachApparel(saved.id),
        ])
      }
      onSave(saved)
    } catch (err: any) {
      setError(err.message ?? 'Failed to save.')
      setSaving(false)
    }
  }

  const field = 'w-full border rounded-lg px-3 py-2 text-sm bg-white text-ink focus:outline-none focus:border-orange'
  const lbl   = 'text-xs font-semibold uppercase tracking-wider mb-1 block'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>First Name *</label>
          <input className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.first_name}
            onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
        </div>
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>Last Name *</label>
          <input className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.last_name}
            onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className={lbl} style={{ color: '#6F6B62' }}>Role</label>
        <select className={field} style={{ borderColor: '#E3DFD6' }}
          value={form.role}
          onChange={e => setForm(f => ({ ...f, role: e.target.value as Coach['role'] }))}>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {teams.length > 0 && (
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>Teams</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {teams.map(t => {
              const selected = form.teams.includes(t.id)
              return (
                <button key={t.id} type="button" onClick={() => toggleTeam(t.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-colors"
                  style={{
                    background: selected ? '#2C3A52' : '#F6F3EE',
                    color:      selected ? '#fff'    : '#6F6B62',
                    border:     `1px solid ${selected ? '#2C3A52' : '#E3DFD6'}`,
                  }}>
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>Phone</label>
          <input className={field} style={{ borderColor: '#E3DFD6' }}
            placeholder="(xxx) xxx-xxxx"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} />
        </div>
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>Email</label>
          <input type="email" className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className={lbl} style={{ color: '#6F6B62' }}>Notes</label>
        <textarea rows={3} className={field} style={{ borderColor: '#E3DFD6', resize: 'none' }}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase border"
          style={{ borderColor: '#E3DFD6', color: '#6F6B62' }}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase text-white disabled:opacity-50"
          style={{ background: '#2C3A52' }}>
          {saving ? 'Saving…' : isNew ? 'Add Staff' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
