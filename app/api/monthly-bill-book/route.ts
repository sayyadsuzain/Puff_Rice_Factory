import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseUrl, supabaseAnonKey, numberToWords } from '@/lib/supabase'
import { LOGO_BASE64 } from '@/lib/logo-base64'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { financialYear, month, mode, billType } = await request.json()

    // Create an authenticated Supabase client for the server-side request
    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    let query = supabase
      .from('bills')
      .select(`
        *,
        parties (
          id,
          name,
          gst_number
        )
      `)
      .order('bill_date', { ascending: true })
      .order('bill_number', { ascending: true })

    if (mode === 'monthly') {
      query = query.eq('month_number', month).eq('financial_year', financialYear)
    } else {
      query = query.eq('financial_year', financialYear)
    }

    // Filter by bill type if specified
    if (billType && billType !== 'both') {
      query = query.eq('bill_type', billType)
    }

    const { data: bills, error: billsError } = await query

    if (billsError) {
      console.error('Error fetching bills:', billsError)
      return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 })
    }

    if (!bills || bills.length === 0) {
      return NextResponse.json({ error: 'No bills found for the selected period' }, { status: 404 })
    }

    // Debug: Check party data
    console.log('=== MONTHLY PDF PARTY DEBUG ===')
    console.log(`Processing ${bills.length} bills for ${financialYear} ${mode === 'monthly' ? 'month ' + month : 'yearly'}`)

    bills.forEach(bill => {
      console.log(`Monthly PDF Bill ${bill.id} (${bill.bill_number}): party_id=${bill.party_id}, parties object:`, JSON.stringify(bill.parties), `party_name=${bill.parties?.name || 'NOT FOUND'}`)
    })

    // Check if bills have valid party_ids
    const billsWithPartyIds = bills.filter(bill => bill.party_id)
    console.log(`Monthly PDF: Bills with party_ids: ${billsWithPartyIds.length}/${bills.length}`)

    // Check parties table - get ALL parties to see what's available
    const { data: allParties, error: partiesCheckError } = await supabase
      .from('parties')
      .select('id, name, gst_number')
      .order('id')

    if (partiesCheckError) {
      console.error('Monthly PDF: Error checking parties:', partiesCheckError)
    } else {
      console.log(`Monthly PDF: All ${allParties?.length || 0} parties in database:`, allParties?.map(p => ({ id: p.id, name: p.name })))
    }

    // Check for bills without party data and fetch them separately
    const billsWithoutParties = bills.filter(bill => bill.party_id && !bill.parties?.name)
    if (billsWithoutParties.length > 0) {
      console.log(`Monthly PDF: Found ${billsWithoutParties.length} bills without party data, fetching separately...`)
      console.log('Bills without parties:', billsWithoutParties.map(b => ({ id: b.id, bill_number: b.bill_number, party_id: b.party_id })))

      const partyIds = billsWithoutParties.map(bill => bill.party_id).filter(id => id)
      console.log('Party IDs to fetch:', partyIds)

      if (partyIds.length > 0) {
        const { data: partiesData, error: partiesError } = await supabase
          .from('parties')
          .select('id, name, gst_number')
          .in('id', partyIds)

        console.log('Parties query result:', { data: partiesData, error: partiesError })

        if (!partiesError && partiesData) {
          console.log(`Monthly PDF: Fetched ${partiesData.length} parties:`, partiesData.map(p => ({ id: p.id, name: p.name })))

          // Create a map of party data
          const partiesMap = partiesData.reduce((map, party) => {
            map[party.id] = party
            return map
          }, {} as Record<number, any>)

          // Update bills with party data
          bills.forEach(bill => {
            if (bill.party_id && partiesMap[bill.party_id]) {
              bill.parties = partiesMap[bill.party_id]
              console.log(`Monthly PDF: Updated bill ${bill.id} with party:`, bill.parties.name)
            } else {
              console.log(`Monthly PDF: Could not find party for bill ${bill.id} with party_id ${bill.party_id}`)
            }
          })

          console.log(`Monthly PDF: Successfully fetched party data for ${Object.keys(partiesMap).length} parties`)
        } else {
          console.error('Monthly PDF: Error fetching party data separately:', partiesError)
        }
      }
    } else {
      console.log('Monthly PDF: All bills have party data from join')
    }

    // Final check
    console.log('=== FINAL PARTY CHECK ===')
    bills.forEach(bill => {
      console.log(`Final: Bill ${bill.id} (${bill.bill_number}) -> Party: ${bill.parties?.name || 'NOT FOUND'}`)
    })

    const billIds = bills.map(b => b.id)

    const { data: items, error: itemsError } = await supabase
      .from('bill_items')
      .select('*')
      .in('bill_id', billIds)

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch bill items' }, { status: 500 })
    }

    const itemsMap: Record<string, any[]> = {}
    items?.forEach(item => {
      if (!itemsMap[item.bill_id]) itemsMap[item.bill_id] = []
      itemsMap[item.bill_id].push(item)
    })

    const summary = calculateSummary(bills)
    const totalPages = 1 + bills.length // 1 for cover page, rest for bills

    // Generate cover page HTML
    const coverHTML = generateCoverHTML(summary, financialYear, month, mode, billType)

    // Generate bill pages HTML
    const billsHTML = bills.map((bill, index) => {
      // Generate HTML that matches the professional A4 layout
      const billHTML = generateBillHTML(bill, itemsMap[bill.id] || [], index + 2, totalPages) // index + 2 because page 1 is cover

      return billHTML
    }).join('')

    const fullHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
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
        ${coverHTML}
        ${billsHTML}
      </body>
      </html>
    `

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
        displayHeaderFooter: false,
        margin: {
          top: '0mm',
          bottom: '0mm',
          left: '0mm',
          right: '0mm'
        }
      })

      const filename = mode === 'monthly'
        ? `${billType && billType !== 'both' ? billType.charAt(0).toUpperCase() + billType.slice(1) + '_' : ''}BillBook_${getMonthName(month)}_${financialYear}.pdf`
        : `${billType && billType !== 'both' ? billType.charAt(0).toUpperCase() + billType.slice(1) + '_' : ''}YearlyBillBook_${financialYear}.pdf`

      return new NextResponse(pdf as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=${filename}`
        }
      })
    } finally {
      if (browser) await browser.close()
    }

  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}

function calculateSummary(bills: any[]) {
  const totalBills = bills.length
  const totalSales = bills.reduce((sum, b) => sum + (b.total_amount || 0), 0)
  const totalGST = bills.reduce((sum, b) => sum + (b.gst_total || 0), 0)
  const totalTaxable = bills.reduce((sum, b) => sum + (b.taxable_amount || 0), 0)

  return { totalBills, totalSales, totalGST, totalTaxable }
}

function getMonthName(monthNumber: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[monthNumber - 1] || 'Unknown'
}

function generateCoverHTML(summary: any, financialYear: string, month: number, mode: string, billType?: string): string {
  const billTypeLabel = billType && billType !== 'both'
    ? `${billType.charAt(0).toUpperCase() + billType.slice(1)} Bills`
    : 'All Bills'
  const periodLabel = mode === 'monthly'
    ? `Month: ${getMonthName(month)} ${financialYear}`
    : `Financial Year: ${financialYear}`

  return `
    <div style="text-align: center; padding-top: 200px; page-break-after: always;">
      <h1 class="cover-title">M S TRADING COMPANY</h1>
      <h2 class="cover-subtitle">${billTypeLabel} - ${mode === 'monthly' ? 'Monthly' : 'Yearly'} Bill Book</h2>
      <p class="cover-info">${periodLabel}</p>
      <hr style="border: none; border-top: 2px solid #c81e1e; margin: 40px auto; width: 300px;" />
      <div class="cover-summary">
        <p><strong>Total Bills:</strong> ${summary.totalBills}</p>
        <p><strong>Total Taxable Amount:</strong> ₹ ${summary.totalTaxable.toLocaleString('en-IN')}</p>
        <p><strong>Total GST:</strong> ₹ ${summary.totalGST.toLocaleString('en-IN')}</p>
        <p><strong>Total Sales:</strong> ₹ ${summary.totalSales.toLocaleString('en-IN')}</p>
      </div>
    </div>
  `
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

      <!-- Page Number -->
      <div class="page-number">
        Page ${pageNumber} of ${totalPages}
      </div>
    </div>
  `
}
