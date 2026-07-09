import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
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

  // Create user and generate invite link (bypasses Supabase email, we send via Resend)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://m4-club-tracker.vercel.app'
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { name, role: 'coach' },
      redirectTo: `${siteUrl}/set-password`,
    },
  })
  if (error) {
    console.error('generateLink error:', JSON.stringify(error), error.message)
    return NextResponse.json({ error: error.message || JSON.stringify(error) }, { status: 500 })
  }

  if (!linkData?.user) {
    console.error('generateLink returned no user:', JSON.stringify(linkData))
    return NextResponse.json({ error: 'Failed to create invite link' }, { status: 500 })
  }

  // Send email via Gmail SMTP
  const inviteUrl = linkData.properties?.action_link
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  try {
    await transporter.sendMail({
      from: `"M4 Soccer Academy" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "You've been invited to M4 Club Tracker",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="margin:0 0 8px;font-size:24px">M4 Soccer Academy</h2>
          <p>Hi ${name},</p>
          <p>You've been invited to access the M4 Club Tracker as a coach. Click the button below to set your password and get started.</p>
          <a href="${inviteUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#FE5A01;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
            Accept Invite & Set Password
          </a>
          <p style="color:#888;font-size:12px">This link expires in 24 hours. If you didn't expect this email, you can ignore it.</p>
          <p style="color:#888;font-size:12px">Love God · Love People · Play Soccer</p>
        </div>
      `,
    })
  } catch (e: any) {
    console.error('Gmail error:', e.message)
    return NextResponse.json({ error: `Email failed: ${e.message}` }, { status: 500 })
  }

  // Upsert profile (handles re-invites)
  await admin.from('profiles').upsert({ id: linkData.user.id, role: 'coach', coach_id: coachId })

  return NextResponse.json({ ok: true })
}
