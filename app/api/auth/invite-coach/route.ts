import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    accessToken: async () => process.env.SUPABASE_SECRET_KEY!,
  }
)

export async function POST(req: NextRequest) {
  // Verify caller is a director
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'director') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { coachId, email, name } = await req.json()
  if (!coachId || !email) return NextResponse.json({ error: 'Missing coachId or email' }, { status: 400 })

  // Invite new user (Supabase handles existing users gracefully)
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, role: 'coach' },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://m4-club-tracker.vercel.app'}/set-password`,
  })
  if (error) {
    console.error('Invite error:', JSON.stringify(error), error.message, error.status, error.code)
    return NextResponse.json({ error: error.message || error.code || JSON.stringify(error) }, { status: 500 })
  }

  // Upsert profile (handles re-invites)
  await admin.from('profiles').upsert({ id: invited.user.id, role: 'coach', coach_id: coachId })

  return NextResponse.json({ ok: true })
}
