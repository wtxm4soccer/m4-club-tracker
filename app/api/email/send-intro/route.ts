import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://m4-club-tracker.vercel.app'

export async function POST(req: NextRequest) {
  const { parentEmail, parentName, playerName, teamName } = await req.json()
  if (!parentEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const docUrl = `${APP_URL}/M4_Family_Introduction.pdf`

  try {
    await resend.emails.send({
      from: 'M4 Soccer Academy <noreply@wtxm4soccer.com>',
      to: parentEmail,
      subject: `Welcome to M4 Soccer Academy — ${teamName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="margin:0 0 8px;font-size:24px">M4 Soccer Academy</h2>
          <p>Hi ${parentName || 'there'},</p>
          <p>Welcome to M4 Soccer Academy! We are excited to have <strong>${playerName}</strong> on the <strong>${teamName}</strong> team.</p>
          <p>Please review our Family Introduction document for everything you need to know about the program:</p>
          <a href="${docUrl}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#FE5A01;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
            View Family Introduction
          </a>
          <p style="font-size:13px;color:#555">If the button does not work, copy and paste this link into your browser:</p>
          <p style="font-size:13px;color:#555;word-break:break-all">${docUrl}</p>
          <p style="color:#888;font-size:12px">Love God · Love People · Play Soccer</p>
        </div>
      `,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Intro email error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
