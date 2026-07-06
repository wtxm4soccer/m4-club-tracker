'use client'

import { useEffect, useRef, useState } from 'react'
import DrillViewer, { type DrillData } from '@/components/DrillViewer'
import { getDrills, saveDrill, deleteDrill, type Drill } from '@/lib/supabase/drill-queries'

export default function DrillsPage() {
  const [drills, setDrills] = useState<Drill[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getDrills().then(d => { setDrills(d); setLoading(false) })
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')

    try {
      const text = await file.text()
      const json = JSON.parse(text) as DrillData

      if (!json.title || !json.elements || !json.animation) {
        throw new Error('Invalid drill file — missing title, elements, or animation')
      }

      const drill = await saveDrill({
        title: json.title,
        subtitle: json.subtitle ?? null,
        notes: json.notes ?? null,
        field_layout: json.field?.layout ?? 'blank',
        duration: json.animation.duration,
        speed: json.animation.speed,
        data: json,
      })

      setDrills(prev => [drill, ...prev])
      setExpanded(prev => ({ ...prev, [drill.id]: true }))
    } catch (err: any) {
      setUploadError(err.message ?? 'Failed to load file')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(drill: Drill) {
    if (!confirm(`Delete "${drill.title}"?`)) return
    await deleteDrill(drill.id)
    setDrills(prev => prev.filter(d => d.id !== drill.id))
  }

  if (loading) return <div className="px-5 pt-8 text-sm" style={{ color: '#6F6B62' }}>Loading…</div>

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-5 pt-5 pb-4" style={{ background: '#F6F3EE' }}>
        <div className="flex items-center justify-between">
          <h2
            className="text-3xl font-bold uppercase"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}
          >
            Drills
          </h2>
          <label
            className="text-sm font-semibold uppercase tracking-wider px-4 py-2 rounded-xl text-white cursor-pointer"
            style={{ background: uploading ? '#B9B4A8' : '#FE5A01' }}
          >
            {uploading ? 'Loading…' : '+ Drill'}
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleUpload} />
          </label>
        </div>
        {uploadError && (
          <p className="text-xs mt-2 font-medium" style={{ color: '#E05A3A' }}>{uploadError}</p>
        )}
      </div>

      {/* Drill list */}
      <div className="flex flex-col gap-3 px-5 pb-4">
        {drills.map(drill => {
          const isOpen = expanded[drill.id]
          const data = drill.data as DrillData

          return (
            <div
              key={drill.id}
              className="rounded-xl overflow-hidden"
              style={{
                background: '#fff',
                boxShadow: '0 1px 2px rgba(21,21,26,0.06), 0 4px 14px rgba(21,21,26,0.06)',
                borderLeft: '4px solid #FE5A01',
              }}
            >
              {/* Collapsed row */}
              <button
                className="w-full px-4 py-3 flex items-center gap-3 text-left"
                onClick={() => setExpanded(prev => ({ ...prev, [drill.id]: !prev[drill.id] }))}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: '#0A0A0A' }}>{drill.title}</div>
                  {drill.subtitle && (
                    <div className="text-xs truncate" style={{ color: '#6F6B62' }}>{drill.subtitle}</div>
                  )}
                </div>
<span className="text-xs shrink-0" style={{ color: '#6F6B62' }}>
                  {isOpen ? '▲' : '▼'}
                </span>
              </button>

              {/* Expanded — viewer */}
              {isOpen && (
                <div className="border-t" style={{ borderColor: '#E3DFD6' }}>
                  {data?.elements ? (
                    <>
                      {/* Full-width animation */}
                      <div className="px-4 pt-4">
                        <DrillViewer
                          data={data}
                          width={Math.min(480, (typeof window !== 'undefined' ? window.innerWidth : 480) - 80)}
                        />
                      </div>

                      {/* Details grid */}
                      <div className="px-4 pt-4 pb-2">
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {(data as any).drillDetails?.spaceSize && (
                            <div className="rounded-xl p-2.5 text-center" style={{ background: '#F6F3EE' }}>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#B9B4A8' }}>Space</p>
                              <p className="text-sm font-bold leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}>
                                {(data as any).drillDetails.spaceSize}
                              </p>
                            </div>
                          )}
                          {(data as any).drillDetails?.playerRange && (
                            <div className="rounded-xl p-2.5 text-center" style={{ background: '#F6F3EE' }}>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#B9B4A8' }}>Players</p>
                              <p className="text-sm font-bold leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}>
                                {(data as any).drillDetails.playerRange}
                              </p>
                            </div>
                          )}
                          <div className="rounded-xl p-2.5 text-center" style={{ background: '#F6F3EE' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#B9B4A8' }}>Duration</p>
                            <p className="text-sm font-bold leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0A0A0A' }}>
                              {data.animation?.duration ?? drill.duration}s
                            </p>
                          </div>
                        </div>

                        {/* Skill focus tags */}
                        {(data as any).drillDetails?.skillFocus?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#B9B4A8' }}>Skill Focus</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(data as any).drillDetails.skillFocus.map((s: string) => (
                                <span key={s} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                  style={{ background: '#FE5A0115', color: '#FE5A01', border: '1px solid #FE5A0130' }}>
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {data.notes && (
                          <div className="mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#B9B4A8' }}>Notes</p>
                            <p className="text-sm leading-snug" style={{ color: '#6F6B62' }}>{data.notes}</p>
                          </div>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(drill)}
                          className="w-full py-2 rounded-lg text-xs font-semibold uppercase mb-1"
                          style={{ color: '#E05A3A', background: '#FEF0EC' }}
                        >
                          Delete Drill
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs py-4 text-center px-4" style={{ color: '#E05A3A' }}>Invalid drill data — re-upload the JSON.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {drills.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">⚽</div>
            <p className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>No drills yet</p>
            <p className="text-xs mt-1" style={{ color: '#6F6B62' }}>
              Tap <strong>+ Drill</strong> to upload a drill JSON file.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
