import { createClient } from './client'
import type { Document, Assessment, Apparel } from '../types'

export async function getPlayerDocuments(playerId: string): Promise<Document[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('player_id', playerId)
  if (error) throw error
  return data ?? []
}

export async function upsertDocument(doc: Partial<Document> & { player_id: string; doc_type: string }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('documents')
    .upsert(doc, { onConflict: 'player_id,doc_type' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPlayerAssessments(playerId: string): Promise<Assessment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('player_id', playerId)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertAssessment(assessment: Partial<Assessment> & { player_id: string }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assessments')
    .upsert(assessment)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAssessment(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('assessments').delete().eq('id', id)
  if (error) throw error
}

export async function getPlayerApparel(playerId: string): Promise<Apparel[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('apparel')
    .select('*')
    .eq('entity_id', playerId)
    .eq('entity_type', 'player')
  if (error) throw error
  return data ?? []
}

export async function upsertApparel(item: Partial<Apparel> & { entity_id: string; entity_type: string; item: string }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('apparel')
    .upsert(item, { onConflict: 'entity_id,entity_type,item' })
    .select()
    .single()
  if (error) throw error
  return data
}
