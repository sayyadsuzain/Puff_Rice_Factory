import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase'
import { generateBillHTML } from '@/lib/pdf/bill-layout'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const billId = searchParams.get('id')

  if (!billId) {
    return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 })
  }

  try {
    const authHeader = request.headers.get('Authorization')
    const queryToken = searchParams.get('token')
    let authToken = authHeader
    if (!authToken && queryToken) authToken = `Bearer ${queryToken}`

    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: { get(name: string) { return cookieStore.get(name)?.value } },
      global: { headers: authToken ? { Authorization: authToken } : undefined },
    })

    const { data: bill, error: billError } = await supabase.from('bills').select('*').eq('id', parseInt(billId)).single()
    if (billError || !bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

    const { data: party } = bill.party_id ? await supabase.from('parties').select('name, gst_number').eq('id', bill.party_id).single() : { data: null }
    const { data: items } = await supabase.from('bill_items').select('*').eq('bill_id', parseInt(billId)).order('id')

    const isKacchi = bill.bill_type === 'kacchi'
    const fullHTML = generateBillHTML(bill, items || [], {
      partyName: party?.name || '',
      partyGst: party?.gst_number,
      isKacchi
    })

    let browser
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless as any,
        ignoreHTTPSErrors: true,
      })
      const page = await browser.newPage()
      await page.setContent(fullHTML, { waitUntil: 'networkidle0' })
      const pdf = await page.pdf({
        format: 'a4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
      })

      const filename = `Bill_${bill.bill_number}.pdf`
      return new NextResponse(pdf as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Link': '</favicon.ico?v=5>; rel="icon"'
        }
      })
    } finally {
      if (browser) await browser.close()
    }
  } catch (error: any) {
    console.error('❌ bill-pdf error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF', details: error.message }, { status: 500 })
  }
}
