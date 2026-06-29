'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Player, Team } from '@/lib/types'
import { ACTIVE_STATUSES } from '@/lib/types'
import { getTeams, getPlayers } from '@/lib/supabase/queries'
import { getLatestLineup, saveLineup } from '@/lib/supabase/lineup-queries'
import {
  FORMATION_LIBRARY, generateSlots, totalPlayers,
  type Slot,
} from '@/lib/formations'
import SoccerField from '@/components/SoccerField'

const FORMATS = ['5v5', '7v7', '9v9', '11v11'] as const
type Format = typeof FORMATS[number]

export default function GameCardPage() {
  const [teams,   setTeams]   = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  // Lineup state
  const [teamId,     setTeamId]     = useState('')
  const [format,     setFormat]     = useState<Format>('11v11')
  const [formation,  setFormation]  = useState('4-3-3')
  const [opponent,   setOpponent]   = useState('')
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [slots,      setSlots]      = useState<Slot[]>([])
  const [subs,       setSubs]       = useState<string[]>([])   // bench player IDs
  const [excluded,   setExcluded]   = useState<string[]>([])   // excluded player IDs
  const [savedId,    setSavedId]    = useState<string | undefined>()

  // Interaction state
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null)
  const [selectedSlotId,  setSelectedSlotId]  = useState<string | null>(null)
  const [saving,          setSaving]          = useState(false)
  const [saveMsg,         setSaveMsg]         = useState('')
  const [exporting,       setExporting]       = useState(false)

  const fieldRef = useRef<HTMLDivElement>(null)

  // Load data
  useEffect(() => {
    Promise.all([getTeams(), getPlayers()]).then(([t, p]) => {
      setTeams(t)
      setPlayers(p)
      if (t.length > 0) setTeamId(t[0].id)
      setLoading(false)
    })
  }, [])

  // When team changes, load latest lineup or reset
  useEffect(() => {
    if (!teamId) return
    getLatestLineup(teamId).then(lineup => {
      if (lineup) {
        setFormat(lineup.format as Format)
        setFormation(lineup.formation_name)
        setOpponent(lineup.opponent ?? '')
        setDate(lineup.date)
        setSlots(lineup.slots)
        setSubs(lineup.subs)
        setExcluded(lineup.excluded)
        setSavedId(lineup.id)
      } else {
        resetLineup(format, formation, teamId)
      }
    })
  }, [teamId])

  // When format or formation changes, reset slots (keep player assignments if possible)
  function resetLineup(fmt: Format, form: string, tid: string) {
    const newSlots   = generateSlots(
      FORMATION_LIBRARY[fmt].find(f => f.name === form)?.lines ??
      FORMATION_LIBRARY[fmt][0].lines
    )
    const activePlayers = players
      .filter(p => p.team_id === tid && ACTIVE_STATUSES.includes(p.status))
      .map(p => p.id)
    setSlots(newSlots)
    setSubs(activePlayers)
    setExcluded([])
    setSelectedBenchId(null)
    setSelectedSlotId(null)
  }

  function handleFormatChange(fmt: Format) {
    setFormat(fmt)
    const firstForm = FORMATION_LIBRARY[fmt][0].name
    setFormation(firstForm)
    resetLineup(fmt, firstForm, teamId)
  }

  function handleFormationChange(form: string) {
    setFormation(form)
    resetLineup(format, form, teamId)
  }

  function handleTeamChange(tid: string) {
    setTeamId(tid)
    setSavedId(undefined)
  }

  // Player lookup map
  const playerMap: Record<string, Player> = {}
  players.forEach(p => { playerMap[p.id] = p })

  // All players on this team (active)
  const teamPlayers = players.filter(
    p => p.team_id === teamId && ACTIVE_STATUSES.includes(p.status)
  )

  // Players currently on the field
  const onFieldIds = new Set(slots.map(s => s.player_id).filter(Boolean) as string[])

  // Bench = subs not on field, not excluded
  const benchIds    = subs.filter(id => !onFieldIds.has(id) && !excluded.includes(id))
  const excludedIds = excluded

  // Tap a bench player chip
  function handleBenchTap(playerId: string) {
    if (selectedBenchId === playerId) {
      setSelectedBenchId(null)
    } else {
      setSelectedBenchId(playerId)
      setSelectedSlotId(null)
    }
  }

  // Tap a field slot
  function handleSlotTap(slot: Slot) {
    if (selectedBenchId) {
      // Place selected bench player into this slot
      setSlots(prev => prev.map(s => {
        if (s.id === slot.id) return { ...s, player_id: selectedBenchId }
        // If this player was in another slot, clear it
        if (s.player_id === selectedBenchId) return { ...s, player_id: null }
        return s
      }))
      setSelectedBenchId(null)
    } else if (slot.player_id) {
      // Remove player from field → back to bench
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, player_id: null } : s))
    } else {
      // Empty slot tap with no bench selection — highlight the slot for next bench tap
      setSelectedSlotId(prev => prev === slot.id ? null : slot.id)
    }
  }

  // Tap an excluded player → re-include on bench
  function handleReinclude(playerId: string) {
    setExcluded(prev => prev.filter(id => id !== playerId))
    if (!subs.includes(playerId)) setSubs(prev => [...prev, playerId])
  }

  // Long-press or exclude button on bench player
  function handleExclude(playerId: string) {
    setExcluded(prev => [...prev, playerId])
    setSubs(prev => prev.filter(id => id !== playerId))
    setSelectedBenchId(null)
  }

  async function handleSave() {
    if (!teamId) return
    setSaving(true)
    const lineup = await saveLineup({
      ...(savedId ? { id: savedId } : {}),
      team_id:        teamId,
      date,
      format,
      formation_name: formation,
      opponent:       opponent || null,
      slots,
      subs,
      excluded,
    })
    setSavedId(lineup.id)
    setSaving(false)
    setSaveMsg('Saved!')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  async function handleExport() {
    if (!fieldRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(fieldRef.current, {
        backgroundColor: '#0A0A0A',
        scale: 2,
        useCORS: true,
      })
      canvas.toBlob(async blob => {
        if (!blob) return
        const file = new File([blob], 'm4-lineup.png', { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'M4 Lineup' })
        } else {
          // Fallback: download
          const url = URL.createObjectURL(blob)
          const a   = document.createElement('a')
          a.href    = url
          a.download = 'm4-lineup.png'
          a.click()
          URL.revokeObjectURL(url)
        }
        setExporting(false)
      }, 'image/png')
    } catch {
      setExporting(false)
    }
  }

  if (loading) return <div className="px-5 pt-8 text-sm" style={{ color: '#6F6B62' }}>Loading…</div>

  const fieldW = 340
  const fieldH = 480

  return (
    <div className="px-4 pt-4 pb-4 flex flex-col gap-3">
      <h2
        className="text-3xl font-bold uppercase"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}
      >
        Game Card
      </h2>

      {/* Controls */}
      <div className="flex flex-col gap-2">
        {/* Team + Date */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={teamId}
            onChange={e => handleTeamChange(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: '#E3DFD6', background: '#fff' }}
          >
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" value={date}
            onChange={e => setDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: '#E3DFD6', background: '#fff' }}
          />
        </div>

        {/* Opponent */}
        <input
          placeholder="Opponent (optional)"
          value={opponent}
          onChange={e => setOpponent(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none w-full"
          style={{ borderColor: '#E3DFD6', background: '#fff' }}
        />

        {/* Format chips */}
        <div className="flex gap-2">
          {FORMATS.map(fmt => (
            <button key={fmt} onClick={() => handleFormatChange(fmt)}
              className="flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-colors"
              style={{
                background: format === fmt ? '#0A0A0A' : '#F6F3EE',
                color:      format === fmt ? '#fff'    : '#6F6B62',
              }}>
              {fmt}
            </button>
          ))}
        </div>

        {/* Formation chips */}
        <div className="flex gap-2 flex-wrap">
          {FORMATION_LIBRARY[format].map(f => (
            <button key={f.name} onClick={() => handleFormationChange(f.name)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors"
              style={{
                background: formation === f.name ? '#FE5A01' : '#F6F3EE',
                color:      formation === f.name ? '#fff'    : '#6F6B62',
              }}>
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Field + bench layout */}
      <div ref={fieldRef} className="flex gap-3 items-start">
        {/* Field */}
        <div style={{ flex: '0 0 auto' }}>
          <SoccerField
            slots={slots}
            players={playerMap}
            selectedSlotId={selectedSlotId}
            onSlotTap={handleSlotTap}
            fieldWidth={fieldW}
            fieldHeight={fieldH}
          />
        </div>

        {/* Bench panel */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6F6B62' }}>
            Bench ({benchIds.length})
          </p>
          {benchIds.map(id => {
            const p = playerMap[id]
            if (!p) return null
            const isSelected = selectedBenchId === id
            return (
              <div key={id} className="flex flex-col gap-1">
                <button
                  onClick={() => handleBenchTap(id)}
                  className="w-full text-left px-2 py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: isSelected ? '#FE5A01' : '#fff',
                    color:      isSelected ? '#fff'    : '#0A0A0A',
                    border:     `1px solid ${isSelected ? '#FE5A01' : '#E3DFD6'}`,
                    boxShadow:  '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <span style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : '#FE5A01', fontFamily: "'Barlow Condensed'" }}>
                    #{p.number ?? '—'}
                  </span>
                  {' '}
                  {p.first_name[0]}. {p.last_name}
                  <div className="text-xs mt-0.5" style={{ color: isSelected ? 'rgba(255,255,255,0.6)' : '#6F6B62' }}>
                    {p.positions[0] ?? ''}
                  </div>
                </button>
                {isSelected && (
                  <button onClick={() => handleExclude(id)}
                    className="w-full py-1 rounded text-xs"
                    style={{ color: '#E05A3A', background: '#FEF0EC' }}>
                    Exclude
                  </button>
                )}
              </div>
            )
          })}

          {/* Excluded */}
          {excludedIds.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: '#B9B4A8' }}>
                Out ({excludedIds.length})
              </p>
              {excludedIds.map(id => {
                const p = playerMap[id]
                if (!p) return null
                return (
                  <button key={id} onClick={() => handleReinclude(id)}
                    className="w-full text-left px-2 py-2 rounded-lg text-xs"
                    style={{ background: '#F6F3EE', color: '#B9B4A8', border: '1px solid #E3DFD6' }}>
                    {p.first_name[0]}. {p.last_name} <span className="text-xs">↩</span>
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-center" style={{ color: '#B9B4A8' }}>
        {selectedBenchId
          ? 'Tap a spot on the field to place player'
          : 'Tap a bench player, then tap a field spot'}
      </p>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !teamId}
          className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: saveMsg ? '#2F8F54' : '#0A0A0A' }}
        >
          {saveMsg || (saving ? 'Saving…' : 'Save Lineup')}
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider disabled:opacity-50"
          style={{ background: '#FE5A01', color: '#fff' }}
        >
          {exporting ? 'Exporting…' : 'Share Card'}
        </button>
      </div>
    </div>
  )
}
