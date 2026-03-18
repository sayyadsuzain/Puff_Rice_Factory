import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/bill-pdf-download?id=BILL_ID&token=AUTH_TOKEN
 *
 * Proxies /api/bill-pdf (which already produces a real PDF binary)
 * and returns it with:
 *   - Content-Disposition: attachment (triggers download / share sheet)
 *   - A clean filename: "K-2025-26-017 - Party Name.pdf"
 *
 * No Puppeteer needed here — bill-pdf already does the heavy lifting.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const billId = searchParams.get('id')

  if (!billId) {
    return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 })
  }

  try {
    // ── Auth setup ──────────────────────────────────────────────────────────
    const authHeader = request.headers.get('Authorization')
    const queryToken = searchParams.get('token')
    let authToken = authHeader
    if (!authToken && queryToken) authToken = `Bearer ${queryToken}`

    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: { get(name: string) { return cookieStore.get(name)?.value } },
      global: { headers: authToken ? { Authorization: authToken } : undefined },
    })

    // ── Fetch bill + party name (for filename only) ──────────────────────────
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('bill_number, party_id, bill_type')
      .eq('id', parseInt(billId))
      .single()

    if (billError || !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    let partyName = 'Bill'
    if (bill.party_id) {
      const { data: party } = await supabase
        .from('parties')
        .select('name')
        .eq('id', bill.party_id)
        .single()
      if (party?.name) partyName = party.name
    }

    // ── Proxy the existing /api/bill-pdf route (it returns a real PDF) ───────
    const origin = request.nextUrl.origin
    const pdfUrl = `${origin}/api/bill-pdf?id=${billId}${queryToken ? `&token=${queryToken}` : ''}`

    const pdfResponse = await fetch(pdfUrl, {
      headers: authToken ? { Authorization: authToken } : {},
    })

    if (!pdfResponse.ok) {
      const errText = await pdfResponse.text().catch(() => 'unknown')
      console.error('❌ bill-pdf-download: upstream bill-pdf failed:', pdfResponse.status, errText)
      return NextResponse.json(
        { error: 'Failed to generate PDF' },
        { status: 500 }
      )
    }

    // ── Build safe filename: replace "/" with "-" ────────────────────────────
    const safeBillNumber = String(bill.bill_number).replace(/\//g, '-')
    const safePartyName = partyName.replace(/[/\\?%*:|"<>]/g, '-').trim()
    const filename = `${safeBillNumber} - ${safePartyName}.pdf`

    // ── Return the PDF buffer with attachment header ─────────────────────────
    const pdfBuffer = await pdfResponse.arrayBuffer()

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('❌ bill-pdf-download error:', error)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
