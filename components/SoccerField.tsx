import type { Slot } from '@/lib/formations'
import type { Player } from '@/lib/types'

type Props = {
  slots: Slot[]
  players: Record<string, Player>   // id → player
  selectedSlotId: string | null
  onSlotTap: (slot: Slot) => void
  fieldWidth: number
  fieldHeight: number
}

export default function SoccerField({
  slots, players, selectedSlotId, onSlotTap, fieldWidth, fieldHeight,
}: Props) {
  const W = fieldWidth
  const H = fieldHeight

  // Field markings helpers
  const fx = (pct: number) => (pct / 100) * W
  const fy = (pct: number) => (pct / 100) * H

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', borderRadius: 12, overflow: 'hidden' }}
    >
      {/* Background */}
      <rect width={W} height={H} fill="#000000" />

      {/* Pitch markings — white, low opacity */}
      <g stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} fill="none">
        {/* Outer boundary */}
        <rect x={fx(4)} y={fy(2)} width={fx(92)} height={fy(96)} />

        {/* Center line */}
        <line x1={fx(4)} y1={fy(50)} x2={fx(96)} y2={fy(50)} />

        {/* Center circle */}
        <circle cx={fx(50)} cy={fy(50)} r={fy(9)} />
        <circle cx={fx(50)} cy={fy(50)} r={1.5} fill="rgba(255,255,255,0.55)" stroke="none" />

        {/* Top penalty area */}
        <rect x={fx(22)} y={fy(2)} width={fx(56)} height={fy(16)} />
        {/* Top goal area */}
        <rect x={fx(35)} y={fy(2)} width={fx(30)} height={fy(6)} />
        {/* Top goal */}
        <rect x={fx(42)} y={fy(0)} width={fx(16)} height={fy(2.5)} strokeWidth={2} />

        {/* Bottom penalty area */}
        <rect x={fx(22)} y={fy(82)} width={fx(56)} height={fy(16)} />
        {/* Bottom goal area */}
        <rect x={fx(35)} y={fy(92)} width={fx(30)} height={fy(6)} />
        {/* Bottom goal */}
        <rect x={fx(42)} y={fy(97.5)} width={fx(16)} height={fy(2.5)} strokeWidth={2} />

        {/* Corner arcs */}
        <path d={`M ${fx(4)} ${fy(4.5)} A ${fy(2.5)} ${fy(2.5)} 0 0 1 ${fx(6.5)} ${fy(2)}`} />
        <path d={`M ${fx(93.5)} ${fy(2)} A ${fy(2.5)} ${fy(2.5)} 0 0 1 ${fx(96)} ${fy(4.5)}`} />
        <path d={`M ${fx(4)} ${fy(95.5)} A ${fy(2.5)} ${fy(2.5)} 0 0 0 ${fx(6.5)} ${fy(98)}`} />
        <path d={`M ${fx(93.5)} ${fy(98)} A ${fy(2.5)} ${fy(2.5)} 0 0 0 ${fx(96)} ${fy(95.5)}`} />
      </g>

      {/* M4 cross watermark at center */}
      <image
        href="/m4cross.png"
        x={fx(50) - fy(10)}
        y={fy(50) - fy(10)}
        width={fy(20)}
        height={fy(20)}
        opacity={0.25}
        style={{ pointerEvents: 'none' }}
      />

      {/* Player tokens */}
      {slots.map(slot => {
        const cx      = fx(slot.x)
        const cy      = fy(slot.y)
        const player  = slot.player_id ? players[slot.player_id] : null
        const isSelected = slot.id === selectedSlotId
        const r       = Math.min(W, H) * 0.052

        return (
          <g key={slot.id} onClick={() => onSlotTap(slot)} style={{ cursor: 'pointer' }}>
            {/* Glow when selected */}
            {isSelected && (
              <circle cx={cx} cy={cy} r={r + 4} fill="rgba(254,90,1,0.35)" />
            )}

            {/* Token circle */}
            <circle
              cx={cx} cy={cy} r={r}
              fill={player ? '#FE5A01' : 'rgba(255,255,255,0.15)'}
              stroke={isSelected ? '#FE5A01' : player ? '#fff' : 'rgba(255,255,255,0.4)'}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />

            {/* Position code */}
            <text
              x={cx} y={cy}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={r * 0.75}
              fontWeight="700"
              fontFamily="'Barlow Condensed', sans-serif"
              fill={player ? '#fff' : 'rgba(255,255,255,0.5)'}
            >
              {player ? player.positions[0] ?? slot.code : slot.code}
            </text>

            {/* Player name above token */}
            {player && (
              <text
                x={cx} y={cy - r - 4}
                textAnchor="middle"
                fontSize={r * 0.62}
                fontWeight="600"
                fontFamily="'Inter', sans-serif"
                fill="rgba(255,255,255,0.92)"
              >
                {player.first_name[0]}. {player.last_name}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
