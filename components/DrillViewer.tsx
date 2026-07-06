'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type KF = { t: number; x: number; y: number }
type DrillElement = {
  id: string
  type: 'player' | 'cone' | 'ball' | 'gate'
  x: number
  y: number
  label?: string
  color?: string
  textColor?: string
  lineColor?: string
  size?: number
  width?: number
  rotation?: number
  keyframes?: KF[]
}

export type DrillData = {
  title: string
  subtitle?: string
  notes?: string
  animation: { duration: number; speed: number }
  field: { layout: string; surface?: string }
  elements: DrillElement[]
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function getPos(el: DrillElement, time: number): { x: number; y: number } {
  const kfs = el.keyframes
  if (!kfs || kfs.length === 0) return { x: el.x, y: el.y }
  if (time <= kfs[0].t) return { x: kfs[0].x, y: kfs[0].y }
  const last = kfs[kfs.length - 1]
  if (time >= last.t) return { x: last.x, y: last.y }
  for (let i = 0; i < kfs.length - 1; i++) {
    if (time >= kfs[i].t && time <= kfs[i + 1].t) {
      const a = (time - kfs[i].t) / (kfs[i + 1].t - kfs[i].t)
      return { x: lerp(kfs[i].x, kfs[i + 1].x, a), y: lerp(kfs[i].y, kfs[i + 1].y, a) }
    }
  }
  return { x: last.x, y: last.y }
}

type Props = { data: DrillData; width: number }

export default function DrillViewer({ data, width }: Props) {
  const scale = width / 800
  const sx = (v: number) => v * scale

  const duration = data.animation?.duration ?? 2
  const speed = data.animation?.speed ?? 1
  const layout = data.field?.layout ?? 'blank'

  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const rafRef = useRef<number>()
  const lastRef = useRef<number>()
  const playingRef = useRef(false)

  function startLoop() {
    playingRef.current = true
    lastRef.current = undefined

    function tick(now: number) {
      if (!playingRef.current) return
      if (lastRef.current == null) lastRef.current = now
      const dt = (now - lastRef.current) / 1000
      lastRef.current = now

      setTime(prev => {
        const next = prev + dt * speed
        if (next >= duration) {
          playingRef.current = false
          setPlaying(false)
          return duration
        }
        return next
      })

      if (playingRef.current) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  function stopLoop() {
    playingRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  useEffect(() => () => stopLoop(), [])

  function handlePlay() {
    if (time >= duration) {
      setTime(0)
      // give React a tick to update time before starting
      setTimeout(() => { setPlaying(true); startLoop() }, 0)
    } else {
      setPlaying(true)
      startLoop()
    }
  }

  function handlePause() {
    setPlaying(false)
    stopLoop()
  }

  function handleReset() {
    stopLoop()
    setPlaying(false)
    setTime(0)
  }

  return (
    <div>
      {/* Field */}
      <div style={{ borderRadius: 12, overflow: 'hidden' }}>
        <svg width={width} height={width} viewBox={`0 0 ${width} ${width}`}>
          <rect width={width} height={width} fill="#0a0a0a" />

          {/* Field markings */}
          <g stroke="#FE5A01" strokeWidth={1.5} fill="none" opacity={0.85}>
            {/* Outer border */}
            <rect x={sx(60)} y={sx(60)} width={sx(680)} height={sx(680)} />

            {layout === 'half' && <>
              <rect x={sx(280)} y={sx(60)} width={sx(240)} height={sx(20)} fill="#0a0a0a" stroke="#FE5A01" />
              <rect x={sx(180)} y={sx(60)} width={sx(440)} height={sx(145)} />
              <rect x={sx(255)} y={sx(60)} width={sx(290)} height={sx(80)} />
            </>}

            {layout === 'full' && <>
              <line x1={sx(60)} y1={sx(400)} x2={sx(740)} y2={sx(400)} />
              <circle cx={sx(400)} cy={sx(400)} r={sx(80)} />
              <circle cx={sx(400)} cy={sx(400)} r={sx(4)} fill="#FE5A01" stroke="none" />
              {/* Top goal + boxes */}
              <rect x={sx(285)} y={sx(40)} width={sx(230)} height={sx(20)} fill="#0a0a0a" stroke="#FE5A01" />
              <rect x={sx(190)} y={sx(60)} width={sx(420)} height={sx(140)} />
              <rect x={sx(265)} y={sx(60)} width={sx(270)} height={sx(70)} />
              {/* Bottom goal + boxes */}
              <rect x={sx(285)} y={sx(740)} width={sx(230)} height={sx(20)} fill="#0a0a0a" stroke="#FE5A01" />
              <rect x={sx(190)} y={sx(600)} width={sx(420)} height={sx(140)} />
              <rect x={sx(265)} y={sx(630)} width={sx(270)} height={sx(70)} />
            </>}
          </g>

          {/* M4 watermark */}
          <image
            href="/m4shield.png"
            x={sx(300)} y={sx(300)} width={sx(200)} height={sx(200)}
            opacity={0.28}
            style={{ pointerEvents: 'none' }}
          />

          {/* Elements */}
          {(data.elements ?? []).map(el => {
            const pos = getPos(el, time)
            const cx = sx(pos.x)
            const cy = sx(pos.y)
            const color = el.color ?? '#FE5A01'
            const tColor = el.textColor ?? '#fff'

            if (el.type === 'player') {
              const r = sx((el.size ?? 20) * 0.85)
              return (
                <g key={el.id}>
                  <circle cx={cx} cy={cy} r={r}
                    fill={color}
                    stroke={el.lineColor ?? 'rgba(255,255,255,0.25)'}
                    strokeWidth={1} />
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                    fontSize={r * 0.95} fontWeight="700"
                    fontFamily="'Barlow Condensed', sans-serif"
                    fill={tColor}>
                    {el.label}
                  </text>
                </g>
              )
            }

            if (el.type === 'cone') {
              const s = sx(el.size ?? 11) * 1.1
              return (
                <polygon key={el.id}
                  points={`${cx},${cy - s} ${cx - s * 0.75},${cy + s * 0.55} ${cx + s * 0.75},${cy + s * 0.55}`}
                  fill={color} opacity={0.9} />
              )
            }

            if (el.type === 'ball') {
              const r = sx((el.size ?? 14) * 0.7)
              return (
                <g key={el.id}>
                  <circle cx={cx} cy={cy} r={r} fill={color}
                    stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
                  <circle cx={cx} cy={cy} r={r * 0.35} fill="rgba(0,0,0,0.3)" />
                </g>
              )
            }

            if (el.type === 'gate') {
              const s = sx(el.size ?? 10)
              const gap = sx((el.width ?? 50) / 2)
              const rad = ((el.rotation ?? 0) * Math.PI) / 180
              // Rotate the offset positions, keep each cone pointing upward
              const dx = Math.cos(rad) * gap
              const dy = Math.sin(rad) * gap
              const cone = (ox: number, oy: number) =>
                `${ox},${oy - s} ${ox - s * 0.75},${oy + s * 0.55} ${ox + s * 0.75},${oy + s * 0.55}`
              return (
                <g key={el.id}>
                  <polygon points={cone(cx - dx, cy - dy)} fill={color} opacity={0.9} />
                  <polygon points={cone(cx + dx, cy + dy)} fill={color} opacity={0.9} />
                </g>
              )
            }

            return null
          })}
        </svg>
      </div>

      {/* Progress bar */}
      <div className="mt-2 mx-0.5 rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(0,0,0,0.1)' }}>
        <div className="h-full rounded-full" style={{ width: `${(time / duration) * 100}%`, background: '#FE5A01', transition: 'none' }} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mt-3">
        {playing ? (
          <button onClick={handlePause}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold uppercase tracking-wider text-white"
            style={{ background: '#6F6B62' }}>
            Pause
          </button>
        ) : (
          <button onClick={handlePlay}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold uppercase tracking-wider text-white"
            style={{ background: '#FE5A01' }}>
            {time > 0 && time < duration ? 'Resume' : 'Play'}
          </button>
        )}
        <button onClick={handleReset}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold uppercase tracking-wider border"
          style={{ borderColor: '#E3DFD6', color: '#6F6B62' }}>
          Reset
        </button>
        <span className="text-xs ml-auto" style={{ color: '#9B968A' }}>
          {time.toFixed(1)}s / {duration}s · {speed}×
        </span>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="mt-4 p-3 rounded-xl" style={{ background: '#F6F3EE' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#6F6B62' }}>Notes</p>
          <p className="text-sm" style={{ color: '#0A0A0A', lineHeight: 1.5 }}>{data.notes}</p>
        </div>
      )}
    </div>
  )
}
