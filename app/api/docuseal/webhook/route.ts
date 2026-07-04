import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
)

export async function POST(req: NextRequest) {
  const event = await req.json()

  // We only care about completed submissions
  if (event.event_type !== 'submission.completed') {
    return NextResponse.json({ ok: true })
  }

  const submissionId = String(event.data?.id ?? '')
  if (!submissionId) return NextResponse.json({ ok: true })

  const now = new Date().toISOString()
  const today = now.slice(0, 10)

  // Player document — match by external_id
  await supabase
    .from('documents')
    .update({ status: 'signed', date_signed: today })
    .eq('external_id', submissionId)

  // Coach agreement — match by agreement_submission_id
  await supabase
    .from('coaches')
    .update({ agreement_status: 'signed', agreement_signed_at: now })
    .eq('agreement_submission_id', submissionId)

  return NextResponse.json({ ok: true })
}
