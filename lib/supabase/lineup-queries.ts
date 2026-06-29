import { createClient } from './client'
import type { Slot } from '../formations'

export type Lineup = {
  id: string
  team_id: string
  date: string
  format: string
  formation_name: string
  opponent: string | null
  slots: Slot[]
  subs: string[]
  excluded: string[]
  created_at: string
  updated_at: string
}

export async function getLatestLineup(teamId: string): Promise<Lineup | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('lineups')
    .select('*')
    .eq('team_id', teamId)
    .order('date', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}

export async function saveLineup(lineup: Omit<Lineup, 'id' | 'created_at' | 'updated_at'> & { id?: string }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lineups')
    .upsert(lineup)
    .select()
    .single()
  if (error) throw error
  return data as Lineup
}
