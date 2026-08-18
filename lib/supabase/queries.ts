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

function withTeamIds(players: any[]): Player[] {
  return players.map(p => ({
    ...p,
    team_ids: (p.player_teams ?? []).map((pt: any) => pt.team_id),
  }))
}

export async function getPlayers(): Promise<Player[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*, player_teams(team_id)')
    .order('last_name')
  if (error) throw error
  return withTeamIds(data ?? [])
}

export async function getPlayer(id: string): Promise<Player | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*, player_teams(team_id)')
    .eq('id', id)
    .single()
  if (error) return null
  return withTeamIds([data])[0]
}

export async function addPlayerToTeam(playerId: string, teamId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('player_teams')
    .upsert({ player_id: playerId, team_id: teamId }, { onConflict: 'player_id,team_id' })
  if (error) throw error
}

export async function removePlayerFromTeam(playerId: string, teamId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('player_teams')
    .delete()
    .eq('player_id', playerId)
    .eq('team_id', teamId)
  if (error) throw error
}

export async function upsertPlayer(player: Partial<Player> & { id?: string }) {
  const supabase = createClient()
  const { team_ids, ...rest } = player as any
  const { data, error } = await supabase
    .from('players')
    .upsert(rest)
    .select()
    .single()
  if (error) throw error
  // Sync team_id into player_teams if set
  if (rest.team_id && data?.id) {
    await supabase.from('player_teams')
      .upsert({ player_id: data.id, team_id: rest.team_id }, { onConflict: 'player_id,team_id' })
  }
  return { ...data, team_ids: team_ids ?? (rest.team_id ? [rest.team_id] : []) }
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
