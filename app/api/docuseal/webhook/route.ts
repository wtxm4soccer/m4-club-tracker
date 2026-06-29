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

  const externalId = String(event.data?.id ?? '')
  if (!externalId) return NextResponse.json({ ok: true })

  // Find the document row by external_id and mark it signed
  const today = new Date().toISOString().slice(0, 10)
  await supabase
    .from('documents')
    .update({ status: 'signed', date_signed: today })
    .eq('external_id', externalId)

  return NextResponse.json({ ok: true })
}
