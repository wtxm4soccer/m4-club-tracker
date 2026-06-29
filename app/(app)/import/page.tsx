'use client'

import { useEffect, useRef, useState } from 'react'
import type { Team, Player } from '@/lib/types'
import { getTeams, getPlayers, upsertTeam, upsertPlayer, seedPlayerDocuments, seedPlayerApparel } from '@/lib/supabase/queries'
import { getPlayerApparel } from '@/lib/supabase/player-detail-queries'

// ---------- CSV parser (GotSoccer / US Club export format) ----------
type ParsedPlayer = {
  first_name: string
  last_name: string
  dob: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null
  emergency_contact: string | null
  emergency_phone: string | null
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

  const iFirst    = idx('First Name')
  const iLast     = idx('Last Name')
  const iDOB      = idx('Birthdate')
  const iP1First  = idx('Parent One First Name')
  const iP1Last   = idx('Parent One Last Name')
  const iP1Email  = idx('Parent One Email')
  const iP1Phone  = idx('Parent One Phone Number')
  const iEC1First = idx('Emergency Contact One First Name')
  const iEC1Last  = idx('Emergency Contact One Last Name')
  const iEC1Phone = idx('Emergency Contact One Phone Number')

  const players: ParsedPlayer[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols: string[] = []
    let cur = '', inQ = false
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
      first_name:        fn,
      last_name:         ln,
      dob:               get(iDOB) || null,
      parent_name:       [get(iP1First), get(iP1Last)].filter(Boolean).join(' ') || null,
      parent_phone:      fmtPhone(get(iP1Phone)),
      parent_email:      get(iP1Email) || null,
      emergency_contact: [get(iEC1First), get(iEC1Last)].filter(Boolean).join(' ') || null,
      emergency_phone:   fmtPhone(get(iEC1Phone)),
    })
  }
  return players
}

// ---------- CSV export helpers ----------
function downloadCSV(filename: string, rows: string[][]) {
  const content = rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([content], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ImportPage() {
  const [teams,    setTeams]    = useState<Team[]>([])
  const [players,  setPlayers]  = useState<Player[]>([])
  const [teamId,   setTeamId]   = useState('')
  const [newTeam,  setNewTeam]  = useState('')
  const [parsed,   setParsed]   = useState<ParsedPlayer[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result,   setResult]   = useState<{ imported: number; skipped: number } | null>(null)
  const [exportTeamId, setExportTeamId] = useState('all')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([getTeams(), getPlayers()]).then(([t, p]) => {
      setTeams(t)
      setPlayers(p)
      if (t.length) setTeamId(t[0].id)
    })
  }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    const reader = new FileReader()
    reader.onload = ev => setParsed(parseCSV(ev.target?.result as string))
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!parsed) return
    setImporting(true)
    let resolved = teamId

    // Create new team if name was entered
    if (newTeam.trim()) {
      const t = await upsertTeam({ name: newTeam.trim() })
      setTeams(prev => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))
      resolved = t.id
    }

    let imported = 0, skipped = 0
    for (const p of parsed) {
      try {
        const saved = await upsertPlayer({ ...p, team_id: resolved, positions: [], status: 'Prospective', team_reach: false })
        await seedPlayerDocuments(saved.id)
        await seedPlayerApparel(saved.id)
        imported++
      } catch { skipped++ }
    }
    setResult({ imported, skipped })
    setParsed(null); setFileName(''); setNewTeam('')
    if (fileRef.current) fileRef.current.value = ''
    // Refresh players
    getPlayers().then(setPlayers)
    setImporting(false)
  }

  async function exportPlayRoster() {
    const subset = exportTeamId === 'all' ? players : players.filter(p => p.team_id === exportTeamId)
    const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]))
    const rows = [
      ['#', 'First Name', 'Last Name', 'DOB', 'Positions', 'Status', 'Team', 'Parent Name', 'Parent Phone', 'Parent Email', 'Emergency Contact', 'Emergency Phone'],
      ...subset.map(p => [
        p.number ?? '',
        p.first_name,
        p.last_name,
        p.dob ?? '',
        p.positions.join(', '),
        p.status,
        p.team_id ? teamMap[p.team_id] ?? '' : '',
        p.parent_name ?? '',
        p.parent_phone ?? '',
        p.parent_email ?? '',
        p.emergency_contact ?? '',
        p.emergency_phone ?? '',
      ])
    ]
    const label = exportTeamId === 'all' ? 'All_Teams' : teams.find(t => t.id === exportTeamId)?.name?.replace(/\s+/g, '_') ?? 'Team'
    downloadCSV(`M4_Roster_${label}_${new Date().toISOString().slice(0,10)}.csv`, rows)
  }

  async function exportApparelRoster() {
    const subset = exportTeamId === 'all' ? players : players.filter(p => p.team_id === exportTeamId)
    const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]))
    const items = ['Shirt', 'Shorts', 'Pants', 'Jacket']
    const rows: string[][] = [['First Name', 'Last Name', 'Team', ...items.flatMap(i => [`${i} Size`, `${i} Issued`])]]
    for (const p of subset) {
      const apparel = await getPlayerApparel(p.id)
      const byItem = Object.fromEntries(apparel.map(a => [a.item, a]))
      rows.push([
        p.first_name, p.last_name,
        p.team_id ? teamMap[p.team_id] ?? '' : '',
        ...items.flatMap(i => [byItem[i]?.size ?? '', byItem[i]?.status === 'issued' ? 'Yes' : 'No'])
      ])
    }
    const label = exportTeamId === 'all' ? 'All_Teams' : teams.find(t => t.id === exportTeamId)?.name?.replace(/\s+/g, '_') ?? 'Team'
    downloadCSV(`M4_Apparel_${label}_${new Date().toISOString().slice(0,10)}.csv`, rows)
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6F6B62' }}>{children}</div>
  )

  const Divider = () => <hr style={{ borderColor: '#E3DFD6', margin: '24px 0' }} />

  return (
    <div className="px-5 pt-5 pb-10">
      <h2
        className="text-3xl font-bold uppercase mb-1"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}
      >
        Import / Export
      </h2>

      <Divider />

      {/* ── IMPORT ── */}
      <h3 className="text-lg font-bold uppercase mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}>
        1. Choose a Team
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-2">
        <div>
          <Label>Existing Team</Label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: '#E3DFD6' }}
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
            disabled={!!newTeam.trim()}
          >
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Or New Team Name</Label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: '#E3DFD6' }}
            placeholder="e.g. U11 Boys"
            value={newTeam}
            onChange={e => setNewTeam(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs mb-6" style={{ color: '#9B968A' }}>
        Pick one — if both are filled, the new team name wins.
      </p>

      <Divider />

      <h3 className="text-lg font-bold uppercase mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}>
        2. Upload File
      </h3>

      <label className="flex items-center gap-3 mb-1">
        <span
          className="px-3 py-1.5 rounded text-sm font-semibold border cursor-pointer"
          style={{ borderColor: '#E3DFD6', color: '#0A0A0A' }}
        >
          Choose File
        </span>
        <span className="text-sm" style={{ color: '#6F6B62' }}>{fileName || 'No file chosen'}</span>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </label>
      <p className="text-xs mb-4" style={{ color: '#9B968A' }}>CSV or Excel (.xlsx / .xls). First row should be column headers.</p>

      {parsed && parsed.length > 0 && (
        <>
          <div className="rounded-xl p-3 mb-4 max-h-48 overflow-y-auto" style={{ background: '#F6F3EE' }}>
            {parsed.map((p, i) => (
              <div key={i} className="flex justify-between py-1 text-sm border-b" style={{ borderColor: '#E3DFD6' }}>
                <span style={{ color: '#0A0A0A' }}>{p.first_name} {p.last_name}</span>
                <span style={{ color: '#6F6B62' }}>{p.dob ?? '—'}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleImport}
            disabled={importing || (!teamId && !newTeam.trim())}
            className="w-full py-3 rounded-xl text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-50 mb-2"
            style={{ background: '#FE5A01' }}
          >
            {importing ? 'Importing…' : `Import ${parsed.length} Players`}
          </button>
        </>
      )}

      {result && (
        <div className="rounded-xl p-4 text-center mb-4" style={{ background: '#F0FAF4' }}>
          <div className="text-xl font-bold mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#2F8F54' }}>
            ✓ {result.imported} players imported{result.skipped > 0 ? `, ${result.skipped} skipped` : ''}
          </div>
        </div>
      )}

      <Divider />

      {/* ── EXPORT ── */}
      <h3 className="text-lg font-bold uppercase mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}>
        Export Rosters
      </h3>

      <Label>Team</Label>
      <select
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none mb-4"
        style={{ borderColor: '#E3DFD6' }}
        value={exportTeamId}
        onChange={e => setExportTeamId(e.target.value)}
      >
        <option value="all">All Teams</option>
        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={exportPlayRoster}
          className="py-3 rounded-xl text-sm font-semibold border"
          style={{ borderColor: '#E3DFD6', color: '#0A0A0A' }}
        >
          Play Roster (CSV)
        </button>
        <button
          onClick={exportApparelRoster}
          className="py-3 rounded-xl text-sm font-semibold border"
          style={{ borderColor: '#E3DFD6', color: '#0A0A0A' }}
        >
          Apparel Roster (CSV)
        </button>
      </div>
      <p className="text-xs" style={{ color: '#9B968A' }}>
        Play roster: number, name, position, DOB, status. Apparel roster: sizes and issued status for every item, for planning future orders.
      </p>
    </div>
  )
}
