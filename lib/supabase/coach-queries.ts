import { createClient } from './client'

export type Certification = {
  id: string
  coach_id: string
  cert_type: 'SafeSport' | 'Background Check' | 'US Soccer Grassroots License' | 'CDC Concussion Training'
  status: 'not_started' | 'in_progress' | 'complete'
  date_completed: string | null
}

export const CERT_TYPES: Certification['cert_type'][] = [
  'SafeSport',
  'Background Check',
  'US Soccer Grassroots License',
  'CDC Concussion Training',
]

export async function getCertifications(coachId: string): Promise<Certification[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('certifications')
    .select('*')
    .eq('coach_id', coachId)
  if (error) throw error
  return data ?? []
}

export async function upsertCertification(cert: Partial<Certification> & { coach_id: string; cert_type: string }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('certifications')
    .upsert(cert, { onConflict: 'coach_id,cert_type' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function seedCoachCertifications(coachId: string) {
  const supabase = createClient()
  const rows = CERT_TYPES.map(cert_type => ({
    coach_id: coachId,
    cert_type,
    status: 'not_started',
  }))
  await supabase.from('certifications').upsert(rows, { onConflict: 'coach_id,cert_type' })
}

export async function seedCoachApparel(coachId: string) {
  const supabase = createClient()
  const items = ['Shirt', 'Jacket', 'Pants']
  const rows = items.map(item => ({
    entity_id: coachId,
    entity_type: 'coach',
    item,
    status: 'not_issued',
  }))
  await supabase.from('apparel').upsert(rows, { onConflict: 'entity_id,entity_type,item' })
}
