'use client'

import { useEffect, useRef, useState } from 'react'
import type { Player, Team } from '@/lib/types'
import { ACTIVE_STATUSES } from '@/lib/types'
import { getTeams, getPlayers } from '@/lib/supabase/queries'
import { getLatestLineup, saveLineup } from '@/lib/supabase/lineup-queries'
import { FORMATION_LIBRARY, generateSlots, type Slot } from '@/lib/formations'
import SoccerField from '@/components/SoccerField'
import Modal from '@/components/Modal'

const FORMATS = ['5v5', '7v7', '9v9', '11v11'] as const
type Format = typeof FORMATS[number]

export default function GameCardPage() {
  const [teams,   setTeams]   = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  const [teamId,    setTeamId]    = useState('')
  const [format,    setFormat]    = useState<Format>('11v11')
  const [formation, setFormation] = useState('4-3-3')
  const [date,      setDate]      = useState(new Date().toISOString().slice(0, 10))
  const [slots,     setSlots]     = useState<Slot[]>([])
  const [subs,      setSubs]      = useState<string[]>([])
  const [excluded,  setExcluded]  = useState<string[]>([])
  const [savedId,   setSavedId]   = useState<string | undefined>()

  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null)
  const [selectedSlotId,  setSelectedSlotId]  = useState<string | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState('')

  // Export modal state
  const [showExport,   setShowExport]   = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const [expOpponent,  setExpOpponent]  = useState('')
  const [expField,     setExpField]     = useState('')
  const [expKitColor,  setExpKitColor]  = useState('')
  const [expHomeAway,  setExpHomeAway]  = useState<'Home' | 'Away'>('Home')
  const [expDate,      setExpDate]      = useState(date)

  // Field dimensions
  const [fieldW, setFieldW] = useState(340)
  const fieldH = Math.round(fieldW * 1.0)
  const containerRef = useRef<HTMLDivElement>(null)
  const exportRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function measure() {
      if (containerRef.current) setFieldW(containerRef.current.offsetWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    Promise.all([getTeams(), getPlayers()]).then(([t, p]) => {
      setTeams(t); setPlayers(p)
      if (t.length > 0) setTeamId(t[0].id)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!teamId) return
    getLatestLineup(teamId).then(lineup => {
      if (lineup) {
        setFormat(lineup.format as Format)
        setFormation(lineup.formation_name)
        setDate(lineup.date)
        setSlots(lineup.slots)
        setSubs(lineup.subs)
        setExcluded(lineup.excluded)
        setSavedId(lineup.id)
      } else {
        resetLineup('11v11', '4-3-3', teamId)
      }
    })
  }, [teamId])

  function resetLineup(fmt: Format, form: string, tid: string) {
    const lines = FORMATION_LIBRARY[fmt].find(f => f.name === form)?.lines ?? FORMATION_LIBRARY[fmt][0].lines
    const active = players.filter(p => p.team_id === tid && ACTIVE_STATUSES.includes(p.status)).map(p => p.id)
    setSlots(generateSlots(lines)); setSubs(active); setExcluded([])
    setSelectedBenchId(null); setSelectedSlotId(null)
  }

  function handleFormatChange(fmt: Format) {
    setFormat(fmt)
    const first = FORMATION_LIBRARY[fmt][0].name
    setFormation(first)
    resetLineup(fmt, first, teamId)
  }

  function handleFormationChange(form: string) {
    setFormation(form)
    resetLineup(format, form, teamId)
  }

  const playerMap: Record<string, Player> = {}
  players.forEach(p => { playerMap[p.id] = p })

  const onFieldIds  = new Set(slots.map(s => s.player_id).filter(Boolean) as string[])
  const benchIds    = subs.filter(id => !onFieldIds.has(id) && !excluded.includes(id))
  const excludedIds = excluded

  function handleBenchTap(id: string) {
    if (selectedBenchId === id) setSelectedBenchId(null)
    else { setSelectedBenchId(id); setSelectedSlotId(null) }
  }

  function handleSlotTap(slot: Slot) {
    if (selectedBenchId) {
      setSlots(prev => prev.map(s => {
        if (s.id === slot.id) return { ...s, player_id: selectedBenchId }
        if (s.player_id === selectedBenchId) return { ...s, player_id: null }
        return s
      }))
      setSelectedBenchId(null)
    } else if (slot.player_id) {
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, player_id: null } : s))
    } else {
      setSelectedSlotId(prev => prev === slot.id ? null : slot.id)
    }
  }

  function handleExclude(id: string) {
    setExcluded(prev => [...prev, id]); setSubs(prev => prev.filter(x => x !== id)); setSelectedBenchId(null)
  }

  function handleReinclude(id: string) {
    setExcluded(prev => prev.filter(x => x !== id))
    if (!subs.includes(id)) setSubs(prev => [...prev, id])
  }

  async function handleSave() {
    if (!teamId) return
    setSaving(true)
    const lineup = await saveLineup({
      ...(savedId ? { id: savedId } : {}),
      team_id: teamId, date, format,
      formation_name: formation,
      opponent: expOpponent || null,
      slots, subs, excluded,
    })
    setSavedId(lineup.id); setSaving(false)
    setSaveMsg('Saved!'); setTimeout(() => setSaveMsg(''), 2000)
  }

  async function handleExport() {
    if (!exportRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(exportRef.current, { backgroundColor: '#0A0A0A', scale: 2, useCORS: true })
      canvas.toBlob(async blob => {
        if (!blob) return
        const file = new File([blob], 'm4-lineup.png', { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'M4 Lineup' })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = 'm4-lineup.png'; a.click()
          URL.revokeObjectURL(url)
        }
        setExporting(false); setShowExport(false)
      }, 'image/png')
    } catch { setExporting(false) }
  }

  if (loading) return <div className="px-5 pt-8 text-sm" style={{ color: '#6F6B62' }}>Loading…</div>

  const sel = 'border rounded-lg px-3 py-2 text-sm focus:outline-none'
  const selStyle = { borderColor: '#E3DFD6', background: '#fff' }

  return (
    <div className="flex flex-col pb-4">

      {/* ── Controls ── */}
      <div className="px-4 pt-3 flex flex-col gap-2">
        {/* Team + Date */}
        <div className="grid grid-cols-2 gap-2">
          <select value={teamId} onChange={e => { setTeamId(e.target.value); setSavedId(undefined) }}
            className={sel} style={selStyle}>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className={sel} style={selStyle} />
        </div>

        {/* Format + Formation dropdowns */}
        <div className="grid grid-cols-2 gap-2">
          <select value={format} onChange={e => handleFormatChange(e.target.value as Format)}
            className={sel} style={selStyle}>
            {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={formation} onChange={e => handleFormationChange(e.target.value)}
            className={sel} style={selStyle}>
            {FORMATION_LIBRARY[format].map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Bench — single horizontal scrollable row above field ── */}
      <div className="mt-2 px-4">
        <div className="flex items-center mb-2">
          <p className="text-xs font-bold uppercase tracking-wider shrink-0" style={{ color: '#6F6B62' }}>
            Bench ({benchIds.length})
          </p>
          <p className="flex-1 text-xs text-center" style={{ color: '#B9B4A8' }}>
            {selectedBenchId ? 'Tap a field spot to place' : 'Tap a player, then a spot'}
          </p>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
            {benchIds.length === 0 && (
              <span className="text-xs" style={{ color: '#B9B4A8' }}>All players placed or excluded.</span>
            )}
            {benchIds.map(id => {
              const p = playerMap[id]
              if (!p) return null
              const isSel = selectedBenchId === id
              return (
                <div key={id} className="flex flex-col gap-1">
                  <button onClick={() => handleBenchTap(id)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
                    style={{
                      background: isSel ? '#FE5A01' : '#fff',
                      color:      isSel ? '#fff'    : '#0A0A0A',
                      border:     `1px solid ${isSel ? '#FE5A01' : '#E3DFD6'}`,
                      boxShadow:  '0 1px 3px rgba(0,0,0,0.06)',
                    }}>
                    <span style={{ color: isSel ? 'rgba(255,255,255,0.8)' : '#FE5A01', fontFamily: "'Barlow Condensed'" }}>
                      #{p.number ?? '—'}
                    </span>
                    {' '}{p.first_name[0]}. {p.last_name}
                    {p.positions[0] && <span className="ml-1" style={{ color: isSel ? 'rgba(255,255,255,0.6)' : '#6F6B62' }}>· {p.positions[0]}</span>}
                  </button>
                  {isSel && (
                    <button onClick={() => handleExclude(id)}
                      className="px-2 py-0.5 rounded text-xs text-center"
                      style={{ color: '#E05A3A', background: '#FEF0EC' }}>
                      Exclude
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Field ── */}
      <div ref={containerRef} className="px-4 mt-2">
        <div ref={exportRef}>
          <SoccerField
            slots={slots}
            players={playerMap}
            selectedSlotId={selectedSlotId}
            onSlotTap={handleSlotTap}
            fieldWidth={fieldW}
            fieldHeight={fieldH}
          />
        </div>
      </div>

      {/* Excluded */}
      {excludedIds.length > 0 && (
        <div className="mt-2 px-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#B9B4A8' }}>
            Out ({excludedIds.length})
          </p>
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
              {excludedIds.map(id => {
                const p = playerMap[id]
                if (!p) return null
                return (
                  <button key={id} onClick={() => handleReinclude(id)}
                    className="px-3 py-1.5 rounded-xl text-xs whitespace-nowrap"
                    style={{ background: '#F6F3EE', color: '#B9B4A8', border: '1px solid #E3DFD6' }}>
                    {p.first_name[0]}. {p.last_name} ↩
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-2 px-4 mt-4">
        <button onClick={handleSave} disabled={saving || !teamId}
          className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ background: saveMsg ? '#2F8F54' : '#0A0A0A' }}>
          {saveMsg || (saving ? 'Saving…' : 'Save Lineup')}
        </button>
        <button onClick={() => { setExpDate(date); setShowExport(true) }}
          className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider"
          style={{ background: '#FE5A01', color: '#fff' }}>
          Share Card
        </button>
      </div>

      {/* ── Export Modal ── */}
      {showExport && (
        <Modal title="Share Game Card" onClose={() => setShowExport(false)}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#6F6B62' }}>Date</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: '#E3DFD6' }} value={expDate} onChange={e => setExpDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#6F6B62' }}>Home / Away</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: '#E3DFD6' }} value={expHomeAway}
                  onChange={e => setExpHomeAway(e.target.value as 'Home' | 'Away')}>
                  <option>Home</option>
                  <option>Away</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#6F6B62' }}>Opponent</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#E3DFD6' }} placeholder="e.g. FC Dallas"
                value={expOpponent} onChange={e => setExpOpponent(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#6F6B62' }}>Field / Location</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#E3DFD6' }} placeholder="e.g. Scharbauer Sports Complex"
                value={expField} onChange={e => setExpField(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#6F6B62' }}>Kit Color</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#E3DFD6' }} placeholder="e.g. Orange"
                value={expKitColor} onChange={e => setExpKitColor(e.target.value)} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowExport(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase border"
                style={{ borderColor: '#E3DFD6', color: '#6F6B62' }}>
                Cancel
              </button>
              <button onClick={handleExport} disabled={exporting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold uppercase text-white disabled:opacity-50"
                style={{ background: '#FE5A01' }}>
                {exporting ? 'Exporting…' : 'Export PNG'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
