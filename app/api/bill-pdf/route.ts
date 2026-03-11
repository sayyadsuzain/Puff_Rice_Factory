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

  console.log('🎨 BILL-PDF: API called with billId:', billId)

  if (!billId) {
    console.error('❌ BILL-PDF: No bill ID provided')
    return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 })
  }

  try {
    console.log('🎨 BILL-PDF: Starting PDF generation process...')

    const authHeader = request.headers.get('Authorization')
    const queryToken = searchParams.get('token')
    
    let authToken = authHeader
    if (!authToken && queryToken) {
      authToken = `Bearer ${queryToken}`
    }
    
    console.log('🎨 BILL-PDF: Auth method:', authHeader ? 'Header' : (queryToken ? 'Query' : 'None'))

    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
      global: {
        headers: authToken ? { Authorization: authToken } : undefined
      }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🎨 BILL-PDF: Auth check:', user ? `Authenticated as ${user.email}` : 'Not authenticated', authError ? `Auth error: ${authError.message}` : '')

    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', parseInt(billId))
      .single()

    if (billError || !bill) {
      console.error('❌ BILL-PDF: Bill fetch error:', billError)
      return NextResponse.json({ 
        error: 'Bill not found', 
        details: billError?.message || 'No bill data returned',
        id: billId,
        auth: user ? 'authenticated' : 'anonymous',
        authMethod: authHeader ? 'header' : (queryToken ? 'query' : 'none'),
        authProvided: !!authToken,
        hint: 'Check if RLS policies allow this user to read bills'
      }, { status: 404 })
    }

    if (bill.party_id) {
      const { data: party, error: partyError } = await supabase
        .from('parties')
        .select('name, gst_number')
        .eq('id', bill.party_id)
        .single()

      if (!partyError && party) {
        bill.parties = party
      } else {
        console.warn('⚠️ BILL-PDF: Party fetch failed:', partyError)
      }
    }

    console.log('✅ BILL-PDF: Bill fetched successfully:', bill.id)

    const { data: items, error: itemsError } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', parseInt(billId))
      .order('id')

    if (itemsError) {
      console.error('❌ BILL-PDF: Items fetch error:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch bill items' }, { status: 500 })
    }

    console.log('✅ BILL-PDF: Items fetched successfully:', items?.length || 0)

    console.log('🎨 BILL-PDF: Generating HTML for bill...')
    const billHTML = generateBillHTML(
      bill,
      items || [],
      1,
      1
    )

    const fullHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4;
            margin: 0;
          }
 
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            box-sizing: border-box;
          }
 
          .a4-page {
            position: relative;
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            background-color: white;
            padding: 8mm 12mm;
            box-sizing: border-box;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
 
          .watermark-ms {
            position: absolute;
            top: 45%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            user-select: none;
            z-index: 0;
            opacity: 0.12;
            font-size: 300px;
            font-weight: 900;
            letter-spacing: 20px;
            font-family: "Playfair Display", serif;
            color: #c0c0c0;
          }
 
          .content-wrapper {
            position: relative;
            z-index: 10;
            display: grid;
            grid-template-rows: auto auto auto 1fr auto;
            height: 100%;
            width: 100%;
            gap: 0;
          }
 
          .header-top {
            width: 100%;
            margin-bottom: 2px;
          }
          
          .jurisdiction {
            text-align: center;
            font-size: 8px;
            color: #6b7280;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 1px;
          }
 
          .header-grid {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: start;
          }
 
          .memo-badge {
            display: inline-block;
            background-color: #dc2626;
            color: white;
            padding: 2px 20px;
            border-radius: 1px;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
 
          .contact-info {
            text-align: right;
            font-size: 8px;
            font-weight: bold;
            color: #1f2937;
          }
 
          .company-name {
            text-align: center;
            font-size: 34px;
            font-weight: bold;
            color: #dc2626;
            letter-spacing: -0.02em;
            margin: 0;
          }
 
          .company-address {
            text-align: center;
            font-size: 8.5px;
            letter-spacing: 0.05em;
            color: #374151;
            font-weight: bold;
            text-transform: uppercase;
          }
 
          .company-gst {
            text-align: center;
            font-size: 9px;
            font-weight: bold;
            margin-top: 1px;
            color: #111827;
            text-transform: uppercase;
          }
 
          .red-divider-main {
            border-bottom: 2.5px solid #dc2626;
            margin-top: 4px;
          }
          .red-divider-sub {
            border-bottom: 0.5px solid #dc2626;
            margin-top: 1px;
          }
 
          .bill-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            font-size: 11px;
            align-items: center;
            padding: 4px 0;
          }
 
          .info-label {
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            color: #6b7280;
          }
 
          .bill-no {
            font-size: 16px;
            font-weight: 900;
            color: #dc2626;
          }
 
          .party-details {
            border: 0.5px solid #d1d5db;
            border-radius: 4px;
            padding: 6px 10px;
            margin-bottom: 8px;
          }
 
          .party-name-row {
            font-size: 14px;
            font-weight: 500;
          }
 
          .party-name-underline {
            border-bottom: 0.5px dotted #9ca3af;
            min-width: 250px;
            display: inline-block;
          }
 
          .vehicle-gst-row {
            font-size: 11px;
            margin-top: 4px;
            display: flex;
            justify-content: space-between;
            font-weight: 600;
          }
 
          .items-table-container {
            min-height: 0;
            border-bottom: 0.5px solid #9ca3af;
          }
 
          .items-table {
            width: 100%;
            height: 100%;
            font-size: 11px;
            border-collapse: collapse;
            table-layout: fixed;
          }
 
          .items-table thead tr {
            background-color: #f9fafb;
            border-top: 0.5px solid #9ca3af;
            border-bottom: 0.5px solid #9ca3af;
            height: 28px;
          }
 
          .items-table th {
            border-left: 0.5px solid #9ca3af;
            border-right: 0.5px solid #9ca3af;
            padding: 2px 6px;
            text-align: left;
            font-weight: 900;
            text-transform: uppercase;
            font-size: 10px;
          }
 
          .items-table td {
            border-left: 0.5px solid #9ca3af;
            border-right: 0.5px solid #9ca3af;
            padding: 3px 6px;
            vertical-align: top;
          }
 
          .item-row {
            height: 24px;
            line-height: 24px;
          }
 
          .spacer-row {
            height: 100%;
          }
 
          .form-footer {
            padding-top: 8px;
          }
 
          .footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
 
          .words-section {
            font-size: 10px;
          }
 
          .totals-section {
            text-align: right;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
 
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
          }
 
          .total-label {
            font-weight: bold;
            color: #4b5563;
          }
 
          .grand-total-section {
            border-top: 1.5px solid black;
            padding-top: 4px;
            margin-top: 2px;
          }
 
          .grand-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
 
          .grand-total-label {
            font-size: 16px;
            font-weight: 900;
            font-style: italic;
          }
 
          .grand-total-value {
            font-size: 18px;
            font-weight: 900;
          }
 
          .signature-area {
            padding-top: 12px;
            display: flex;
            justify-content: space-between;
            align-items: end;
          }
 
          .bank-info {
            font-size: 9px;
            text-align: left;
            width: 55%;
          }
 
          .bank-title {
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 2px;
            text-transform: uppercase;
            font-size: 8px;
          }
 
          .bank-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 0px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 8px;
            color: #1f2937;
          }
 
          .signatory-box {
            text-align: right;
          }
 
          .signatory-title {
            font-size: 9px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 20px;
            text-transform: uppercase;
          }
 
          .signatory-line {
            font-size: 8px;
            font-weight: 500;
            width: 140px;
            margin-left: auto;
            text-align: center;
            border-top: 0.5px solid #9ca3af;
            padding-top: 2px;
            color: #4b5563;
          }
        </style>
      </head>
      <body>
        ${billHTML}
      </body>
      </html>
    `

    console.log('🎨 BILL-PDF: Starting Puppeteer...')

    let browser
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless as any,
        ignoreHTTPSErrors: true,
      })

      console.log('✅ BILL-PDF: Puppeteer launched successfully')

      const page = await browser.newPage()
      await page.setContent(fullHTML, { waitUntil: 'networkidle0' })

      console.log('✅ BILL-PDF: HTML content set, generating PDF...')

      const pdf = await page.pdf({
        format: 'a4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: {
          top: '0mm',
          bottom: '0mm',
          left: '0mm',
          right: '0mm'
        }
      })

      const filename = `Bill_${bill.bill_number}.pdf`
      console.log('✅ BILL-PDF: PDF generated successfully, filename:', filename)

      return new NextResponse(pdf as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename=${filename}`
        }
      })
    } finally {
      if (browser) await browser.close()
    }

  } catch (error) {
    console.error('❌ BILL-PDF: PDF generation error:', error)
    return NextResponse.json({ error: 'PDF generation failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

function generateBillHTML(bill: any, items: any[], _pageNumber: number, _totalPages: number): string {
  const isKacchi = bill.bill_type === 'kacchi'
  const partyName = bill.parties?.name || ''
  const partyGst = bill.parties?.gst_number || ''

  const grandTotal = (bill.total_amount || 0) + (bill.gst_total || 0) + (bill.balance || 0)
  const totalInWords = numberToWords(grandTotal)

  const companyGst = '27CQIPS6685K1ZU'

  const billNum = String(bill.bill_number)
  let formattedBillNo: string
  if (billNum.startsWith('P') || billNum.startsWith('K')) {
    const numPart = billNum.substring(1)
    formattedBillNo = billNum.charAt(0) + numPart.padStart(3, '0')
  } else {
    const prefix = isKacchi ? 'K' : 'P'
    formattedBillNo = `${prefix}${billNum.padStart(3, '0')}`
  }

  const billDateStr = new Date(bill.bill_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  })

  const itemRows = items.map((item) => {
    const isPaddyItem = item.particular?.toLowerCase().includes('paddy')
    return `
      <tr class="item-row">
        <td>
          <div>${item.particular}</div>
          ${isPaddyItem && item.weight_kg ? `<div style="font-size: 10px; color: #2563eb; font-weight: bold;">(${item.weight_kg}kg total)</div>` : ''}
        </td>
        <td style="text-align: center;">${item.qty_bags || ''}</td>
        <td style="text-align: center;">${isPaddyItem ? `${item.weight_kg || ''}kg` : (item.weight_kg || '')}</td>
        <td style="text-align: center;">${item.rate ? `${item.rate.toFixed(2)}${isPaddyItem ? ' ₹/kg' : ''}` : ''}</td>
        <td style="text-align: right; font-weight: bold;">${item.amount?.toFixed(2) || ''}</td>
      </tr>
    `
  }).join('')
 
  return `
    <div class="a4-page">
      <div class="watermark-ms">MS</div>
      
      <div class="content-wrapper">
        <div class="header-top">
          <div class="jurisdiction">${!isKacchi ? 'Subject to Sangli Jurisdiction' : ''}</div>
          <div class="header-grid">
            <div></div>
            <div style="text-align: center;">
              <div class="memo-badge">${isKacchi ? 'CASH / CREDIT MEMO' : 'CREDIT MEMO'}</div>
            </div>
            <div class="contact-info">
              <div style="text-transform: uppercase;">Contact:</div>
              <div>9860022450</div>
              <div>9561420666</div>
            </div>
          </div>
          
          <h1 class="company-name">M S TRADING COMPANY</h1>
          <div class="company-address">KUPWAD MIDC NEAR NAV KRISHNA VALLEY, PLOT NO L-52</div>
          ${!isKacchi ? `<div class="company-gst">GST IN : ${companyGst}</div>` : ''}
          
          <div class="red-divider-main"></div>
          <div class="red-divider-sub"></div>
        </div>

        <div class="bill-info-grid">
          <div>
            <div class="info-label">From :</div>
            <div style="font-weight: bold;">M S TRADING COMPANY</div>
          </div>
          <div style="text-align: center;">
            <div class="info-label">No.</div>
            <div class="bill-no">${formattedBillNo}</div>
          </div>
          <div style="text-align: right;">
            <div class="info-label">Date :</div>
            <div style="font-weight: bold; font-size: 16px;">${billDateStr}</div>
          </div>
        </div>

        <div class="party-details">
          <div class="party-name-row">
            <span style="font-weight: bold;">M/s. </span>
            <span class="party-name-underline">${partyName || '_'.repeat(40)}</span>
          </div>
          ${(bill.vehicle_number || (!isKacchi && partyGst)) ? `
            <div class="vehicle-gst-row">
              ${bill.vehicle_number ? `
                <div>
                  <span style="color: #4b5563;">Vehicle No.: </span>
                  <span>${bill.vehicle_number}</span>
                </div>
              ` : '<div></div>'}
              ${!isKacchi && partyGst ? `
                <div>
                  <span style="color: #4b5563;">GST No.: </span>
                  <span>${partyGst}</span>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <div class="items-table-container">
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: auto;">Particulars</th>
                <th style="width: 96px; text-align: center;">Qty. Bags</th>
                <th style="width: 112px; text-align: center;">Weight in Kg.</th>
                <th style="width: 96px; text-align: center;">Rate</th>
                <th style="width: 128px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <tr class="spacer-row">
                <td style="border-bottom: 1px solid #9ca3af;"></td>
                <td style="border-bottom: 1px solid #9ca3af;"></td>
                <td style="border-bottom: 1px solid #9ca3af;"></td>
                <td style="border-bottom: 1px solid #9ca3af;"></td>
                <td style="border-bottom: 1px solid #9ca3af;"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="form-footer">
          <div class="footer-grid">
            <div class="words-section">
              <div>
                <div style="font-weight: bold; font-size: 10px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Rs. in Words:</div>
                <div style="font-size: 11px; font-weight: bold; line-height: 1.25; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
                  ${totalInWords}
                </div>
              </div>
            </div>
 
            <div class="totals-section">
              <div class="total-row">
                <span class="total-label">SUB TOTAL</span>
                <span style="font-weight: bold;">₹ ${(bill.total_amount || 0).toFixed(2)}</span>
              </div>
 
              ${!isKacchi && bill.is_gst_enabled && (bill.gst_total || 0) > 0 ? `
                <div style="margin-top: 4px; border-top: 1px solid #f3f4f6; padding-top: 4px;">
                  ${(bill.cgst_percent || 0) > 0 ? `
                    <div class="total-row" style="font-size: 12px; color: #4b5563;">
                      <span>CGST @ ${bill.cgst_percent}%</span>
                      <span style="font-weight: bold; color: black;">₹ ${bill.cgst_amount.toFixed(2)}</span>
                    </div>
                  ` : ''}
                   ${(bill.igst_percent || 0) > 0 ? `
                    <div class="total-row" style="font-size: 12px; color: #4b5563;">
                      <span>IGST @ ${bill.igst_percent}%</span>
                      <span style="font-weight: bold; color: black;">₹ ${bill.igst_amount.toFixed(2)}</span>
                    </div>
                  ` : ''}
                  <div class="total-row" style="font-size: 12px; font-weight: bold; padding-top: 4px; border-top: 1px solid #f3f4f6; margin-top: 2px;">
                    <span>GST Total:</span>
                    <span>₹ ${bill.gst_total.toFixed(2)}</span>
                  </div>
                </div>
              ` : ''}
 
              ${bill.balance > 0 ? `
                <div class="total-row" style="margin-top: 4px;">
                  <span class="total-label">BALANCE</span>
                  <span style="font-weight: bold; color: #ea580c;">₹ ${bill.balance.toFixed(2)}</span>
                </div>
              ` : ''}
 
              <div class="grand-total-section">
                <div class="grand-total-row">
                  <span class="grand-total-label">TOTAL</span>
                  <span class="grand-total-value">₹ ${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
 
          <div class="signature-area">
            <div class="bank-info">
              ${(!isKacchi && bill.bank_name) ? `
                <div class="bank-title">BANK DETAILS:</div>
                <div class="bank-grid">
                  <div style="display: flex; gap: 8px;"><span>BANK :</span> <span style="color: #111827;">${bill.bank_name}</span></div>
                  <div style="display: flex; gap: 8px;"><span>IFSC CODE NO. :</span> <span style="color: #111827;">${bill.bank_ifsc}</span></div>
                  <div style="display: flex; gap: 8px;"><span>S. B. No. :</span> <span style="color: #111827;">${bill.bank_account}</span></div>
                </div>
              ` : ''}
            </div>
            <div class="signatory-box">
              <div class="signatory-title">For M S TRADING COMPANY</div>
              <div class="signatory-line">Auth. Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}
