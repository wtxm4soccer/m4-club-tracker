'use client'

import { useEffect, useState } from 'react'
import type { Coach, Team } from '@/lib/types'
import { getTeams, getCoaches, deleteCoach } from '@/lib/supabase/queries'
import {
  getCertifications, upsertCertification, CERT_TYPES,
  type Certification,
} from '@/lib/supabase/coach-queries'
import Modal from '@/components/Modal'
import CoachForm from '@/components/CoachForm'

const ROLE_COLORS: Record<Coach['role'], string> = {
  'Club Director':    '#FE5A01',
  'Head Coach':       '#2C3A52',
  'Assistant Coach':  '#6B4FA0',
  'Volunteer':        '#6F6B62',
}

const CERT_STATUS_COLORS = {
  not_started: '#B9B4A8',
  in_progress: '#D98E04',
  complete:    '#2F8F54',
}

const CERT_STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete:    'Complete',
}

export default function CoachesPage() {
  const [teams,   setTeams]   = useState<Team[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [certs,   setCerts]   = useState<Record<string, Certification[]>>({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const [showAddModal, setShowAddModal] = useState(false)
  const [editCoach,    setEditCoach]    = useState<Coach | null>(null)
  const [certCoachId,  setCertCoachId]  = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getTeams(), getCoaches()]).then(async ([t, c]) => {
      setTeams(t)
      setCoaches(c)
      // Load all certs upfront so badges show without opening each card
      const certEntries = await Promise.all(c.map(coach => getCertifications(coach.id).then(data => [coach.id, data] as const)))
      setCerts(Object.fromEntries(certEntries))
      setLoading(false)
    })
  }, [])

  async function loadCerts(coachId: string) {
    if (certs[coachId]) return
    const data = await getCertifications(coachId)
    setCerts(prev => ({ ...prev, [coachId]: data }))
  }

  function toggleExpand(coachId: string) {
    const opening = !expanded[coachId]
    setExpanded(prev => ({ ...prev, [coachId]: opening }))
    if (opening) loadCerts(coachId)
  }

  function teamNames(teamIds: string[]) {
    return teamIds
      .map(id => teams.find(t => t.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  function handleCoachSaved(coach: Coach) {
    setCoaches(prev => {
      const idx = prev.findIndex(c => c.id === coach.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = coach; return next }
      return [...prev, coach].sort((a, b) => a.last_name.localeCompare(b.last_name))
    })
    setShowAddModal(false)
    setEditCoach(null)
  }

  async function handleDeleteCoach(coach: Coach) {
    if (!confirm(`Delete ${coach.first_name} ${coach.last_name}?`)) return
    await deleteCoach(coach.id)
    setCoaches(prev => prev.filter(c => c.id !== coach.id))
  }

  async function handleCertChange(
    coachId: string,
    certType: Certification['cert_type'],
    status: Certification['status'],
  ) {
    const saved = await upsertCertification({ coach_id: coachId, cert_type: certType, status })
    setCerts(prev => {
      const existing = prev[coachId] ?? []
      const idx = existing.findIndex(c => c.cert_type === certType)
      if (idx >= 0) {
        const next = [...existing]; next[idx] = saved; return { ...prev, [coachId]: next }
      }
      return { ...prev, [coachId]: [...existing, saved] }
    })
  }

  function certStatus(coachId: string, certType: string): Certification['status'] {
    return certs[coachId]?.find(c => c.cert_type === certType)?.status ?? 'not_started'
  }

  function allCertsComplete(coachId: string) {
    const c = certs[coachId]
    if (!c) return false
    return CERT_TYPES.every(type => c.find(cert => cert.cert_type === type)?.status === 'complete')
  }

  const [sendingAgreement, setSendingAgreement] = useState<string | null>(null)
  const [agreementMsg, setAgreementMsg] = useState<Record<string, string>>({})

  async function handleSendAgreement(coach: Coach) {
    if (!coach.email) { alert('Add an email to this coach first.'); return }
    setSendingAgreement(coach.id)
    const res = await fetch('/api/docuseal/send-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachId: coach.id, coachName: `${coach.first_name} ${coach.last_name}`, email: coach.email }),
    })
    setSendingAgreement(null)
    if (res.ok) {
      setCoaches(prev => prev.map(c => c.id === coach.id ? { ...c, agreement_status: 'sent', agreement_sent_at: new Date().toISOString() } : c))
      setAgreementMsg(prev => ({ ...prev, [coach.id]: 'Sent!' }))
      setTimeout(() => setAgreementMsg(prev => ({ ...prev, [coach.id]: '' })), 3000)
    } else {
      alert('Failed to send agreement.')
    }
  }

  if (loading) return <div className="px-5 pt-8 text-sm" style={{ color: '#6F6B62' }}>Loading…</div>

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-3" style={{ background: '#F6F3EE' }}>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-3xl font-bold uppercase"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}
          >
            Coaches
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-sm font-semibold uppercase tracking-wider px-4 py-2 rounded-xl text-white"
            style={{ background: '#2C3A52' }}
          >
            + Coach
          </button>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-3 rounded-xl overflow-hidden"
          style={{ background: '#E3DFD6', gap: 1 }}
        >
          {[
            { num: coaches.length, lbl: 'Staff' },
            { num: coaches.filter(c => c.role === 'Head Coach').length,    lbl: 'Head' },
            { num: coaches.filter(c => c.role === 'Assistant Coach').length, lbl: 'Asst' },
          ].map(({ num, lbl }) => (
            <div key={lbl} className="text-center py-3" style={{ background: '#fff' }}>
              <div
                className="text-2xl font-bold leading-none"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}
              >
                {num}
              </div>
              <div className="text-xs uppercase tracking-wider mt-1" style={{ color: '#6F6B62' }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable coach cards */}
      <div className="flex flex-col gap-3 px-5 pt-3 pb-4">
        {coaches.map(coach => {
          const isOpen = expanded[coach.id]
          const coachCerts = certs[coach.id] ?? []
          const certsLoaded = coachCerts.length > 0

          return (
            <div
              key={coach.id}
              className="rounded-xl overflow-hidden"
              style={{
                background: '#fff',
                boxShadow: '0 1px 2px rgba(21,21,26,0.06), 0 4px 14px rgba(21,21,26,0.06)',
                borderLeft: `4px solid ${ROLE_COLORS[coach.role]}`,
              }}
            >
              {/* Collapsed row */}
              <button
                className="w-full px-4 py-3 flex items-center gap-3 text-left"
                onClick={() => toggleExpand(coach.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: '#0A0A0A' }}>
                    {coach.first_name} {coach.last_name}
                  </div>
                  <div className="text-xs" style={{ color: '#6F6B62' }}>
                    {coach.role}
                    {teamNames(coach.teams) && ` · ${teamNames(coach.teams)}`}
                  </div>
                </div>

                {/* Cert completion indicator */}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={allCertsComplete(coach.id)
                    ? { background: '#2F8F5422', color: '#2F8F54' }
                    : { background: '#D98E0422', color: '#D98E04' }}>
                  {allCertsComplete(coach.id) ? '✓ Certified' : 'Pending'}
                </span>

                <span className="text-xs shrink-0" style={{ color: '#6F6B62' }}>
                  {isOpen ? '▲' : '▼'}
                </span>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t px-4 py-3" style={{ borderColor: '#E3DFD6' }}>
                  {/* Contact info */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                    {coach.phone && (
                      <>
                        <span style={{ color: '#6F6B62' }}>Phone</span>
                        <a href={`tel:${coach.phone}`} style={{ color: '#FE5A01' }}>{coach.phone}</a>
                      </>
                    )}
                    {coach.email && (
                      <>
                        <span style={{ color: '#6F6B62' }}>Email</span>
                        <a href={`mailto:${coach.email}`} className="truncate" style={{ color: '#FE5A01' }}>{coach.email}</a>
                      </>
                    )}
                    {coach.notes && (
                      <>
                        <span style={{ color: '#6F6B62' }}>Notes</span>
                        <span style={{ color: '#0A0A0A' }}>{coach.notes}</span>
                      </>
                    )}
                  </div>

                  {/* Certifications */}
                  <div className="mb-3">
                    <p
                      className="text-xs font-bold uppercase tracking-wider mb-2"
                      style={{ color: '#6F6B62' }}
                    >
                      Certifications
                    </p>
                    <div className="flex flex-col gap-2">
                      {CERT_TYPES.map(certType => {
                        const status = certStatus(coach.id, certType)
                        return (
                          <div key={certType} className="flex items-center justify-between gap-2">
                            <span className="text-xs flex-1" style={{ color: '#0A0A0A' }}>{certType}</span>
                            <select
                              value={status}
                              onChange={e => handleCertChange(coach.id, certType, e.target.value as Certification['status'])}
                              className="text-xs border rounded-lg px-2 py-1 focus:outline-none"
                              style={{
                                borderColor: CERT_STATUS_COLORS[status],
                                color: CERT_STATUS_COLORS[status],
                                background: CERT_STATUS_COLORS[status] + '18',
                                fontWeight: 600,
                              }}
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="complete">Complete</option>
                            </select>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Agreement */}
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6F6B62' }}>
                      Volunteer Agreement
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={
                        coach.agreement_status === 'signed' ? { background: '#2F8F5422', color: '#2F8F54' } :
                        coach.agreement_status === 'sent'   ? { background: '#D98E0422', color: '#D98E04' } :
                                                              { background: '#E3DFD6',   color: '#B9B4A8' }
                      }>
                        {coach.agreement_status === 'signed' ? '✓ Signed' :
                         coach.agreement_status === 'sent'   ? 'Awaiting Signature' : 'Not Sent'}
                      </span>
                      <button
                        onClick={() => handleSendAgreement(coach)}
                        disabled={sendingAgreement === coach.id || coach.agreement_status === 'signed'}
                        className="py-1.5 px-3 rounded-lg text-xs font-semibold uppercase disabled:opacity-50"
                        style={{ background: '#2C3A52', color: '#fff' }}
                      >
                        {sendingAgreement === coach.id ? 'Sending…' :
                         agreementMsg[coach.id] ? agreementMsg[coach.id] :
                         coach.agreement_status === 'sent' ? 'Resend' : 'Send Form'}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setEditCoach(coach)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold uppercase border"
                      style={{ borderColor: '#E3DFD6', color: '#0A0A0A' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCoach(coach)}
                      className="py-2 px-4 rounded-lg text-xs font-semibold uppercase"
                      style={{ color: '#E05A3A', background: '#FEF0EC' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {coaches.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: '#6F6B62' }}>
            No coaches yet. Tap <strong>+ Coach</strong> to add one.
          </p>
        )}
      </div>

      {/* Add modal */}
      {showAddModal && (
        <Modal title="Add Coach" onClose={() => setShowAddModal(false)}>
          <CoachForm
            teams={teams}
            onSave={handleCoachSaved}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editCoach && (
        <Modal title="Edit Coach" onClose={() => setEditCoach(null)}>
          <CoachForm
            teams={teams}
            coach={editCoach}
            onSave={handleCoachSaved}
            onCancel={() => setEditCoach(null)}
          />
        </Modal>
      )}
    </div>
  )
}
