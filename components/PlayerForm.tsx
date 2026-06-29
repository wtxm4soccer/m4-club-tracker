'use client'

import { useState } from 'react'
import type { Player, Team, PlayerStatus } from '@/lib/types'
import { POSITIONS } from '@/lib/types'
import { upsertPlayer, seedPlayerDocuments, seedPlayerApparel } from '@/lib/supabase/queries'

const STATUSES: PlayerStatus[] = ['Confirmed', 'Prospective', 'Offered', 'Not Selected', 'Declined', 'Archived']

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
}

type Props = {
  teams: Team[]
  player?: Player
  onSave: (player: Player) => void
  onCancel: () => void
}

export default function PlayerForm({ teams, player, onSave, onCancel }: Props) {
  const isNew = !player?.id

  const [form, setForm] = useState({
    first_name:        player?.first_name        ?? '',
    last_name:         player?.last_name         ?? '',
    number:            player?.number            ?? '',
    dob:               player?.dob               ?? '',
    team_id:           player?.team_id           ?? '',
    status:            player?.status            ?? 'Prospective' as PlayerStatus,
    positions:         player?.positions         ?? [] as string[],
    parent_name:       player?.parent_name       ?? '',
    parent_phone:      player?.parent_phone      ?? '',
    parent_email:      player?.parent_email      ?? '',
    emergency_contact: player?.emergency_contact ?? '',
    emergency_phone:   player?.emergency_phone   ?? '',
    notes:             player?.notes             ?? '',
    team_reach:        player?.team_reach        ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function togglePosition(code: string) {
    setForm(f => ({
      ...f,
      positions: f.positions.includes(code)
        ? f.positions.filter(p => p !== code)
        : [...f.positions, code],
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
        ...(player?.id ? { id: player.id } : {}),
        ...form,
        team_id: form.team_id || null,
        number:  form.number  || null,
        dob:     form.dob     || null,
      }
      const saved = await upsertPlayer(payload)
      if (isNew) {
        await Promise.all([
          seedPlayerDocuments(saved.id),
          seedPlayerApparel(saved.id),
        ])
      }
      onSave(saved)
    } catch (err: any) {
      setError(err.message ?? 'Failed to save.')
      setSaving(false)
    }
  }

  const field = 'w-full border rounded-lg px-3 py-2 text-sm bg-white text-ink focus:outline-none focus:border-orange'
  const label = 'text-xs font-semibold uppercase tracking-wider mb-1 block'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} style={{ color: '#6F6B62' }}>First Name *</label>
          <input
            className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.first_name}
            onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
          />
        </div>
        <div>
          <label className={label} style={{ color: '#6F6B62' }}>Last Name *</label>
          <input
            className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.last_name}
            onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
          />
        </div>
      </div>

      {/* Number + DOB */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} style={{ color: '#6F6B62' }}>Jersey #</label>
          <input
            className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.number}
            onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
          />
        </div>
        <div>
          <label className={label} style={{ color: '#6F6B62' }}>Date of Birth</label>
          <input
            type="date"
            className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.dob}
            onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
          />
        </div>
      </div>

      {/* Team + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} style={{ color: '#6F6B62' }}>Team</label>
          <select
            className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.team_id}
            onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}
          >
            <option value="">Unassigned</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label} style={{ color: '#6F6B62' }}>Status</label>
          <select
            className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as PlayerStatus }))}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Positions */}
      <div>
        <label className={label} style={{ color: '#6F6B62' }}>Positions</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {POSITIONS.map(({ code, label: lbl }) => {
            const selected = form.positions.includes(code)
            return (
              <button
                key={code}
                type="button"
                onClick={() => togglePosition(code)}
                className="px-2 py-1 rounded text-xs font-bold uppercase transition-colors"
                style={{
                  background: selected ? '#FE5A01' : '#F6F3EE',
                  color:      selected ? '#fff'    : '#6F6B62',
                  border:     `1px solid ${selected ? '#FE5A01' : '#E3DFD6'}`,
                }}
              >
                {code}
              </button>
            )
          })}
        </div>
      </div>

      {/* Parent contact */}
      <div className="border-t pt-4" style={{ borderColor: '#E3DFD6' }}>
        <p className={label} style={{ color: '#6F6B62' }}>Parent / Guardian</p>
        <div className="flex flex-col gap-3">
          <input
            placeholder="Parent name"
            className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.parent_name}
            onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))}
          />
          <input
            placeholder="(xxx) xxx-xxxx"
            className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.parent_phone}
            onChange={e => setForm(f => ({ ...f, parent_phone: formatPhone(e.target.value) }))}
          />
          <input
            type="email"
            placeholder="Email"
            className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.parent_email}
            onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))}
          />
        </div>
      </div>

      {/* Emergency contact */}
      <div>
        <p className={label} style={{ color: '#6F6B62' }}>Emergency Contact</p>
        <div className="flex flex-col gap-3">
          <input
            placeholder="Name"
            className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.emergency_contact}
            onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))}
          />
          <input
            placeholder="(xxx) xxx-xxxx"
            className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.emergency_phone}
            onChange={e => setForm(f => ({ ...f, emergency_phone: formatPhone(e.target.value) }))}
          />
        </div>
      </div>

      {/* Notes + TeamReach */}
      <div>
        <label className={label} style={{ color: '#6F6B62' }}>Notes</label>
        <textarea
          rows={3}
          className={field} style={{ borderColor: '#E3DFD6', resize: 'none' }}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.team_reach}
          onChange={e => setForm(f => ({ ...f, team_reach: e.target.checked }))}
          className="w-4 h-4 accent-orange"
        />
        <span className="text-sm" style={{ color: '#0A0A0A' }}>Added to TeamReach group</span>
      </label>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider border"
          style={{ borderColor: '#E3DFD6', color: '#6F6B62' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: '#FE5A01' }}
        >
          {saving ? 'Saving…' : isNew ? 'Add Player' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
