'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Player, Team, PlayerStatus } from '@/lib/types'
import { ACTIVE_STATUSES, STATUS_COLORS } from '@/lib/types'
import { getTeams, getPlayers, deletePlayer } from '@/lib/supabase/queries'
import Modal from '@/components/Modal'
import PlayerForm from '@/components/PlayerForm'

const ALL_STATUSES: PlayerStatus[] = ['Confirmed', 'Prospective', 'Offered', 'Not Selected', 'Declined', 'Archived']

export default function PlayersPage() {
  const [teams,   setTeams]   = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const [search,        setSearch]        = useState('')
  const [filterTeam,    setFilterTeam]    = useState('')
  const [filterStatus,  setFilterStatus]  = useState('active') // 'active' | status value | 'all'
  const [editPlayer,    setEditPlayer]    = useState<Player | null>(null)
  const [showAddModal,  setShowAddModal]  = useState(false)

  useEffect(() => {
    Promise.all([getTeams(), getPlayers()]).then(([t, p]) => {
      setTeams(t)
      setPlayers(p)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return players.filter(p => {
      // Status filter
      if (filterStatus === 'active' && !ACTIVE_STATUSES.includes(p.status)) return false
      if (filterStatus !== 'active' && filterStatus !== 'all' && p.status !== filterStatus) return false
      // Team filter
      if (filterTeam && p.team_id !== filterTeam) return false
      // Search
      if (search) {
        const q = search.toLowerCase()
        const name = `${p.first_name} ${p.last_name}`.toLowerCase()
        if (!name.includes(q) && !(p.number ?? '').includes(q)) return false
      }
      return true
    }).sort((a, b) => a.last_name.localeCompare(b.last_name))
  }, [players, search, filterTeam, filterStatus])

  function teamName(teamId: string | null) {
    return teams.find(t => t.id === teamId)?.name ?? 'Unassigned'
  }

  function handlePlayerSaved(player: Player) {
    setPlayers(prev => {
      const idx = prev.findIndex(p => p.id === player.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = player; return next }
      return [...prev, player]
    })
    setEditPlayer(null)
    setShowAddModal(false)
  }

  async function handleDelete(player: Player) {
    if (!confirm(`Delete ${player.first_name} ${player.last_name}? This cannot be undone.`)) return
    await deletePlayer(player.id)
    setPlayers(prev => prev.filter(p => p.id !== player.id))
  }

  if (loading) return <div className="px-5 pt-8 text-sm" style={{ color: '#6F6B62' }}>Loading…</div>

  const activeCount = players.filter(p => ACTIVE_STATUSES.includes(p.status)).length

  return (
    <div className="px-5 pt-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-3xl font-bold uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}
        >
          Players
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-sm font-semibold uppercase tracking-wider px-4 py-2 rounded-xl text-white"
          style={{ background: '#FE5A01' }}
        >
          + Player
        </button>
      </div>

      {/* Stats */}
      <div
        className="grid grid-cols-3 rounded-xl overflow-hidden mb-4"
        style={{ background: '#E3DFD6', gap: 1 }}
      >
        {[
          { num: players.length, lbl: 'Total' },
          { num: activeCount,    lbl: 'Active' },
          { num: filtered.length, lbl: 'Shown' },
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

      {/* Search + filters */}
      <div className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          placeholder="Search name or number…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ borderColor: '#E3DFD6', background: '#fff' }}
        />
        <div className="flex gap-2">
          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: '#E3DFD6', background: '#fff' }}
          >
            <option value="">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: '#E3DFD6', background: '#fff' }}
          >
            <option value="active">Active</option>
            <option value="all">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Player cards */}
      <div className="flex flex-col gap-3">
        {filtered.map(player => {
          return (
            <div
              key={player.id}
              className="rounded-xl overflow-hidden"
              style={{ background: '#fff', boxShadow: '0 1px 2px rgba(21,21,26,0.06), 0 4px 14px rgba(21,21,26,0.06)', borderLeft: `4px solid #FE5A01` }}
            >
              {/* Collapsed row */}
              <button
                className="w-full px-4 py-3 flex items-center gap-3 text-left"
                onClick={() => router.push(`/players/${player.id}`)}
              >
                {/* Number */}
                <span
                  className="text-xl font-bold w-8 shrink-0"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FE5A01' }}
                >
                  {player.number ?? '—'}
                </span>

                {/* Name + team */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: '#0A0A0A' }}>
                    {player.first_name} {player.last_name}
                  </div>
                  <div className="text-xs truncate" style={{ color: '#6F6B62' }}>
                    {teamName(player.team_id)}
                    {player.positions.length > 0 && ` · ${player.positions.slice(0, 3).join(', ')}`}
                  </div>
                </div>

                {/* Status badge */}
                <span
                  className="text-xs font-bold uppercase px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: STATUS_COLORS[player.status] + '22',
                    color: STATUS_COLORS[player.status],
                  }}
                >
                  {player.status}
                </span>

                <span className="text-xs shrink-0" style={{ color: '#6F6B62' }}>›</span>
              </button>
            </div>
          )
        })}

        {filtered.length === 0 && !loading && (
          <p className="text-sm text-center py-8" style={{ color: '#6F6B62' }}>
            No players match your filters.
          </p>
        )}
      </div>

      {/* Add player modal */}
      {showAddModal && (
        <Modal title="Add Player" onClose={() => setShowAddModal(false)}>
          <PlayerForm
            teams={teams}
            onSave={handlePlayerSaved}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}

      {/* Edit player modal */}
      {editPlayer && (
        <Modal title="Edit Player" onClose={() => setEditPlayer(null)}>
          <PlayerForm
            teams={teams}
            player={editPlayer}
            onSave={handlePlayerSaved}
            onCancel={() => setEditPlayer(null)}
          />
        </Modal>
      )}
    </div>
  )
}
