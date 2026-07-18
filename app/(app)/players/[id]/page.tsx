'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Player, Team, Document, Assessment, Apparel } from '@/lib/types'
import { STATUS_COLORS, POSITIONS } from '@/lib/types'
import { getPlayer, getTeams, upsertPlayer, deletePlayer } from '@/lib/supabase/queries'
import {
  getPlayerDocuments, upsertDocument,
  getPlayerAssessments, upsertAssessment, deleteAssessment,
  getPlayerApparel, upsertApparel,
} from '@/lib/supabase/player-detail-queries'
import Modal from '@/components/Modal'

type Tab = 'info' | 'documents' | 'assessments' | 'apparel'

const DOC_TYPES: Document['doc_type'][] = [
  'Waiver', 'Medical Release', 'Family Code of Conduct',
  'Player Participation', 'Proof of Birth',
]

const APPAREL_ITEMS: Apparel['item'][] = ['Shirt', 'Shorts', 'Pants', 'Jacket']

const DOC_STATUS_COLORS = {
  not_sent: '#B9B4A8',
  sent:     '#D98E04',
  signed:   '#2F8F54',
}

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [player,      setPlayer]      = useState<Player | null>(null)
  const [teams,       setTeams]       = useState<Team[]>([])
  const [documents,   setDocuments]   = useState<Document[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [apparel,     setApparel]     = useState<Apparel[]>([])
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState<Tab>('info')

  const [showAssessmentForm, setShowAssessmentForm] = useState(false)

  useEffect(() => {
    Promise.all([
      getPlayer(id),
      getTeams(),
      getPlayerDocuments(id),
      getPlayerAssessments(id),
      getPlayerApparel(id),
    ]).then(([p, t, docs, asmts, app]) => {
      setPlayer(p)
      setTeams(t)
      setDocuments(docs)
      setAssessments(asmts)
      setApparel(app)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="px-5 pt-8 text-sm" style={{ color: '#6F6B62' }}>Loading…</div>
  if (!player)  return <div className="px-5 pt-8 text-sm" style={{ color: '#E05A3A' }}>Player not found.</div>

  const teamName = teams.find(t => t.id === player.team_id)?.name ?? 'Unassigned'

  return (
    <div className="flex flex-col min-h-full">
      {/* Player header */}
      <div className="px-5 pt-4 pb-0" style={{ background: '#fff', borderBottom: '1px solid #E3DFD6' }}>
        <button
          onClick={() => router.back()}
          className="text-xs uppercase tracking-wider mb-3 flex items-center gap-1"
          style={{ color: '#6F6B62' }}
        >
          ← Players
        </button>

        <div className="flex items-start gap-4 pb-4">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-bold"
            style={{
              background: '#F6F3EE',
              fontFamily: "'Barlow Condensed', sans-serif",
              color: '#FE5A01',
              border: '1px solid #E3DFD6',
            }}
          >
            {player.first_name[0]}{player.last_name[0]}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-2xl font-bold uppercase leading-none"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}
              >
                {player.first_name} {player.last_name}
              </h1>
              {player.number && (
                <span
                  className="text-lg font-bold"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FE5A01' }}
                >
                  #{player.number}
                </span>
              )}
            </div>
            <div className="text-xs mt-1" style={{ color: '#6F6B62' }}>
              {teamName}
              {player.positions.length > 0 && ` · ${player.positions.join(', ')}`}
            </div>
            <span
              className="inline-block mt-1.5 text-xs font-bold uppercase px-2 py-0.5 rounded-full"
              style={{
                background: STATUS_COLORS[player.status] + '22',
                color: STATUS_COLORS[player.status],
              }}
            >
              {player.status}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {([['info','Info'], ['documents','Docs'], ['assessments','Assess'], ['apparel','Apparel']] as [Tab,string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 font-semibold uppercase tracking-wider border-b-2 transition-colors"
              style={{
                borderColor: activeTab === tab ? '#FE5A01' : 'transparent',
                color:       activeTab === tab ? '#FE5A01' : '#6F6B62',
                fontFamily:  "'Barlow Condensed', sans-serif",
                fontSize: 11,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 px-5 py-4">
        {activeTab === 'info'        && <InfoTab        player={player} teams={teams} onSave={setPlayer} onDelete={() => router.replace('/players')} />}
        {activeTab === 'documents'   && <DocumentsTab   player={player} team={teams.find(t => t.id === player.team_id) ?? null} documents={documents} setDocuments={setDocuments} />}
        {activeTab === 'assessments' && <AssessmentsTab playerId={id} assessments={assessments} setAssessments={setAssessments} showForm={showAssessmentForm} setShowForm={setShowAssessmentForm} />}
        {activeTab === 'apparel'     && <ApparelTab     playerId={id} apparel={apparel} setApparel={setApparel} />}
      </div>
    </div>
  )
}

// ─── Info Tab ────────────────────────────────────────────────────────────────
function InfoTab({ player, teams, onSave, onDelete }: { player: Player; teams: Team[]; onSave: (p: Player) => void; onDelete: () => void }) {
  const [form, setForm]         = useState({ ...player, team_id: player.team_id ?? '' })
  const [saving, setSaving]     = useState(false)
  const [saved,  setSaved]      = useState(false)
  const [sharing, setSharing]   = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }

  function togglePosition(code: string) {
    setForm(f => ({
      ...f,
      positions: f.positions.includes(code)
        ? f.positions.filter(p => p !== code)
        : [...f.positions, code],
    }))
  }

  async function handleSave() {
    setSaving(true)
    const updated = await upsertPlayer({ ...form, team_id: form.team_id || null })
    onSave(updated)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleShareCalendar() {
    const team = teams.find(t => t.id === form.team_id)
    if (!team?.calendar_url) { alert('No calendar URL set for this team. Edit the team to add one.'); return }
    if (!player.parent_email && !player.parent2_email) { alert('No parent email on file. Add one above first.'); return }
    setSharing(true); setShareMsg('')
    const sends = []
    const playerName = `${player.first_name} ${player.last_name}`
    if (player.parent_email) {
      sends.push(fetch('/api/email/share-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail: player.parent_email,
          parentName:  player.parent_name ?? '',
          playerName,
          teamName:    team.name,
          calendarUrl: team.calendar_url,
        }),
      }))
    }
    if (player.parent2_email) {
      sends.push(fetch('/api/email/share-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail: player.parent2_email,
          parentName:  player.parent2_name ?? '',
          playerName,
          teamName:    team.name,
          calendarUrl: team.calendar_url,
        }),
      }))
    }
    const results = await Promise.all(sends)
    setSharing(false)
    setShareMsg(results.every(r => r.ok) ? '✓ Calendar sent!' : 'Some failed to send')
    setTimeout(() => setShareMsg(''), 4000)
  }

  const field = 'w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none'
  const lbl   = 'text-xs font-semibold uppercase tracking-wider mb-1 block'

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>First Name</label>
          <input className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.first_name}
            onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
        </div>
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>Last Name</label>
          <input className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.last_name}
            onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>Jersey #</label>
          <input className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.number ?? ''}
            onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
        </div>
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>Date of Birth</label>
          <input type="date" className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.dob ?? ''}
            onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>Team</label>
          <select className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.team_id}
            onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}>
            <option value="">Unassigned</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>Status</label>
          <select className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as Player['status'] }))}>
            {(['Confirmed','Prospective','Offered','Not Selected','Declined','Archived'] as Player['status'][]).map(s =>
              <option key={s} value={s}>{s}</option>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>Primary Position</label>
          <select className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.positions[0] ?? ''}
            onChange={e => {
              const val = e.target.value
              setForm(f => ({ ...f, positions: val ? [val, f.positions[1] ?? ''].filter(Boolean) : (f.positions[1] ? [f.positions[1]] : []) }))
            }}>
            <option value="">— None —</option>
            {POSITIONS.map(({ code, label }) => <option key={code} value={code}>{code} – {label}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl} style={{ color: '#6F6B62' }}>Secondary Position</label>
          <select className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.positions[1] ?? ''}
            onChange={e => {
              const val = e.target.value
              setForm(f => ({ ...f, positions: [f.positions[0] ?? '', val].filter(Boolean) }))
            }}>
            <option value="">— None —</option>
            {POSITIONS.map(({ code, label }) => <option key={code} value={code}>{code} – {label}</option>)}
          </select>
        </div>
      </div>

      <div className="border-t pt-4" style={{ borderColor: '#E3DFD6' }}>
        <p className={lbl} style={{ color: '#6F6B62' }}>Parent / Guardian 1</p>
        <div className="flex flex-col gap-3">
          <input placeholder="Parent name" className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.parent_name ?? ''}
            onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} />
          <input placeholder="(xxx) xxx-xxxx" className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.parent_phone ?? ''}
            onChange={e => setForm(f => ({ ...f, parent_phone: formatPhone(e.target.value) }))} />
          <input type="email" placeholder="Email" className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.parent_email ?? ''}
            onChange={e => setForm(f => ({ ...f, parent_email: e.target.value }))} />
        </div>
      </div>

      <div>
        <p className={lbl} style={{ color: '#6F6B62' }}>Parent / Guardian 2</p>
        <div className="flex flex-col gap-3">
          <input placeholder="Parent name" className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.parent2_name ?? ''}
            onChange={e => setForm(f => ({ ...f, parent2_name: e.target.value }))} />
          <input placeholder="(xxx) xxx-xxxx" className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.parent2_phone ?? ''}
            onChange={e => setForm(f => ({ ...f, parent2_phone: formatPhone(e.target.value) }))} />
          <input type="email" placeholder="Email" className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.parent2_email ?? ''}
            onChange={e => setForm(f => ({ ...f, parent2_email: e.target.value }))} />
        </div>
      </div>

      <div>
        <p className={lbl} style={{ color: '#6F6B62' }}>Emergency Contact</p>
        <div className="flex flex-col gap-3">
          <input placeholder="Name" className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.emergency_contact ?? ''}
            onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} />
          <input placeholder="(xxx) xxx-xxxx" className={field} style={{ borderColor: '#E3DFD6' }}
            value={form.emergency_phone ?? ''}
            onChange={e => setForm(f => ({ ...f, emergency_phone: formatPhone(e.target.value) }))} />
        </div>
      </div>

      <div>
        <label className={lbl} style={{ color: '#6F6B62' }}>Notes</label>
        <textarea rows={3} className={field} style={{ borderColor: '#E3DFD6', resize: 'none' }}
          value={form.notes ?? ''}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={form.team_reach}
          onChange={e => setForm(f => ({ ...f, team_reach: e.target.checked }))}
          className="w-4 h-4" style={{ accentColor: '#FE5A01' }} />
        <span className="text-sm" style={{ color: '#0A0A0A' }}>Added to TeamReach group</span>
      </label>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleShareCalendar}
          disabled={sharing}
          className="w-full py-3 rounded-xl text-sm font-semibold uppercase tracking-wider disabled:opacity-50"
          style={{ background: '#F6F3EE', color: '#FE5A01', border: '1px solid #FE5A01' }}
        >
          {sharing ? 'Sending…' : '📅 Share Practice Calendar'}
        </button>
        {shareMsg && (
          <p className="text-xs text-center font-semibold" style={{ color: shareMsg.startsWith('✓') ? '#2F8F54' : '#E05A3A' }}>
            {shareMsg}
          </p>
        )}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-50"
        style={{ background: saved ? '#2F8F54' : '#FE5A01' }}>
        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
      </button>

      <button
        onClick={async () => {
          if (!confirm(`Delete ${player.first_name} ${player.last_name}? This cannot be undone.`)) return
          await deletePlayer(player.id)
          onDelete()
        }}
        className="w-full py-3 rounded-xl text-sm font-semibold uppercase tracking-wider border"
        style={{ borderColor: '#E05A3A', color: '#E05A3A' }}
      >
        Delete Player
      </button>
    </div>
  )
}

// ─── Documents Tab ────────────────────────────────────────────────────────────
function DocumentsTab({
  player, team, documents, setDocuments,
}: { player: Player; team: Team | null; documents: Document[]; setDocuments: (d: Document[]) => void }) {
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<'ok' | 'error' | null>(null)

  function getDoc(docType: string) {
    return documents.find(d => d.doc_type === docType)
  }

  async function handleStatusChange(docType: Document['doc_type'], status: Document['status']) {
    const existing = getDoc(docType)
    const updated  = await upsertDocument({
      ...(existing ? { id: existing.id } : {}),
      player_id:   player.id,
      doc_type:    docType,
      status,
      date_sent:   status === 'not_sent' ? null : existing?.date_sent ?? new Date().toISOString().slice(0,10),
      date_signed: status === 'signed'   ? new Date().toISOString().slice(0,10) : null,
    })
    setDocuments(documents.map(d => d.doc_type === docType ? updated : d).concat(
      documents.find(d => d.doc_type === docType) ? [] : [updated]
    ))
  }

  async function handleSendPacket() {
    if (!team?.docuseal_template_id) return
    if (!player.parent_email) {
      alert('This player has no parent email on file. Add one on the Info tab first.')
      return
    }
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/docuseal/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId:  team.docuseal_template_id,
          playerName:  `${player.first_name} ${player.last_name}`,
          playerDob:   player.dob ?? '',
          parentName:  player.parent_name ?? '',
          parentEmail: player.parent_email,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(data.error))

      // Mark all docs as sent and store external submission ID
      const submissionId = String(data[0]?.submission_id ?? data.id ?? '')
      const today = new Date().toISOString().slice(0,10)
      const updated: Document[] = []
      for (const docType of DOC_TYPES) {
        const existing = getDoc(docType as Document['doc_type'])
        if (existing?.status === 'signed') { updated.push(existing); continue }
        const u = await upsertDocument({
          ...(existing ? { id: existing.id } : {}),
          player_id:   player.id,
          doc_type:    docType as Document['doc_type'],
          status:      'sent',
          date_sent:   today,
          date_signed: null,
          external_id: submissionId,
        })
        updated.push(u)
      }
      setDocuments(updated)
      setSendResult('ok')
    } catch (e) {
      console.error(e)
      setSendResult('error')
    }
    setSending(false)
  }

  const canSend = !!team?.docuseal_template_id && !!player.parent_email

  return (
    <div className="flex flex-col gap-3">
      {/* Send Packet button */}
      <div className="rounded-xl p-4" style={{ background: '#fff', boxShadow: '0 1px 2px rgba(21,21,26,0.06), 0 4px 14px rgba(21,21,26,0.06)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6F6B62' }}>DocuSeal Packet</p>
        {!team?.docuseal_template_id && (
          <p className="text-xs mb-2" style={{ color: '#D98E04' }}>No template linked — edit this player's team to add a DocuSeal Template ID.</p>
        )}
        {!player.parent_email && (
          <p className="text-xs mb-2" style={{ color: '#D98E04' }}>No parent email on file — add one on the Info tab.</p>
        )}
        {sendResult === 'ok' && (
          <p className="text-xs mb-2 font-semibold" style={{ color: '#2F8F54' }}>✓ Packet sent to {player.parent_email}</p>
        )}
        {sendResult === 'error' && (
          <p className="text-xs mb-2" style={{ color: '#E05A3A' }}>Failed to send — check the DocuSeal template ID and try again.</p>
        )}
        <button
          onClick={handleSendPacket}
          disabled={!canSend || sending}
          className="w-full py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-40"
          style={{ background: '#FE5A01' }}
        >
          {sending ? 'Sending…' : 'Send Document Packet'}
        </button>
      </div>

      {DOC_TYPES.map(docType => {
        const doc    = getDoc(docType)
        const status = doc?.status ?? 'not_sent'
        return (
          <div key={docType}
            className="rounded-xl p-4"
            style={{ background: '#fff', boxShadow: '0 1px 2px rgba(21,21,26,0.06), 0 4px 14px rgba(21,21,26,0.06)' }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>{docType}</span>
              <select
                value={status}
                onChange={e => handleStatusChange(docType, e.target.value as Document['status'])}
                className="text-xs border rounded-lg px-2 py-1 focus:outline-none font-semibold"
                style={{
                  borderColor: DOC_STATUS_COLORS[status],
                  color:       DOC_STATUS_COLORS[status],
                  background:  DOC_STATUS_COLORS[status] + '18',
                }}>
                <option value="not_sent">Not Sent</option>
                <option value="sent">Sent</option>
                <option value="signed">Signed</option>
              </select>
            </div>
            {doc?.date_sent && (
              <p className="text-xs mt-1" style={{ color: '#6F6B62' }}>
                Sent {doc.date_sent}
                {doc.date_signed && ` · Signed ${doc.date_signed}`}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Assessments Tab ──────────────────────────────────────────────────────────
function AssessmentsTab({
  playerId, assessments, setAssessments, showForm, setShowForm,
}: {
  playerId: string
  assessments: Assessment[]
  setAssessments: (a: Assessment[]) => void
  showForm: boolean
  setShowForm: (b: boolean) => void
}) {
  const [form, setForm] = useState({
    date:      new Date().toISOString().slice(0,10),
    evaluator: '',
    technical: 5, tactical: 5, physical: 5, mental: 5,
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  // Team averages from existing assessments
  const avg = (key: keyof Pick<Assessment, 'technical'|'tactical'|'physical'|'mental'>) => {
    if (!assessments.length) return 0
    return Math.round(assessments.reduce((s, a) => s + a[key], 0) / assessments.length * 10) / 10
  }

  async function handleSave() {
    setSaving(true)
    const saved = await upsertAssessment({ player_id: playerId, ...form })
    setAssessments([saved, ...assessments])
    setSaving(false)
    setShowForm(false)
    setForm({ date: new Date().toISOString().slice(0,10), evaluator: '', technical: 5, tactical: 5, physical: 5, mental: 5, notes: '' })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this assessment?')) return
    await deleteAssessment(id)
    setAssessments(assessments.filter(a => a.id !== id))
  }

  const corners = ['technical','tactical','physical','mental'] as const
  const cornerLabels = { technical: 'Technical', tactical: 'Tactical', physical: 'Physical', mental: 'Mental & Social' }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 rounded-xl text-sm font-semibold uppercase tracking-wider text-white"
        style={{ background: '#FE5A01' }}
      >
        + New Assessment
      </button>

      {/* Latest snapshot bars */}
      {assessments.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: '#fff', boxShadow: '0 1px 2px rgba(21,21,26,0.06), 0 4px 14px rgba(21,21,26,0.06)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#6F6B62' }}>
            Latest · {assessments[0].date}
          </p>
          {corners.map(corner => {
            const val    = assessments[0][corner]
            const avgVal = avg(corner)
            return (
              <div key={corner} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#0A0A0A' }}>{cornerLabels[corner]}</span>
                  <span style={{ color: '#FE5A01', fontWeight: 700 }}>{val}/10</span>
                </div>
                {/* Player bar */}
                <div className="relative h-2 rounded-full mb-1" style={{ background: '#F6F3EE' }}>
                  <div className="h-2 rounded-full" style={{ width: `${val * 10}%`, background: '#FE5A01' }} />
                </div>
                {/* Avg bar */}
                <div className="relative h-1.5 rounded-full" style={{ background: '#F6F3EE' }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${avgVal * 10}%`, background: '#E3DFD6' }} />
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#6F6B62' }}>Avg over {assessments.length} assessments: {avgVal}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* History */}
      {assessments.map((a, i) => (
        <div key={a.id}
          className="rounded-xl p-4"
          style={{ background: '#fff', boxShadow: '0 1px 2px rgba(21,21,26,0.06), 0 4px 14px rgba(21,21,26,0.06)' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>{a.date}</span>
              {a.evaluator && <span className="text-xs ml-2" style={{ color: '#6F6B62' }}>by {a.evaluator}</span>}
            </div>
            <button onClick={() => handleDelete(a.id)} className="text-xs" style={{ color: '#E05A3A' }}>Delete</button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {corners.map(c => (
              <div key={c} className="text-center">
                <div className="text-xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FE5A01' }}>{a[c]}</div>
                <div className="text-xs" style={{ color: '#6F6B62' }}>{c.charAt(0).toUpperCase() + c.slice(1,4)}</div>
              </div>
            ))}
          </div>
          {a.notes && <p className="text-xs mt-2" style={{ color: '#6F6B62' }}>{a.notes}</p>}
        </div>
      ))}

      {assessments.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: '#6F6B62' }}>No assessments yet.</p>
      )}

      {/* New assessment modal */}
      {showForm && (
        <Modal title="New Assessment" onClose={() => setShowForm(false)}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#6F6B62' }}>Date</label>
                <input type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: '#E3DFD6' }}
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#6F6B62' }}>Evaluator</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: '#E3DFD6' }}
                  placeholder="Coach name"
                  value={form.evaluator}
                  onChange={e => setForm(f => ({ ...f, evaluator: e.target.value }))} />
              </div>
            </div>

            {corners.map(corner => (
              <div key={corner}>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6F6B62' }}>
                    {cornerLabels[corner]}
                  </label>
                  <span className="text-sm font-bold" style={{ color: '#FE5A01' }}>{form[corner]}/10</span>
                </div>
                <input type="range" min={0} max={10} step={1}
                  value={form[corner]}
                  onChange={e => setForm(f => ({ ...f, [corner]: Number(e.target.value) }))}
                  className="w-full" style={{ accentColor: '#FE5A01' }} />
              </div>
            ))}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#6F6B62' }}>Notes</label>
              <textarea rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#E3DFD6', resize: 'none' }}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase border"
                style={{ borderColor: '#E3DFD6', color: '#6F6B62' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase text-white disabled:opacity-50"
                style={{ background: '#FE5A01' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Apparel Tab ──────────────────────────────────────────────────────────────
function ApparelTab({
  playerId, apparel, setApparel,
}: { playerId: string; apparel: Apparel[]; setApparel: (a: Apparel[]) => void }) {

  function getItem(item: string) {
    return apparel.find(a => a.item === item)
  }

  async function handleChange(item: Apparel['item'], field: 'size' | 'status' | 'date_issued', value: string) {
    const existing = getItem(item)
    const patch: any = {
      ...(existing ? { id: existing.id } : {}),
      entity_id:   playerId,
      entity_type: 'player',
      item,
      size:        existing?.size        ?? null,
      status:      existing?.status      ?? 'not_issued',
      date_issued: existing?.date_issued ?? null,
      [field]: value || null,
    }
    if (field === 'status' && value === 'issued' && !patch.date_issued) {
      patch.date_issued = new Date().toISOString().slice(0,10)
    }
    if (field === 'status' && value === 'not_issued') {
      patch.date_issued = null
    }
    const updated = await upsertApparel(patch)
    setApparel(apparel.map(a => a.item === item ? updated : a).concat(
      apparel.find(a => a.item === item) ? [] : [updated]
    ))
  }

  return (
    <div className="flex flex-col gap-3">
      {APPAREL_ITEMS.map(item => {
        const a      = getItem(item)
        const status = a?.status ?? 'not_issued'
        return (
          <div key={item}
            className="rounded-xl p-4"
            style={{ background: '#fff', boxShadow: '0 1px 2px rgba(21,21,26,0.06), 0 4px 14px rgba(21,21,26,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-sm" style={{ color: '#0A0A0A' }}>{item}</span>
              <select
                value={status}
                onChange={e => handleChange(item, 'status', e.target.value)}
                className="text-xs border rounded-lg px-2 py-1 focus:outline-none font-semibold"
                style={{
                  borderColor: status === 'issued' ? '#2F8F54' : '#B9B4A8',
                  color:       status === 'issued' ? '#2F8F54' : '#B9B4A8',
                  background:  (status === 'issued' ? '#2F8F54' : '#B9B4A8') + '18',
                }}>
                <option value="not_issued">Not Issued</option>
                <option value="issued">Issued</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#6F6B62' }}>Size</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: '#E3DFD6' }}
                  placeholder="YS, YM, S, M, L…"
                  value={a?.size ?? ''}
                  onChange={e => handleChange(item, 'size', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#6F6B62' }}>Date Issued</label>
                <input type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: '#E3DFD6' }}
                  value={a?.date_issued ?? ''}
                  onChange={e => handleChange(item, 'date_issued', e.target.value)}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
