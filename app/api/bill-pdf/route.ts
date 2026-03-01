import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { supabase } from '@/lib/supabase'

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

    // Fetch bill with party data
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select(`
        *,
        parties (
          id,
          name,
          gst_number
        )
      `)
      .eq('id', parseInt(billId))
      .single()

    if (billError || !bill) {
      console.error('❌ BILL-PDF: Bill fetch error:', billError)
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    console.log('✅ BILL-PDF: Bill fetched successfully:', bill.id)

    // Fetch bill items
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

    // Generate professional PDF using shared layout
    const partyName = bill.parties?.name || 'Party Not Found'
    const partyGst = bill.parties?.gst_number

    console.log('🎨 BILL-PDF: Generating HTML for bill...')
    const billHTML = generateBillHTML(
      bill,
      items || [],
      1,   // pageNumber
      1    // totalPages
    )

    const fullHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            line-height: 1.35;
          }

          .a4-page {
            position: relative;
            width: 210mm;
            height: 297mm;
            padding: 15mm;
            box-sizing: border-box;
            border: 2px solid #d1d5db;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            background: white;
            overflow: hidden;
          }

          .watermark-ms {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 200px;
            font-weight: 700;
            letter-spacing: 14px;
            color: rgba(140, 140, 140, 0.2);
            pointer-events: none;
            user-select: none;
            z-index: 0;
            font-family: "Playfair Display", "Times New Roman", Georgia, serif;
          }

          .header-section {
            min-height: 0;
            position: relative;
            z-index: 1;
          }

          .table-wrapper {
            flex: 1;
            border: 1px solid #cbd5e1;
            border-top: none;
            display: flex;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .spacer-row td {
            border-top: none;
            border-bottom: none;
            height: 100%;
          }

          .items-table th,
          .items-table td {
            border-left: 1px solid #cbd5e1;
            border-right: 1px solid #cbd5e1;
            padding: 6px;
            vertical-align: top;
          }

          .items-table thead th {
            border-bottom: 1px solid #cbd5e1;
            background: #f1f5f9;
            font-weight: 600;
            text-align: left;
            letter-spacing: 0.3px;
          }

          .items-table thead th:nth-child(2),
          .items-table thead th:nth-child(3),
          .items-table thead th:nth-child(4) {
            text-align: center;
          }

          .items-table thead th:nth-child(5) {
            text-align: right;
          }

          .items-table tbody td:nth-child(2),
          .items-table tbody td:nth-child(3),
          .items-table tbody td:nth-child(4) {
            text-align: center;
          }

          .items-table tbody td:nth-child(5) {
            text-align: right;
          }

          .items-table tbody td {
            border-top: none;
            border-bottom: none;
          }

          .items-table tbody tr:last-child td {
            border-bottom: 1px solid #cbd5e1;
          }

          .footer-section {
            flex: 0 0 auto;
            margin-top: auto;
            position: relative;
            z-index: 1;
          }

          .totals-wrapper {
            width: 280px;
            margin-left: auto;
            text-align: right;
          }

          .amount-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2px;
          }

          .amount-row .label {
            font-weight: 600;
            text-align: left;
          }

          .amount-row .value {
            font-weight: bold;
            min-width: 120px;
            text-align: right;
            font-variant-numeric: tabular-nums;
          }

          .total-section {
            border-top: 2px solid #000;
            padding-top: 6px;
            margin-top: 8px;
          }

          .currency {
            margin-right: 2px;
          }

          /* HEADER LAYOUT */
          .header {
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            padding-bottom: 12px;
            margin-bottom: 10mm;
            border-bottom: 2px solid #c81e1e;
          }

          /* CENTER INFO */
          .header-center {
            text-align: center;
            flex: 1;
          }

          .company-name {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: 1.5px;
            color: #c81e1e;
            margin: 6px 0;
          }

          .memo-badge {
            display: inline-block;
            background: #c81e1e;
            color: #fff;
            padding: 4px 14px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin: 6px 0;
          }

          .company-address,
          .company-gst,
          .jurisdiction {
            font-size: 12px;
            letter-spacing: 0.4px;
            color: #444;
            margin: 2px 0;
          }

          /* RIGHT CONTACT */
          .header-right {
            text-align: right;
            font-size: 12px;
            line-height: 1.4;
            color: #444;
          }

          .contact-title {
            font-weight: bold;
            margin-bottom: 4px;
          }

          /* DIVIDER */
          .header-divider {
            height: 2px;
            background: #c81e1e;
            margin: 12px 0 18px;
          }

          /* Ensure no page breaks in important sections */
          .header-section,
          .footer-section {
            page-break-inside: avoid;
          }

          .items-table {
            page-break-inside: auto;
          }

          .items-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          /* Cover page styling */
          .cover-title {
            font-size: 48px;
            font-weight: bold;
            color: #c81e1e;
            margin-bottom: 20px;
          }

          .cover-subtitle {
            font-size: 36px;
            margin-bottom: 30px;
          }

          .cover-info {
            font-size: 24px;
            margin: 20px 0;
          }

          .cover-summary {
            font-size: 20px;
            margin-top: 50px;
          }

          .page-number {
            position: absolute;
            bottom: 10mm;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10px;
            color: #666;
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
        headless: chromium.headless,
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

      return new NextResponse(pdf, {
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

function generateBillHTML(bill: any, items: any[], pageNumber: number, totalPages: number): string {
  const isKacchi = bill.bill_type === 'kacchi'
  const partyName = bill.parties?.name || 'Party Not Found'
  const partyGst = bill.parties?.gst_number || ''

  // Calculate the final grand total
  const grandTotal = (bill.total_amount || 0) + (bill.gst_total || 0) + (bill.balance || 0)

  // Calculate total in words for the grand total
  const totalInWords = numberToWords(grandTotal)

  // Company info
  const companyName = 'M S TRADING COMPANY'
  const companyAddress = 'KUPWAD MIDC NEAR NAV KRISHNA VALLEY, PLOT NO L-52'
  const companyGst = '27CQIPS6685K1ZU'

  // Format bill number
  const billNum = String(bill.bill_number)
  let formattedBillNumber: string
  if (billNum.startsWith('P') || billNum.startsWith('K')) {
    const numPart = billNum.substring(1)
    formattedBillNumber = billNum.charAt(0) + numPart.padStart(3, '0')
  } else {
    const prefix = bill.bill_type === 'kacchi' ? 'K' : 'P'
    formattedBillNumber = `${prefix}${billNum.padStart(3, '0')}`
  }

  // Format date
  const billDate = new Date(bill.bill_date).toLocaleDateString('en-IN')

  // Calculate minimum rows for professional look (always at least 8 rows)
  const minRows = 8
  const actualRows = items.length
  const emptyRowsNeeded = Math.max(0, minRows - actualRows)

  // Generate item rows
  const itemRows = items.map((item, idx) => {
    const isPaddyItem = item.particular?.toLowerCase().includes('paddy')
    return `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px 6px; font-size: 12.5px;">
          <div>${item.particular}</div>
          ${isPaddyItem && item.weight_kg ? `<div style="font-size: 11px; color: #2563eb;">(${item.weight_kg}kg total)</div>` : ''}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 12.5px; width: 60px;">${item.qty_bags || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 12.5px; width: 70px;">
          ${isPaddyItem ? `${item.weight_kg || ''}kg` : (item.weight_kg || '')}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 12.5px; width: 60px;">
          ${item.rate ? `<span class="currency">₹</span><span class="value">${item.rate.toFixed(2)}${isPaddyItem ? ' ₹/kg' : ''}</span>` : ''}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: right; font-size: 12.5px; width: 80px; font-variant-numeric: tabular-nums;">${item.amount?.toFixed(2) || ''}</td>
      </tr>
    `
  }).join('')

  // Generate empty rows to fill minimum height
  const emptyRows = Array.from({ length: emptyRowsNeeded }).map(() => `
    <tr style="height: 24px;">
      <td style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding: 8px 6px; font-size: 12.5px;"></td>
      <td style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding: 8px 6px; font-size: 12.5px;"></td>
      <td style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding: 8px 6px; font-size: 12.5px;"></td>
      <td style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding: 8px 6px; font-size: 12.5px;"></td>
      <td style="border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding: 8px 6px; font-size: 12.5px;"></td>
    </tr>
  `).join('')

  return `
    <div class="a4-page">
      <!-- MS Watermark -->
      <div class="watermark-ms">MS</div>
      
      <!-- Header Section (Fixed Height) -->
      <div class="header-section">
        <!-- Company Header -->
        <div class="header">
          <!-- CENTER: Company Info -->
          <div class="header-center">
            ${isKacchi ? `
              <div class="memo-badge">CASH / CREDIT MEMO</div>
            ` : `
              <div class="jurisdiction">Subject to Sangli Jurisdiction</div>
              <div class="memo-badge">CREDIT MEMO</div>
            `}

            <h1 class="company-name">${companyName}</h1>
            <div class="company-address">${companyAddress}</div>
            ${!isKacchi ? `<div class="company-gst">GST IN : ${companyGst}</div>` : ''}
          </div>

          <!-- RIGHT: Contact -->
          <div class="header-right">
            <div class="contact-title">Contact:</div>
            <div>9860022450</div>
            <div>9561420666</div>
          </div>
        </div>

        <div class="header-divider"></div>

        <!-- Bill Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 13px; margin-bottom: 14px; align-items: center;">
          <div>
            <div style="font-weight: bold; font-size: 12px;">From :</div>
            <div style="color: #6b7280; font-size: 11px;">${companyName}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: bold; font-size: 12px;">No.</div>
            <div style="font-size: 18px; font-weight: 700; color: #c81e1e;">${formattedBillNumber}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 12px;">Date :</div>
            <div style="font-weight: bold; font-size: 13px;">${billDate}</div>
          </div>
        </div>

        <!-- Party Details -->
        <div style="border-top: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db; padding: 6px 0; margin-bottom: 14px;">
          <div style="font-size: 13px;">
            <span style="font-weight: bold;">M/s. </span>
            <span style="color: #1f2937; font-weight: 600;">${partyName}</span>
          </div>
          ${(bill.vehicle_number || (!isKacchi && partyGst)) ? `
            <div style="font-size: 12px; margin-top: 3px; display: flex; justify-content: space-between;">
              ${bill.vehicle_number ? `
                <div>
                  <span style="font-weight: bold;">Vehicle No.: </span>
                  <span>${bill.vehicle_number}</span>
                </div>
              ` : ''}
              ${!isKacchi && partyGst ? `
                <div style="${bill.vehicle_number ? 'text-align: right;' : ''}">
                  <span style="font-weight: bold;">GST No.: </span>
                  <span>${partyGst}</span>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Items Section (Flexible - Expands to fill space) -->
      <div class="table-wrapper">
        <table class="items-table">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: left; font-weight: 700; font-size: 12.5px; letter-spacing: 0.3px; width: auto;">Particulars</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-weight: 700; font-size: 12.5px; letter-spacing: 0.3px; width: 60px;">Qty. Bags</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-weight: 700; font-size: 12.5px; letter-spacing: 0.3px; width: 70px;">Weight in Kg.</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-weight: 700; font-size: 12.5px; letter-spacing: 0.3px; width: 60px;">Rate</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: right; font-weight: 700; font-size: 12.5px; letter-spacing: 0.3px; width: 80px;">Amount ₹</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>

      <!-- Footer Section (Fixed at Bottom) -->
      <div class="footer-section">
        <!-- Rs. in Words - Left Side Only -->
        <div style="margin-bottom: 14px;">
          <div style="font-weight: bold; font-size: 12px; margin-bottom: 2px;">Rs. in Words:</div>
          <div style="font-size: 11px; line-height: 1.35;">${totalInWords}</div>
        </div>

        <!-- Total Section -->
        <div class="totals-wrapper">
          <div>
            <div class="amount-row" style="margin-bottom: 4px;">
              <span class="label" style="font-weight: 600;">SUB TOTAL</span>
              <span class="value" style="font-weight: bold; min-width: 120px; text-align: right; font-variant-numeric: tabular-nums;">₹ ${(bill.total_amount || 0).toFixed(2)}</span>
            </div>

            ${!isKacchi && bill.is_gst_enabled && (bill.gst_total || 0) > 0 ? `
              <div style="margin-top: 8px;">
                ${(bill.cgst_percent || 0) > 0 ? `
                  <div class="amount-row" style="padding: 1px 0;">
                    <span class="label" style="font-size: 11px;">CGST @ ${(bill.cgst_percent || 0)}%</span>
                    <span class="value" style="font-weight: bold; font-size: 11px; min-width: 120px; text-align: right; font-variant-numeric: tabular-nums;">₹ ${(bill.cgst_amount || 0).toFixed(2)}</span>
                  </div>
                ` : ''}
                ${(bill.igst_percent || 0) > 0 ? `
                  <div class="amount-row" style="padding: 1px 0;">
                    <span class="label" style="font-size: 11px;">IGST @ ${(bill.igst_percent || 0)}%</span>
                    <span class="value" style="font-weight: bold; font-size: 11px; min-width: 120px; text-align: right; font-variant-numeric: tabular-nums;">₹ ${(bill.igst_amount || 0).toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="amount-row" style="padding: 1px 0; border-top: 1px solid #d1d5db; padding-top: 2px; margin-top: 2px;">
                  <span class="label" style="font-size: 11px; font-weight: 600;">GST Total:</span>
                  <span class="value" style="font-weight: bold; font-size: 11px; min-width: 120px; text-align: right; font-variant-numeric: tabular-nums;">₹ ${(bill.gst_total || 0).toFixed(2)}</span>
                </div>
              </div>
            ` : ''}

            ${bill.balance != null && bill.balance > 0 ? `
              <div class="amount-row" style="margin-top: 6px;">
                <span class="label" style="font-size: 12px; font-weight: bold;">BALANCE</span>
                <span class="value" style="font-size: 12px; font-weight: bold; min-width: 120px; text-align: right; font-variant-numeric: tabular-nums;">₹ ${bill.balance.toFixed(2)}</span>
              </div>
            ` : ''}

            <div class="total-section">
              <div class="amount-row">
                <span class="label" style="font-size: 16px; font-weight: 800;">TOTAL</span>
                <span class="value" style="font-size: 18px; font-weight: 800; min-width: 120px; text-align: right; font-variant-numeric: tabular-nums;">₹ ${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

          <!-- Bank Details & Signature -->
          ${!isKacchi && bill.bank_name && bill.bank_ifsc && bill.bank_account ? `
            <div style="border-top: 1px solid #d1d5db; padding-top: 6px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px;">
                <div>
                  <div style="font-weight: bold; color: #c81e1e; margin-bottom: 2px;">BANK : ${bill.bank_name}</div>
                  <div>IFSC CODE NO. : ${bill.bank_ifsc}</div>
                  <div>S. B. No. : ${bill.bank_account}</div>
                </div>

                <div style="text-align: right; min-width: 220px;">
                  <div style="color: #c81e1e; font-weight: 600; margin-bottom: 15px;">For M S TRADING COMPANY</div>
                  <div style="font-size: 10px; color: #666;">Auth. Signatory</div>
                </div>
              </div>
            </div>
          ` : ''}
      </div>
    </div>
  `
}
