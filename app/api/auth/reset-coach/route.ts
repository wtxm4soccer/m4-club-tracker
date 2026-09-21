import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'director') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, name } = await req.json()
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://m4-club-tracker.vercel.app'
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/set-password` },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const resetUrl = linkData.properties?.action_link
  try {
    await resend.emails.send({
      from: 'M4 Soccer Academy <noreply@wtxm4soccer.com>',
      to: email,
      subject: 'Reset your M4 Club Tracker password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="margin:0 0 8px;font-size:24px">M4 Soccer Academy</h2>
          <p>Hi ${name},</p>
          <p>Click the button below to set a new password for your M4 Club Tracker account.</p>
          <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#FE5A01;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
            Reset Password
          </a>
          <p style="color:#888;font-size:12px">This link expires in 1 hour. If you didn't request this, you can ignore it.</p>
          <p style="color:#888;font-size:12px">Love God · Love People · Play Soccer</p>
        </div>
      `,
    })
  } catch (e: any) {
    return NextResponse.json({ error: `Email failed: ${e.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
