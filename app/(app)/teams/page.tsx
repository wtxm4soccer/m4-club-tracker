'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Team, Player } from '@/lib/types'
import { ACTIVE_STATUSES, STATUS_COLORS } from '@/lib/types'
import {
  getTeams, getPlayers, upsertTeam, deleteTeam, uploadTeamMascot,
  upsertPlayer, seedPlayerDocuments, seedPlayerApparel,
} from '@/lib/supabase/queries'
import { getPlayerApparel } from '@/lib/supabase/player-detail-queries'
import Modal from '@/components/Modal'
import PlayerForm from '@/components/PlayerForm'

// ── CSV helpers ──────────────────────────────────────────────────────────────

type ParsedPlayer = {
  first_name: string; last_name: string; dob: string | null
  parent_name: string | null; parent_phone: string | null; parent_email: string | null
  emergency_contact: string | null; emergency_phone: string | null
}

function fmtPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(-10)
  return d.length === 10 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : d || null
}

function parseCSV(text: string): ParsedPlayer[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  const idx = (name: string) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase())
  const iFirst = idx('First Name'), iLast = idx('Last Name'), iDOB = idx('Birthdate')
  const iP1First = idx('Parent One First Name'), iP1Last = idx('Parent One Last Name')
  const iP1Email = idx('Parent One Email'), iP1Phone = idx('Parent One Phone Number')
  const iEC1First = idx('Emergency Contact One First Name'), iEC1Last = idx('Emergency Contact One Last Name')
  const iEC1Phone = idx('Emergency Contact One Phone Number')

  const players: ParsedPlayer[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols: string[] = []; let cur = '', inQ = false
    for (const ch of lines[i]) {
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())
    const get = (i: number) => (i >= 0 && i < cols.length ? cols[i] : '') || ''
    const fn = get(iFirst), ln = get(iLast)
    if (!fn && !ln) continue
    players.push({
      first_name: fn, last_name: ln, dob: get(iDOB) || null,
      parent_name: [get(iP1First), get(iP1Last)].filter(Boolean).join(' ') || null,
      parent_phone: fmtPhone(get(iP1Phone)), parent_email: get(iP1Email) || null,
      emergency_contact: [get(iEC1First), get(iEC1Last)].filter(Boolean).join(' ') || null,
      emergency_phone: fmtPhone(get(iEC1Phone)),
    })
  }
  return players
}

function downloadCSV(filename: string, rows: string[][]) {
  const content = rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ────────────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const router = useRouter()
  const [teams,   setTeams]   = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Team form
  const [showTeamModal, setShowTeamModal]     = useState(false)
  const [editTeam, setEditTeam]               = useState<Team | null>(null)
  const [teamName, setTeamName]               = useState('')
  const [teamDivision, setTeamDivision]       = useState('')
  const [teamTemplateId, setTeamTemplateId]   = useState('')
  const [teamCalendarUrl, setTeamCalendarUrl] = useState('')
  const [mascotFile, setMascotFile]           = useState<File | null>(null)
  const [mascotPreview, setMascotPreview]     = useState<string>('')
  const [savingTeam, setSavingTeam]           = useState(false)

  // Player form
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [defaultTeamId, setDefaultTeamId]     = useState<string>('')

  // Import CSV
  const [showImportModal, setShowImportModal] = useState(false)
  const [importTeamId, setImportTeamId]       = useState('')
  const [importNewTeam, setImportNewTeam]     = useState('')
  const [importParsed, setImportParsed]       = useState<ParsedPlayer[] | null>(null)
  const [importFileName, setImportFileName]   = useState('')
  const [importing, setImporting]             = useState(false)
  const [importResult, setImportResult]       = useState<{ imported: number; skipped: number } | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)

  // Export
  const [exportingTeamId, setExportingTeamId] = useState<string | null>(null)

  // Calendar share
  const [sharingCalendarId, setSharingCalendarId] = useState<string | null>(null)
  const [calendarShareMsg, setCalendarShareMsg]   = useState<Record<string, string>>({})

  async function handleShareCalendarToAll(team: Team) {
    if (!team.calendar_url) { alert('No calendar URL set for this team. Edit the team to add one.'); return }
    const eligible = playersForTeam(team.id).filter(p => ACTIVE_STATUSES.includes(p.status) && p.parent_email)
    if (!eligible.length) { alert('No active players with a parent email on file.'); return }
    if (!confirm(`Send the practice calendar to ${eligible.length} parent${eligible.length > 1 ? 's' : ''}?`)) return
    setSharingCalendarId(team.id)
    let sent = 0
    for (const p of eligible) {
      const res = await fetch('/api/email/share-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail: p.parent_email,
          parentName:  p.parent_name ?? '',
          playerName:  `${p.first_name} ${p.last_name}`,
          teamName:    team.name,
          calendarUrl: team.calendar_url,
        }),
      })
      if (res.ok) sent++
    }
    setSharingCalendarId(null)
    setCalendarShareMsg(prev => ({ ...prev, [team.id]: `✓ Sent to ${sent} of ${eligible.length}` }))
    setTimeout(() => setCalendarShareMsg(prev => ({ ...prev, [team.id]: '' })), 5000)
  }

  useEffect(() => {
    Promise.all([getTeams(), getPlayers()]).then(([t, p]) => {
      setTeams(t); setPlayers(p)
      if (t.length) setImportTeamId(t[0].id)
      setLoading(false)
    })
  }, [])

  function playersForTeam(teamId: string) {
    return players.filter(p => p.team_id === teamId)
  }

  // ── Team form ────────────────────────────────────────────────────────────

  function openAddTeam() {
    setEditTeam(null); setTeamName(''); setTeamDivision(''); setTeamTemplateId('')
    setTeamCalendarUrl(''); setMascotFile(null); setMascotPreview(''); setShowTeamModal(true)
  }

  function openEditTeam(team: Team) {
    setEditTeam(team); setTeamName(team.name); setTeamDivision(team.division ?? '')
    setTeamTemplateId(team.docuseal_template_id ?? '')
    setTeamCalendarUrl(team.calendar_url ?? ''); setMascotFile(null)
    setMascotPreview(team.photo_url ?? ''); setShowTeamModal(true)
  }

  function handleMascotPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setMascotFile(file); setMascotPreview(URL.createObjectURL(file))
  }

  async function handleSaveTeam() {
    if (!teamName.trim()) return
    setSavingTeam(true)
    const saved = await upsertTeam({
      ...(editTeam ? { id: editTeam.id } : {}),
      name: teamName.trim(), division: teamDivision.trim() || null,
      docuseal_template_id: teamTemplateId.trim() || null,
      calendar_url: teamCalendarUrl.trim() || null,
    })
    if (mascotFile) {
      const url = await uploadTeamMascot(saved.id, mascotFile)
      await upsertTeam({ id: saved.id, name: saved.name, photo_url: url })
      saved.photo_url = url
    }
    setTeams(prev => {
      const idx = prev.findIndex(t => t.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
    })
    setExpanded(prev => ({ ...prev, [saved.id]: true }))
    setSavingTeam(false); setShowTeamModal(false)
  }

  async function handleDeleteTeam(team: Team) {
    if (!confirm(`Delete "${team.name}"? All players in this team will become unassigned.`)) return
    await deleteTeam(team.id)
    setTeams(prev => prev.filter(t => t.id !== team.id))
  }

  function handlePlayerSaved(player: Player) {
    setPlayers(prev => {
      const idx = prev.findIndex(p => p.id === player.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = player; return next }
      return [...prev, player]
    })
    setShowPlayerModal(false)
  }

  // ── Import CSV ───────────────────────────────────────────────────────────

  function openImportModal() {
    setImportParsed(null); setImportFileName(''); setImportNewTeam('')
    setImportResult(null)
    if (teams.length) setImportTeamId(teams[0].id)
    setShowImportModal(true)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setImportFileName(file.name); setImportResult(null)
    const reader = new FileReader()
    reader.onload = ev => setImportParsed(parseCSV(ev.target?.result as string))
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!importParsed) return
    setImporting(true)
    let resolved = importTeamId
    if (importNewTeam.trim()) {
      const t = await upsertTeam({ name: importNewTeam.trim() })
      setTeams(prev => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))
      resolved = t.id
    }
    let imported = 0, skipped = 0
    for (const p of importParsed) {
      try {
        const saved = await upsertPlayer({ ...p, team_id: resolved, positions: [], status: 'Prospective', team_reach: false })
        await seedPlayerDocuments(saved.id); await seedPlayerApparel(saved.id)
        imported++
      } catch { skipped++ }
    }
    setImportResult({ imported, skipped })
    setImportParsed(null); setImportFileName(''); setImportNewTeam('')
    if (importFileRef.current) importFileRef.current.value = ''
    getPlayers().then(setPlayers)
    setImporting(false)
  }

  // ── Export CSV per team ──────────────────────────────────────────────────

  async function exportTeamPlayRoster(team: Team) {
    const subset = playersForTeam(team.id)
    const rows = [
      ['#', 'First Name', 'Last Name', 'DOB', 'Positions', 'Status', 'Parent Name', 'Parent Phone', 'Parent Email', 'Emergency Contact', 'Emergency Phone'],
      ...subset.map(p => [
        p.number ?? '', p.first_name, p.last_name, p.dob ?? '',
        p.positions.join(', '), p.status,
        p.parent_name ?? '', p.parent_phone ?? '', p.parent_email ?? '',
        p.emergency_contact ?? '', p.emergency_phone ?? '',
      ])
    ]
    downloadCSV(`M4_Roster_${team.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`, rows)
  }

  async function exportTeamApparelRoster(team: Team) {
    setExportingTeamId(team.id)
    const subset = playersForTeam(team.id)
    const items = ['Shirt', 'Shorts', 'Pants', 'Jacket']
    const rows: string[][] = [['First Name', 'Last Name', ...items.flatMap(i => [`${i} Size`, `${i} Issued`])]]
    for (const p of subset) {
      const apparel = await getPlayerApparel(p.id)
      const byItem = Object.fromEntries(apparel.map(a => [a.item, a]))
      rows.push([p.first_name, p.last_name, ...items.flatMap(i => [byItem[i]?.size ?? '', byItem[i]?.status === 'issued' ? 'Yes' : 'No'])])
    }
    downloadCSV(`M4_Apparel_${team.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`, rows)
    setExportingTeamId(null)
  }

  if (loading) return <div className="px-5 pt-8 text-sm" style={{ color: '#6F6B62' }}>Loading…</div>

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-4" style={{ background: '#F6F3EE' }}>
        <div className="flex items-center justify-between gap-2">
          <h2
            className="text-3xl font-bold uppercase"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}
          >
            Teams
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={openImportModal}
              className="text-sm font-semibold uppercase tracking-wider px-3 py-2 rounded-xl border"
              style={{ borderColor: '#E3DFD6', color: '#6F6B62' }}
            >
              ↑ CSV
            </button>
            <button
              onClick={openAddTeam}
              className="text-sm font-semibold uppercase tracking-wider px-4 py-2 rounded-xl text-white"
              style={{ background: '#FE5A01' }}
            >
              + Team
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable team cards */}
      <div className="flex flex-col gap-3 px-5 pb-4">
        {teams.map(team => {
          const teamPlayers = playersForTeam(team.id)
          const active = teamPlayers.filter(p => ACTIVE_STATUSES.includes(p.status))
          const isOpen = expanded[team.id]

          return (
            <div
              key={team.id}
              className="rounded-xl overflow-hidden"
              style={{ background: '#fff', boxShadow: '0 1px 2px rgba(21,21,26,0.06), 0 4px 14px rgba(21,21,26,0.06)', borderLeft: '4px solid #0A0A0A' }}
            >
              {/* Team header row */}
              <div className="px-3 py-3">
                <div className="flex items-center gap-2">
                  {team.photo_url ? (
                    <img src={team.photo_url} alt={team.name}
                      style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 6, background: '#F6F3EE', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚽</div>
                  )}
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => setExpanded(prev => ({ ...prev, [team.id]: !prev[team.id] }))}
                  >
                    <div className="font-bold uppercase leading-none truncate"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A', fontSize: 16 }}>
                      {team.name}
                    </div>
                    {team.division && (
                      <div className="text-xs mt-0.5 truncate" style={{ color: '#6F6B62' }}>{team.division}</div>
                    )}
                  </button>
                  <span className="text-xs font-semibold rounded-full px-2 py-0.5 shrink-0" style={{ background: '#F6F3EE', color: '#6F6B62' }}>
                    {active.length}
                  </span>
                  <button onClick={() => setExpanded(prev => ({ ...prev, [team.id]: !prev[team.id] }))}
                    className="text-xs shrink-0" style={{ color: '#6F6B62' }}>
                    {isOpen ? '▲' : '▼'}
                  </button>
                  <button onClick={() => openEditTeam(team)}
                    className="text-xs px-2 py-1 rounded shrink-0" style={{ color: '#6F6B62' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDeleteTeam(team)}
                    className="text-xs px-2 py-1 rounded shrink-0" style={{ color: '#E05A3A' }}>
                    Del
                  </button>
                </div>
              </div>

              {/* Mini roster */}
              {isOpen && (
                <div className="border-t px-4 py-2" style={{ borderColor: '#E3DFD6' }}>
                  {active.length === 0 ? (
                    <p className="text-xs py-2" style={{ color: '#6F6B62' }}>No active players yet.</p>
                  ) : (
                    <div className="flex flex-col">
                      {active
                        .sort((a, b) => Number(a.number ?? 99) - Number(b.number ?? 99))
                        .map(p => (
                          <button
                            key={p.id}
                            className="grid items-center py-1.5 w-full text-left"
                            style={{ gridTemplateColumns: '10px 34px 1fr auto', gap: 8 }}
                            onClick={() => router.push(`/players/${p.id}`)}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[p.status] }} />
                            <span className="text-sm font-bold"
                              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FE5A01' }}>
                              {p.number ?? '—'}
                            </span>
                            <span className="text-sm" style={{ color: '#0A0A0A' }}>
                              {p.first_name} {p.last_name}
                            </span>
                            <span className="text-xs uppercase" style={{ color: '#6F6B62' }}>
                              {p.positions.slice(0, 2).join(', ')}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pb-1">
                    <button
                      onClick={() => { setDefaultTeamId(team.id); setShowPlayerModal(true) }}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-white"
                      style={{ background: '#FE5A01' }}
                    >
                      + Add Player
                    </button>
                    <button
                      onClick={() => exportTeamPlayRoster(team)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider border"
                      style={{ borderColor: '#E3DFD6', color: '#6F6B62' }}
                    >
                      Roster CSV
                    </button>
                    <button
                      onClick={() => exportTeamApparelRoster(team)}
                      disabled={exportingTeamId === team.id}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider border disabled:opacity-50"
                      style={{ borderColor: '#E3DFD6', color: '#6F6B62' }}
                    >
                      {exportingTeamId === team.id ? '…' : 'Apparel CSV'}
                    </button>
                  </div>
                  {team.calendar_url && (
                    <div className="pb-2">
                      <button
                        onClick={() => handleShareCalendarToAll(team)}
                        disabled={sharingCalendarId === team.id}
                        className="w-full py-2 rounded-lg text-xs font-semibold uppercase tracking-wider border disabled:opacity-50"
                        style={{ borderColor: '#FE5A01', color: '#FE5A01' }}
                      >
                        {sharingCalendarId === team.id ? 'Sending…' : '📅 Share Calendar to All Parents'}
                      </button>
                      {calendarShareMsg[team.id] && (
                        <p className="text-xs text-center mt-1 font-semibold" style={{ color: '#2F8F54' }}>
                          {calendarShareMsg[team.id]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {teams.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: '#6F6B62' }}>
            No teams yet. Tap <strong>+ Team</strong> to create one.
          </p>
        )}
      </div>

      {/* Team modal */}
      {showTeamModal && (
        <Modal title={editTeam ? 'Edit Team' : 'New Team'} onClose={() => setShowTeamModal(false)}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: '#6F6B62' }}>Team Name</label>
              <input
                autoFocus
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#E3DFD6' }}
                value={teamName} onChange={e => setTeamName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveTeam() }}
                placeholder="e.g. U10 Boys"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: '#6F6B62' }}>Division</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#E3DFD6' }}
                value={teamDivision} onChange={e => setTeamDivision(e.target.value)}
                placeholder="e.g. U10, U9 Rec, 8U Travel"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: '#6F6B62' }}>DocuSeal Template ID</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none font-mono"
                style={{ borderColor: '#E3DFD6' }}
                value={teamTemplateId} onChange={e => setTeamTemplateId(e.target.value)}
                placeholder="e.g. 4464458"
              />
              <p className="text-xs mt-1" style={{ color: '#9B968A' }}>From DocuSeal → Templates → copy the ID from the URL</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: '#6F6B62' }}>Practice Calendar URL</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#E3DFD6' }}
                value={teamCalendarUrl} onChange={e => setTeamCalendarUrl(e.target.value)}
                placeholder="Paste Google Calendar share link…"
              />
              <p className="text-xs mt-1" style={{ color: '#9B968A' }}>Google Calendar → ⚙ Settings → Share → copy the public URL</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#6F6B62' }}>Mascot Photo</label>
              <div className="flex items-center gap-3">
                {mascotPreview ? (
                  <img src={mascotPreview} alt="Mascot" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, border: '1px solid #E3DFD6' }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: '#F6F3EE', border: '1px solid #E3DFD6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>⚽</div>
                )}
                <label className="flex-1 cursor-pointer py-2 px-3 rounded-lg text-xs font-semibold uppercase text-center"
                  style={{ border: '1px dashed #E3DFD6', color: '#6F6B62' }}>
                  {mascotPreview ? 'Change Photo' : 'Upload Photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleMascotPick} />
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowTeamModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase border"
                style={{ borderColor: '#E3DFD6', color: '#6F6B62' }}>
                Cancel
              </button>
              <button onClick={handleSaveTeam} disabled={savingTeam || !teamName.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase text-white disabled:opacity-50"
                style={{ background: '#FE5A01' }}>
                {savingTeam ? 'Saving…' : editTeam ? 'Save' : 'Create Team'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Player modal */}
      {showPlayerModal && (
        <Modal title="Add Player" onClose={() => setShowPlayerModal(false)}>
          <PlayerForm
            teams={teams}
            player={{ team_id: defaultTeamId } as Player}
            onSave={handlePlayerSaved}
            onCancel={() => setShowPlayerModal(false)}
          />
        </Modal>
      )}

      {/* Import CSV modal */}
      {showImportModal && (
        <Modal title="Import Players" onClose={() => { setShowImportModal(false); setImportParsed(null); setImportResult(null) }}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: '#6F6B62' }}>Existing Team</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: '#E3DFD6' }}
                  value={importTeamId}
                  onChange={e => setImportTeamId(e.target.value)}
                  disabled={!!importNewTeam.trim()}
                >
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: '#6F6B62' }}>Or New Team</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: '#E3DFD6' }}
                  placeholder="e.g. U11 Boys"
                  value={importNewTeam}
                  onChange={e => setImportNewTeam(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs -mt-2" style={{ color: '#9B968A' }}>If both are filled, the new team name wins.</p>

            <label className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded text-sm font-semibold border cursor-pointer"
                style={{ borderColor: '#E3DFD6', color: '#0A0A0A' }}>
                Choose CSV
              </span>
              <span className="text-sm truncate" style={{ color: '#6F6B62' }}>{importFileName || 'No file chosen'}</span>
              <input ref={importFileRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
            </label>

            {importParsed && importParsed.length > 0 && (
              <div className="rounded-xl max-h-40 overflow-y-auto" style={{ background: '#F6F3EE' }}>
                {importParsed.map((p, i) => (
                  <div key={i} className="flex justify-between px-3 py-1.5 text-sm border-b" style={{ borderColor: '#E3DFD6' }}>
                    <span style={{ color: '#0A0A0A' }}>{p.first_name} {p.last_name}</span>
                    <span style={{ color: '#6F6B62' }}>{p.dob ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}

            {importResult && (
              <div className="rounded-xl p-3 text-center" style={{ background: '#F0FAF4' }}>
                <div className="font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#2F8F54', fontSize: 18 }}>
                  ✓ {importResult.imported} imported{importResult.skipped > 0 ? `, ${importResult.skipped} skipped` : ''}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowImportModal(false); setImportParsed(null); setImportResult(null) }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase border"
                style={{ borderColor: '#E3DFD6', color: '#6F6B62' }}>
                {importResult ? 'Done' : 'Cancel'}
              </button>
              {importParsed && importParsed.length > 0 && (
                <button
                  onClick={handleImport}
                  disabled={importing || (!importTeamId && !importNewTeam.trim())}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase text-white disabled:opacity-50"
                  style={{ background: '#FE5A01' }}
                >
                  {importing ? 'Importing…' : `Import ${importParsed.length}`}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
