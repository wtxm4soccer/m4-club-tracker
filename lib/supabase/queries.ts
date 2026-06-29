import { createClient } from './client'
import type { Player, Team, Coach } from '../types'

export async function getTeams(): Promise<Team[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function getPlayers(): Promise<Player[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('last_name')
  if (error) throw error
  return data ?? []
}

export async function getPlayer(id: string): Promise<Player | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function upsertPlayer(player: Partial<Player> & { id?: string }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('players')
    .upsert(player)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePlayer(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('players').delete().eq('id', id)
  if (error) throw error
}

export async function upsertTeam(team: Partial<Team> & { id?: string }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('teams')
    .upsert(team)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadTeamMascot(teamId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext  = file.name.split('.').pop()
  const path = `${teamId}/mascot.${ext}`
  const { error } = await supabase.storage
    .from('player-photos')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('player-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function deleteTeam(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) throw error
}

export async function getCoaches(): Promise<Coach[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .order('last_name')
  if (error) throw error
  return data ?? []
}

export async function upsertCoach(coach: Partial<Coach> & { id?: string }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('coaches')
    .upsert(coach)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCoach(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('coaches').delete().eq('id', id)
  if (error) throw error
}

// Seed all 6 document types for a new player
export async function seedPlayerDocuments(playerId: string) {
  const supabase = createClient()
  const docTypes = [
    'Waiver', 'Medical Release', 'Family Code of Conduct',
    'Player Participation', 'Proof of Birth', 'Team Reach'
  ]
  const rows = docTypes.map(doc_type => ({
    player_id: playerId,
    doc_type,
    status: 'not_sent',
  }))
  await supabase.from('documents').upsert(rows, { onConflict: 'player_id,doc_type' })
}

// Seed all 4 apparel items for a new player
export async function seedPlayerApparel(playerId: string) {
  const supabase = createClient()
  const items = ['Shirt', 'Shorts', 'Pants', 'Jacket']
  const rows = items.map(item => ({
    entity_id: playerId,
    entity_type: 'player',
    item,
    status: 'not_issued',
  }))
  await supabase.from('apparel').upsert(rows, { onConflict: 'entity_id,entity_type,item' })
}
