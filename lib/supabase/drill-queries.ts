import { createClient } from './client'

export type Drill = {
  id: string
  title: string
  subtitle: string | null
  notes: string | null
  field_layout: string
  duration: number
  speed: number
  data: any
  created_at: string
}

export async function getDrills(): Promise<Drill[]> {
  const supabase = createClient()
  const { data } = await supabase.from('drills').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function saveDrill(drill: Omit<Drill, 'id' | 'created_at'>): Promise<Drill> {
  const supabase = createClient()
  const { data, error } = await supabase.from('drills').insert(drill).select().single()
  if (error) throw error
  return data
}

export async function deleteDrill(id: string) {
  const supabase = createClient()
  await supabase.from('drills').delete().eq('id', id)
}
