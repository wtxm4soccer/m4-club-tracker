import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { parentEmail, parentName, playerName, teamName, calendarUrl } = await req.json()
  if (!parentEmail || !calendarUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    await resend.emails.send({
      from: 'M4 Soccer Academy <noreply@wtxm4soccer.com>',
      to: parentEmail,
      subject: `${teamName} Practice Calendar`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="margin:0 0 8px;font-size:24px">M4 Soccer Academy</h2>
          <p>Hi ${parentName || 'there'},</p>
          <p>Here is the practice and event calendar for <strong>${playerName}</strong>'s team (<strong>${teamName}</strong>).</p>
          <p>Tap the link below to add the team calendar to your device. If the link does not open automatically, copy and paste it into your browser:</p>
          <a href="${calendarUrl}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#FE5A01;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
            Add Team Calendar
          </a>
          <p style="font-size:13px;color:#555;word-break:break-all;margin-top:8px">${calendarUrl}</p>
          <p style="color:#888;font-size:12px">Love God · Love People · Play Soccer</p>
        </div>
      `,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Calendar email error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
