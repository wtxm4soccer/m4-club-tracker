import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const { parentEmail, parentName, playerName, teamName, calendarUrl } = await req.json()
  if (!parentEmail || !calendarUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

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
      to: parentEmail,
      subject: `${teamName} Practice Calendar`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="margin:0 0 8px;font-size:24px">M4 Soccer Academy</h2>
          <p>Hi ${parentName || 'there'},</p>
          <p>Here is the practice and event calendar for <strong>${playerName}</strong>'s team (<strong>${teamName}</strong>).</p>
          <p>Click the link below to add it to your Google Calendar and stay up to date on all practices and events:</p>
          <a href="${calendarUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#FE5A01;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
            View Team Calendar
          </a>
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
