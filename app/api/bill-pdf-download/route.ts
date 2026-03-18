import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/bill-pdf-download?id=BILL_ID&token=AUTH_TOKEN
 *
 * Returns a real PDF binary (application/pdf) suitable for:
 * - Web Share API (navigator.share with files)
 * - Direct download with Content-Disposition filename
 *
 * The browser's "Print" route (/api/bill-pdf) returns HTML for preview.
 * This route returns actual PDF bytes for sharing/downloading.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const billId = searchParams.get('id')

  if (!billId) {
    return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 })
  }

  try {
    // --- Auth setup (same pattern as bill-pdf route) ---
    const authHeader = request.headers.get('Authorization')
    const queryToken = searchParams.get('token')

    let authToken = authHeader
    if (!authToken && queryToken) {
      authToken = `Bearer ${queryToken}`
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
      global: {
        headers: authToken ? { Authorization: authToken } : undefined,
      },
    })

    // --- Fetch bill data (for filename) ---
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', parseInt(billId))
      .single()

    if (billError || !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    // Fetch party name for the filename
    let partyName = 'Bill'
    if (bill.party_id) {
      const { data: party } = await supabase
        .from('parties')
        .select('name')
        .eq('id', bill.party_id)
        .single()
      if (party?.name) partyName = party.name
    }

    // --- Fetch the HTML from the existing bill-pdf route ---
    const origin = request.nextUrl.origin
    const htmlUrl = `${origin}/api/bill-pdf?id=${billId}${queryToken ? `&token=${queryToken}` : ''}`
    const htmlResponse = await fetch(htmlUrl, {
      headers: authToken ? { Authorization: authToken } : {},
    })

    if (!htmlResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to generate bill HTML' },
        { status: 500 }
      )
    }

    const billHTML = await htmlResponse.text()

    // --- Convert HTML → PDF using Puppeteer ---
    let browser
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless as true,
        ignoreHTTPSErrors: true,
      })

      const page = await browser.newPage()
      await page.setContent(billHTML, { waitUntil: 'networkidle0' })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        preferCSSPageSize: true,
      })

      // Build a safe filename: replace "/" with "-" (e.g. K/2025-26/017 → K-2025-26-017)
      const safeBillNumber = String(bill.bill_number).replace(/\//g, '-')
      const safePartyName = partyName.replace(/[/\\?%*:|"<>]/g, '-').trim()
      const filename = `${safeBillNumber} - ${safePartyName}.pdf`

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    } finally {
      if (browser) await browser.close()
    }
  } catch (error) {
    console.error('❌ bill-pdf-download error:', error)
    return NextResponse.json(
      { error: 'PDF generation failed' },
      { status: 500 }
    )
  }
}
