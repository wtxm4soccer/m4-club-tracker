'use client'

import { useEffect, useState } from 'react'
import type { Team, Player } from '@/lib/types'
import { ACTIVE_STATUSES, STATUS_COLORS } from '@/lib/types'
import { getTeams, getPlayers, upsertTeam, deleteTeam, uploadTeamMascot } from '@/lib/supabase/queries'
import Modal from '@/components/Modal'
import PlayerForm from '@/components/PlayerForm'

export default function TeamsPage() {
  const [teams,   setTeams]   = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Team form
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editTeam, setEditTeam]           = useState<Team | null>(null)
  const [teamName, setTeamName]                       = useState('')
  const [teamDivision, setTeamDivision]               = useState('')
  const [teamTemplateId, setTeamTemplateId]           = useState('')
  const [mascotFile, setMascotFile]       = useState<File | null>(null)
  const [mascotPreview, setMascotPreview] = useState<string>('')
  const [savingTeam, setSavingTeam]       = useState(false)

  // Player form
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [defaultTeamId, setDefaultTeamId]     = useState<string>('')

  useEffect(() => {
    Promise.all([getTeams(), getPlayers()]).then(([t, p]) => {
      setTeams(t)
      setPlayers(p)
      // Expand all teams by default
      const exp: Record<string, boolean> = {}
      t.forEach(team => { exp[team.id] = true })
      setExpanded(exp)
      setLoading(false)
    })
  }, [])

  function playersForTeam(teamId: string) {
    return players.filter(p => p.team_id === teamId)
  }

  function activeCount(teamId: string) {
    return players.filter(p => p.team_id === teamId && ACTIVE_STATUSES.includes(p.status)).length
  }

  function openAddTeam() {
    setEditTeam(null)
    setTeamName('')
    setTeamDivision('')
    setTeamTemplateId('')
    setMascotFile(null)
    setMascotPreview('')
    setShowTeamModal(true)
  }

  function openEditTeam(team: Team) {
    setEditTeam(team)
    setTeamName(team.name)
    setTeamDivision(team.division ?? '')
    setTeamTemplateId(team.docuseal_template_id ?? '')
    setMascotFile(null)
    setMascotPreview(team.photo_url ?? '')
    setShowTeamModal(true)
  }

  function handleMascotPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMascotFile(file)
    setMascotPreview(URL.createObjectURL(file))
  }

  async function handleSaveTeam() {
    if (!teamName.trim()) return
    setSavingTeam(true)
    const saved = await upsertTeam({ ...(editTeam ? { id: editTeam.id } : {}), name: teamName.trim(), division: teamDivision.trim() || null, docuseal_template_id: teamTemplateId.trim() || null })
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
    setSavingTeam(false)
    setShowTeamModal(false)
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

  if (loading) return <div className="px-5 pt-8 text-sm" style={{ color: '#6F6B62' }}>Loading…</div>

  // Stats
  const totalActive = players.filter(p => ACTIVE_STATUSES.includes(p.status)).length

  return (
    <div className="px-5 pt-5 pb-4">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-3xl font-bold uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}
        >
          Teams
        </h2>
        <button
          onClick={openAddTeam}
          className="text-sm font-semibold uppercase tracking-wider px-4 py-2 rounded-xl text-white"
          style={{ background: '#FE5A01' }}
        >
          + Team
        </button>
      </div>

      {/* Summary stats */}
      <div
        className="grid grid-cols-3 rounded-xl overflow-hidden mb-5"
        style={{ background: '#E3DFD6', gap: 1 }}
      >
        {[
          { num: teams.length,  lbl: 'Teams' },
          { num: totalActive,   lbl: 'Active' },
          { num: players.length, lbl: 'Total' },
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

      {/* Team cards */}
      <div className="flex flex-col gap-3">
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
              <div className="px-4 py-3 flex items-center justify-between gap-2">
                <button
                  className="flex-1 flex items-center gap-3 text-left"
                  onClick={() => setExpanded(prev => ({ ...prev, [team.id]: !prev[team.id] }))}
                >
                  {team.photo_url ? (
                    <img src={team.photo_url} alt={team.name}
                      style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: '#F6F3EE', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      ⚽
                    </div>
                  )}
                  <div>
                    <span
                      className="text-lg font-bold uppercase leading-none"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}
                    >
                      {team.name}
                    </span>
                    {team.division && (
                      <div className="text-xs mt-0.5" style={{ color: '#6F6B62' }}>{team.division}</div>
                    )}
                  </div>
                  <span className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ background: '#F6F3EE', color: '#6F6B62' }}>
                    {active.length} active
                  </span>
                  <span className="ml-auto text-xs" style={{ color: '#6F6B62' }}>{isOpen ? '▲' : '▼'}</span>
                </button>
                <button
                  onClick={() => openEditTeam(team)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: '#6F6B62' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteTeam(team)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: '#E05A3A' }}
                >
                  Delete
                </button>
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
                          <div
                            key={p.id}
                            className="grid items-center py-1.5"
                            style={{ gridTemplateColumns: '10px 34px 1fr auto', gap: 8 }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: STATUS_COLORS[p.status] }}
                            />
                            <span
                              className="text-sm font-bold"
                              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FE5A01' }}
                            >
                              {p.number ?? '—'}
                            </span>
                            <span className="text-sm" style={{ color: '#0A0A0A' }}>
                              {p.first_name} {p.last_name}
                            </span>
                            <span className="text-xs uppercase" style={{ color: '#6F6B62' }}>
                              {p.positions.slice(0, 2).join(', ')}
                            </span>
                          </div>
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
                      className="flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider border"
                      style={{ borderColor: '#E3DFD6', color: '#6F6B62' }}
                    >
                      Build Game Card
                    </button>
                  </div>
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
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: '#6F6B62' }}>
                Team Name
              </label>
              <input
                autoFocus
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#E3DFD6' }}
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveTeam() }}
                placeholder="e.g. U10 Boys"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: '#6F6B62' }}>
                Division
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#E3DFD6' }}
                value={teamDivision}
                onChange={e => setTeamDivision(e.target.value)}
                placeholder="e.g. U10, U9 Rec, 8U Travel"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: '#6F6B62' }}>
                DocuSeal Template ID
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none font-mono"
                style={{ borderColor: '#E3DFD6' }}
                value={teamTemplateId}
                onChange={e => setTeamTemplateId(e.target.value)}
                placeholder="e.g. 4464458"
              />
              <p className="text-xs mt-1" style={{ color: '#9B968A' }}>From DocuSeal → Templates → copy the ID from the URL</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#6F6B62' }}>
                Mascot Photo
              </label>
              <div className="flex items-center gap-3">
                {mascotPreview ? (
                  <img src={mascotPreview} alt="Mascot"
                    style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, border: '1px solid #E3DFD6' }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: '#F6F3EE', border: '1px solid #E3DFD6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    ⚽
                  </div>
                )}
                <label className="flex-1 cursor-pointer py-2 px-3 rounded-lg text-xs font-semibold uppercase text-center"
                  style={{ border: '1px dashed #E3DFD6', color: '#6F6B62' }}>
                  {mascotPreview ? 'Change Photo' : 'Upload Photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleMascotPick} />
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTeamModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase border"
                style={{ borderColor: '#E3DFD6', color: '#6F6B62' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTeam}
                disabled={savingTeam || !teamName.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase text-white disabled:opacity-50"
                style={{ background: '#FE5A01' }}
              >
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
    </div>
  )
}
