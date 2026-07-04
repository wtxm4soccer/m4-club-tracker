import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const COACH_TEMPLATE_ID = 4805284

export async function POST(req: NextRequest) {
  const { coachId, coachName, email } = await req.json()

  if (!email) return NextResponse.json({ error: 'Coach has no email on file' }, { status: 400 })

  const body = {
    template_id: COACH_TEMPLATE_ID,
    send_email: true,
    submitters: [
      {
        role: 'Coach',
        email,
        name: coachName ?? '',
        values: { 'Coach Name': coachName ?? '' },
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

  // Mark coach as sent
  const supabase = await createClient()
  await supabase.from('coaches').update({
    agreement_status: 'sent',
    agreement_sent_at: new Date().toISOString(),
    agreement_submission_id: String(data[0]?.submission_id ?? data.id ?? ''),
  }).eq('id', coachId)

  return NextResponse.json(data)
}
