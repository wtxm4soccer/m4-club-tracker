import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { templateId, playerName, playerDob, parentName, parentEmail } = await req.json()

  if (!templateId || !parentEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const body = {
    template_id: Number(templateId),
    send_email: true,
    submitters: [
      {
        role: 'Parent',
        email: parentEmail,
        name: parentName ?? '',
        values: {
          'Player Name': playerName ?? '',
          'Player DOB':  playerDob  ?? '',
          'Parent Full Name': parentName ?? '',
        },
      },
    ],
  }

  const res = await fetch('https://api.docuseal.com/submissions', {
    method: 'POST',
    headers: {
      'X-Auth-Token': process.env.DOCUSEAL_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })
  return NextResponse.json(data)
}
