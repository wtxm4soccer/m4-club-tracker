export type Slot = {
  id: string
  code: string   // position code shown in token
  x: number      // 0–100 percentage across field width
  y: number      // 0–100 percentage down field (0=attacking end, 100=GK end)
  player_id: string | null
}

export type FormationDef = {
  name: string
  lines: number[]  // [defenders, mid..., forwards] back-to-front
}

export const FORMATION_LIBRARY: Record<string, FormationDef[]> = {
  '5v5':  [
    { name: '1-2-1', lines: [1, 2, 1] },
    { name: '2-1-1', lines: [2, 1, 1] },
    { name: '1-1-2', lines: [1, 1, 2] },
  ],
  '7v7':  [
    { name: '2-3-1', lines: [2, 3, 1] },
    { name: '3-2-1', lines: [3, 2, 1] },
    { name: '2-2-2', lines: [2, 2, 2] },
    { name: '2-1-3', lines: [2, 1, 3] },
  ],
  '9v9':  [
    { name: '3-3-2', lines: [3, 3, 2] },
    { name: '3-2-3', lines: [3, 2, 3] },
    { name: '2-3-3', lines: [2, 3, 3] },
    { name: '4-1-3', lines: [4, 1, 3] },
  ],
  '11v11': [
    { name: '4-3-3',   lines: [4, 3, 3] },
    { name: '4-4-2',   lines: [4, 4, 2] },
    { name: '4-2-3-1', lines: [4, 2, 3, 1] },
    { name: '3-5-2',   lines: [3, 5, 2] },
  ],
}

function defenderCodes(count: number): string[] {
  if (count === 1) return ['CB']
  if (count === 2) return ['CB', 'CB']
  if (count === 3) return ['LB', 'CB', 'RB']
  if (count === 4) return ['LB', 'CB', 'CB', 'RB']
  return ['LB', 'CB', 'CB', 'CB', 'RB'].slice(0, count)
}

function midCodes(count: number, lineIdx: number, totalLines: number): string[] {
  const deep = lineIdx === 1 && totalLines > 3
  if (count === 1) return [deep ? 'DM' : 'CM']
  if (count === 2) return ['CM', 'CM']
  if (count === 3) return ['DM', 'CM', 'AM']
  if (count === 4) return ['DM', 'CM', 'CM', 'AM']
  if (count === 5) return ['DM', 'CM', 'CM', 'CM', 'AM']
  return Array(count).fill('CM')
}

function forwardCodes(count: number): string[] {
  if (count === 1) return ['CF']
  if (count === 2) return ['ST', 'ST']
  if (count === 3) return ['LW', 'CF', 'RW']
  if (count === 4) return ['LW', 'ST', 'ST', 'RW']
  return Array(count).fill('FW')
}

export function generateSlots(lines: number[]): Slot[] {
  const slots: Slot[] = []
  let idCounter = 0

  // GK always at bottom center
  slots.push({ id: `slot-${idCounter++}`, code: 'GK', x: 50, y: 88, player_id: null })

  const totalLines = lines.length
  // Y positions: defenders near bottom (y=72), forwards near top (y=15)
  const yTop    = 15
  const yBottom = 72
  const yStep   = totalLines > 1 ? (yBottom - yTop) / (totalLines - 1) : 0

  lines.forEach((count, lineIdx) => {
    const y = totalLines === 1 ? (yTop + yBottom) / 2 : yBottom - lineIdx * yStep

    const codes =
      lineIdx === 0                  ? defenderCodes(count) :
      lineIdx === totalLines - 1     ? forwardCodes(count)  :
                                       midCodes(count, lineIdx, totalLines)

    for (let i = 0; i < count; i++) {
      // Pairs stay central (30/70), wider lines spread to edges (15→85)
      const x = count === 1 ? 50 : count === 2 ? 30 + 40 * i : 15 + (70 / (count - 1)) * i
      // Wine-rack: stagger any 2-player line diagonally
      const yOffset = count === 2 ? (i === 0 ? -4 : 4) : 0
      slots.push({
        id:        `slot-${idCounter++}`,
        code:      codes[i] ?? 'MID',
        x,
        y: y + yOffset,
        player_id: null,
      })
    }
  })

  return slots
}

export function totalPlayers(format: string): number {
  return parseInt(format.split('v')[0])
}
