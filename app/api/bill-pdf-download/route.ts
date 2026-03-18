import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convertToWords(n: number): string {
    if (n === 0) return ''
    if (n < 10) return ones[n]
    if (n < 20) return teens[n - 10]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertToWords(n % 100) : '')
    if (n < 100000) return convertToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convertToWords(n % 1000) : '')
    if (n < 10000000) return convertToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convertToWords(n % 100000) : '')
    return convertToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convertToWords(n % 10000000) : '')
  }

  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)

  let result = convertToWords(rupees) + ' Rupees'
  if (paise > 0) {
    result += ' and ' + convertToWords(paise) + ' Paise'
  }
  result += ' Only'

  return result
}

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

    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', parseInt(billId))
      .single()

    if (billError || !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    if (bill.party_id) {
      const { data: party } = await supabase
        .from('parties')
        .select('name, gst_number')
        .eq('id', bill.party_id)
        .single()
      if (party) bill.parties = party
    }

    const { data: items } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', parseInt(billId))
      .order('id')

    const billHTML = generateBillHTML(bill, items || [])

    const fullHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          html, body { height: 100%; margin: 0; padding: 0; -webkit-print-color-adjust: exact; box-sizing: border-box; }
          .a4-page {
            position: relative; width: 210mm; height: 297mm; margin: 0 auto; background-color: white; padding: 8mm 12mm; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column;
          }
          .watermark-ms {
            position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; user-select: none; z-index: 0; opacity: 0.12; font-size: 300px; font-weight: 900; letter-spacing: 20px; font-family: "Playfair Display", serif; color: #c0c0c0;
          }
          .content-wrapper { position: relative; z-index: 10; display: grid; grid-template-rows: auto auto auto 1fr auto; height: 100%; width: 100%; gap: 0; }
        </style>
      </head>
      <body>${billHTML}</body>
      </html>
    `

    let browser
    let step = 'init'
    try {
      step = 'launching browser'
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless as any,
        ignoreHTTPSErrors: true,
      })

      step = 'new page'
      const page = await browser.newPage()
      
      step = 'setting content'
      await page.setContent(fullHTML, { waitUntil: 'domcontentloaded', timeout: 30000 })

      step = 'generating pdf'
      const pdf = await page.pdf({
        format: 'a4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
      })

      const safeBillNo = String(bill.bill_number).replace(/\//g, '-')
      const partyName = bill.parties?.name || 'Bill'
      const filename = `${safeBillNo} - ${partyName}.pdf`

      return new NextResponse(pdf as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'no-store, must-revalidate'
        }
      })
    } catch (e: any) {
      console.error(`❌ Puppeteer failed at step [${step}]:`, e)
      return NextResponse.json({ 
        error: 'Failed to generate PDF', 
        details: e.message,
        at: step
      }, { status: 500 })
    } finally {
      if (browser) await browser.close()
    }
  } catch (error: any) {
    console.error('❌ bill-pdf-download error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF', details: error.message }, { status: 500 })
  }
}

function generateBillHTML(bill: any, items: any[]): string {
  const isKacchi = bill.bill_type === 'kacchi'
  const partyName = bill.parties?.name || ''
  const partyGst = bill.parties?.gst_number || ''
  const grandTotal = (bill.total_amount || 0) + (bill.gst_total || 0) + (bill.balance || 0)
  const totalInWords = numberToWords(grandTotal)
  const companyGst = '27CQIPS6685K1ZU'
  const billDateStr = new Date(bill.bill_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' })
  const formattedBillNo = String(bill.bill_number)

  const itemRows = items.map((item) => {
    const isPaddyItem = item.particular?.toLowerCase().includes('paddy')
    return `
      <tr style="height: 32px;">
        <td style="border-left: 1px solid #9ca3af; border-right: 1px solid #e5e7eb; padding: 6px 8px;">
          <div style="font-weight: 500;">${item.particular}</div>
          ${isPaddyItem && item.weight_kg ? `<div style="font-size: 10px; color: #2563eb; font-weight: bold;">(${item.weight_kg}kg total)</div>` : ''}
        </td>
        <td style="border-right: 1px solid #e5e7eb; text-align: center; padding: 6px 8px;">${item.qty_bags || ''}</td>
        <td style="border-right: 1px solid #e5e7eb; text-align: center; padding: 6px 8px;">${isPaddyItem ? `${item.weight_kg || ''}kg` : (item.weight_kg || '')}</td>
        <td style="border-right: 1px solid #e5e7eb; text-align: center; padding: 6px 8px;">${item.rate ? `${item.rate.toFixed(2)}${isPaddyItem ? ' ₹/kg' : ''}` : ''}</td>
        <td style="border-right: 1px solid #9ca3af; text-align: right; font-weight: bold; padding: 6px 8px;">${item.amount?.toFixed(2) || ''}</td>
      </tr>
    `
  }).join('')

  const emptyRows = Array.from({ length: Math.max(0, 18 - items.length) }).map(() => `
    <tr style="height: 32px;">
      <td style="border-left: 1px solid #9ca3af; border-right: 1px solid #f3f4f6; color: transparent;">-</td>
      <td style="border-right: 1px solid #f3f4f6; color: transparent;">-</td>
      <td style="border-right: 1px solid #f3f4f6; color: transparent;">-</td>
      <td style="border-right: 1px solid #f3f4f6; color: transparent;">-</td>
      <td style="border-right: 1px solid #9ca3af; color: transparent;">-</td>
    </tr>
  `).join('')
 
  return `
    <div class="a4-page">
      <div class="watermark-ms">MS</div>
      <div class="content-wrapper">
        <div class="header-top">
          <div style="text-align: center; font-size: 10px; color: #6b7280; font-weight: bold; text-transform: uppercase;">${!isKacchi ? 'Subject to Sangli Jurisdiction' : ''}</div>
          <div style="display: flex; align-items: start; margin: 4px 0;">
            <div style="flex: 1;"></div>
            <div style="flex: 1; text-align: center;">
              <div style="background-color: #dc2626; color: white; padding: 4px 16px; border-radius: 2px; font-size: 11px; font-weight: 900; letter-spacing: 1px; display: inline-block;">${isKacchi ? 'CASH / CREDIT MEMO' : 'CREDIT MEMO'}</div>
            </div>
            <div style="flex: 1; text-align: right; font-size: 10px; font-weight: bold; color: #1f2937;">
              <div>CONTACT:</div>
              <div>9860022450 | 9561420666</div>
            </div>
          </div>
          <h1 style="color: #dc2626; font-size: 48px; font-weight: bold; text-align: center; margin: 4px 0; letter-spacing: -1px;">M S TRADING COMPANY</h1>
          <div style="text-align: center; font-size: 10px; font-weight: bold; color: #374151; text-transform: uppercase; letter-spacing: 1px;">KUPWAD MIDC NEAR NAV KRISHNA VALLEY, PLOT NO L-52</div>
          ${!isKacchi ? `<div style="text-align: center; font-size: 11px; font-weight: bold; color: #1f2937; margin-top: 4px;">GST IN : ${companyGst}</div>` : ''}
          <div style="border-bottom: 4px solid #dc2626; margin-top: 8px;"></div>
          <div style="border-bottom: 1px solid #dc2626; margin-top: 2px;"></div>
        </div>

        <div style="display: grid; grid-template-cols: 1fr 1fr 1fr; align-items: center; padding: 8px 0;">
          <div>
            <div style="font-size: 10px; font-weight: bold; color: #6b7280; text-transform: uppercase;">From :</div>
            <div style="font-weight: bold; font-size: 14px;">M S TRADING COMPANY</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 10px; font-weight: bold; color: #6b7280; text-transform: uppercase;">No.</div>
            <div style="font-size: 20px; font-weight: 900; color: #dc2626;">${formattedBillNo}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; font-weight: bold; color: #6b7280; text-transform: uppercase;">Date :</div>
            <div style="font-weight: bold; font-size: 16px;">${billDateStr}</div>
          </div>
        </div>

        <div style="border: 1px solid #d1d5db; border-radius: 4px; padding: 12px; margin-bottom: 8px;">
          <div style="font-size: 16px;"><span style="font-weight: bold;">M/s. </span><span style="border-bottom: 1px dotted #9ca3af; min-width: 300px; display: inline-block;">${partyName}</span></div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px; font-weight: 600;">
            ${bill.vehicle_number ? `<div><span style="color: #4b5563; font-weight: bold;">Vehicle No.: </span><span>${bill.vehicle_number}</span></div>` : '<div></div>'}
            ${!isKacchi && partyGst ? `<div><span style="color: #4b5563; font-weight: bold;">GST No.: </span><span>${partyGst}</span></div>` : ''}
          </div>
        </div>

        <div style="flex: 1; min-height: 450px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead style="background-color: #f9fafb;">
              <tr>
                <th style="border: 1px solid #9ca3af; padding: 8px; text-align: left; font-weight: 900; text-transform: uppercase; font-size: 11px;">Particulars</th>
                <th style="border: 1px solid #9ca3af; padding: 8px; text-align: center; font-weight: 900; text-transform: uppercase; font-size: 11px; width: 80px;">Qty. Bags</th>
                <th style="border: 1px solid #9ca3af; padding: 8px; text-align: center; font-weight: 900; text-transform: uppercase; font-size: 11px; width: 100px;">Weight kg</th>
                <th style="border: 1px solid #9ca3af; padding: 8px; text-align: center; font-weight: 900; text-transform: uppercase; font-size: 11px; width: 80px;">Rate</th>
                <th style="border: 1px solid #9ca3af; padding: 8px; text-align: right; font-weight: 900; text-transform: uppercase; font-size: 11px; width: 120px;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemRows}${emptyRows}</tbody>
          </table>
        </div>

        <div style="margin-top: 12px; border-top: 3px solid black; padding-top: 8px;">
          <div style="display: grid; grid-template-cols: 1.2fr 1fr; gap: 20px;">
            <div><div style="font-weight: bold; font-size: 10px; color: #6b7280; text-transform: uppercase;">Rs. in Words:</div><div style="font-size: 11px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">${totalInWords}</div></div>
            <div style="text-align: right;">
              <div style="display: flex; justify-content: space-between; font-size: 13px;"><span style="font-weight: bold; color: #4b5563;">SUB TOTAL</span><span style="font-weight: bold;">₹ ${(bill.total_amount || 0).toFixed(2)}</span></div>
              ${!isKacchi && bill.is_gst_enabled && (bill.gst_total || 0) > 0 ? `<div style="margin-top: 4px; border-top: 1px solid #f3f4f6; padding-top: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #4b5563;"><span>GST TOTAL</span><span style="font-weight: bold; color: black;">₹ ${bill.gst_total.toFixed(2)}</span></div>
              </div>` : ''}
              ${bill.balance > 0 ? `<div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 13px;"><span style="font-weight: bold; color: #4b5563;">BALANCE</span><span style="font-weight: bold; color: #ea580c;">₹ ${bill.balance.toFixed(2)}</span></div>` : ''}
              <div style="border-top: 3px solid black; margin-top: 8px; padding-top: 4px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 18px; font-weight: 900; font-style: italic;">TOTAL</span><span style="font-size: 22px; font-weight: 900;">₹ ${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px;">
            <div style="text-align: left; width: 50%;">
              ${(!isKacchi && bill.bank_name) ? `<div style="font-size: 11px; font-weight: bold; color: #dc2626; margin-bottom: 4px;">BANK DETAILS:</div>
              <div style="font-size: 10px; font-weight: bold; color: #1f2937; text-transform: uppercase;">
                <div>BANK: ${bill.bank_name}</div><div>IFSC: ${bill.bank_ifsc}</div><div>A/C NO: ${bill.bank_account}</div>
              </div>` : ''}
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: bold; color: #dc2626; margin-bottom: 30px; text-transform: uppercase;">For M S TRADING COMPANY</div>
              <div style="font-size: 10px; font-weight: 500; width: 160px; border-top: 1px solid #9ca3af; text-align: center; padding-top: 4px;">Auth. Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}
