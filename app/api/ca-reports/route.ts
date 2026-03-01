import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { billType, financialYear, month, reportType } = await request.json()

    // Build query based on filters
    let query = supabase
      .from('bills')
      .select(`
        *,
        parties (
          id,
          name,
          gst_number
        ),
        bill_items (*)
      `)
      .eq('financial_year', financialYear)
      .order('bill_date', { ascending: true })
      .order('bill_number', { ascending: true })

    // Filter by bill type
    if (billType !== 'both') {
      query = query.eq('bill_type', billType)
    }

    // Filter by month if specified
    if (month && month !== 'all') {
      query = query.eq('month_number', parseInt(month))
    }

    const { data: bills, error } = await query

    if (error) {
      console.error('Error fetching bills:', error)
      return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 })
    }

    // Generate the CA report HTML
    const reportHTML = await generateCAReportHTML(bills || [], {
      billType,
      financialYear,
      month,
      reportType
    })

    // Generate PDF
    const isProd = process.env.NODE_ENV === 'production'

    const browser = await puppeteer.launch({
      args: isProd ? chromium.args : [],
      defaultViewport: chromium.defaultViewport,
      executablePath: isProd
        ? await chromium.executablePath()
        : undefined,
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(reportHTML, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'a4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size:10px; width:100%; text-align:center; color:#666;">
          CA Report - ${billType.toUpperCase()} Bills - ${financialYear}
        </div>
      `,
      footerTemplate: `
        <div style="font-size:9px; width:100%; text-align:center; color:#666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '10mm',
        right: '10mm'
      },
      preferCSSPageSize: true
    })

    await browser.close()

    const filename = `CA_Report_${billType.toUpperCase()}_${financialYear}${month && month !== 'all' ? `_${month}` : ''}.pdf`

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${filename}`
      }
    })

  } catch (error) {
    console.error('CA Report generation error:', error)
    return NextResponse.json({ error: 'CA Report generation failed' }, { status: 500 })
  }
}

async function generateCAReportHTML(bills: any[], filters: any): Promise<string> {
  const { billType, financialYear, month, reportType } = filters

  // Calculate summaries
  const summary = calculateCASummary(bills)

  // Group by parties
  const partySummary = calculatePartySummary(bills)

  // Generate GST breakdown
  const gstBreakdown = calculateGSTBreakdown(bills)

  const billTypeLabel = billType === 'both' ? 'KACCHI & PAKKI' : billType.toUpperCase()
  const periodLabel = month && month !== 'all' ? `Month ${month}` : 'Full Year'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          line-height: 1.4;
        }

        .report-header {
          background: linear-gradient(135deg, #c81e1e 0%, #a01717 100%);
          color: white;
          padding: 20px;
          text-align: center;
        }

        .report-title {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .report-subtitle {
          font-size: 18px;
          opacity: 0.9;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin: 20px 0;
        }

        .summary-card {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .summary-value {
          font-size: 24px;
          font-weight: 700;
          color: #c81e1e;
          margin-bottom: 4px;
        }

        .summary-label {
          font-size: 12px;
          color: #6c757d;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .table-container {
          margin: 20px 0;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          overflow: hidden;
        }

        .table-header {
          background: #f8f9fa;
          padding: 12px 16px;
          border-bottom: 2px solid #c81e1e;
          font-weight: 700;
          font-size: 16px;
          color: #495057;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }

        th {
          background: #f8f9fa;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #495057;
        }

        tr:nth-child(even) {
          background: #f8f9fa;
        }

        .amount-cell {
          text-align: right;
          font-variant-numeric: tabular-nums;
          font-weight: 600;
        }

        .gst-breakdown {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
        }

        .gst-title {
          font-size: 16px;
          font-weight: 700;
          color: #856404;
          margin-bottom: 12px;
        }

        .gst-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .gst-item {
          background: white;
          padding: 8px 12px;
          border-radius: 4px;
          border: 1px solid #ffeaa7;
        }

        .page-break {
          page-break-before: always;
        }

        .section-title {
          font-size: 20px;
          font-weight: 700;
          color: #c81e1e;
          margin: 30px 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #c81e1e;
        }
      </style>
    </head>
    <body>
      <!-- Cover Page -->
      <div class="report-header">
        <div class="report-title">M S TRADING COMPANY</div>
        <div class="report-subtitle">Chartered Accountant Report</div>
        <div style="margin-top: 16px; font-size: 14px;">
          <div><strong>${billTypeLabel} BILLS</strong></div>
          <div>Financial Year: ${financialYear}</div>
          <div>Period: ${periodLabel}</div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div style="padding: 20px;">
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-value">${summary.totalBills}</div>
            <div class="summary-label">Total Bills</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">₹${summary.totalTaxable.toLocaleString('en-IN')}</div>
            <div class="summary-label">Taxable Amount</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">₹${summary.totalGST.toLocaleString('en-IN')}</div>
            <div class="summary-label">Total GST</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">₹${summary.totalAmount.toLocaleString('en-IN')}</div>
            <div class="summary-label">Grand Total</div>
          </div>
        </div>

        <!-- GST Breakdown -->
        <div class="gst-breakdown">
          <div class="gst-title">GST Analysis</div>
          <div class="gst-grid">
            <div class="gst-item">
              <div style="font-weight: 600; color: #495057;">CGST</div>
              <div style="font-size: 18px; font-weight: 700; color: #c81e1e;">₹${gstBreakdown.cgst.toLocaleString('en-IN')}</div>
            </div>
            <div class="gst-item">
              <div style="font-weight: 600; color: #495057;">SGST</div>
              <div style="font-size: 18px; font-weight: 700; color: #c81e1e;">₹${gstBreakdown.sgst.toLocaleString('en-IN')}</div>
            </div>
            <div class="gst-item">
              <div style="font-weight: 600; color: #495057;">IGST</div>
              <div style="font-size: 18px; font-weight: 700; color: #c81e1e;">₹${gstBreakdown.igst.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Party-wise Summary -->
      <div class="page-break">
        <div style="padding: 20px;">
          <div class="section-title">Party-wise Summary</div>

          <div class="table-container">
            <div class="table-header">Bill Summary by Party</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 40%;">Party Name</th>
                  <th style="width: 15%; text-align: center;">Bills</th>
                  <th style="width: 20%; text-align: right;">Taxable Amount</th>
                  <th style="width: 15%; text-align: right;">GST</th>
                  <th style="width: 20%; text-align: right;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${partySummary.map(party => `
                  <tr>
                    <td style="font-weight: 600;">${party.name}</td>
                    <td style="text-align: center;">${party.bills}</td>
                    <td class="amount-cell">₹${party.taxable.toLocaleString('en-IN')}</td>
                    <td class="amount-cell">₹${party.gst.toLocaleString('en-IN')}</td>
                    <td class="amount-cell" style="font-weight: 700;">₹${party.total.toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Detailed Bill Register -->
      <div class="page-break">
        <div style="padding: 20px;">
          <div class="section-title">Bill Register</div>

          <div class="table-container">
            <div class="table-header">Detailed Bill Transactions</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 8%;">Bill No.</th>
                  <th style="width: 12%;">Date</th>
                  <th style="width: 25%;">Party Name</th>
                  <th style="width: 15%; text-align: right;">Taxable</th>
                  <th style="width: 10%; text-align: right;">GST</th>
                  <th style="width: 15%; text-align: right;">Total</th>
                  <th style="width: 15%;">Type</th>
                </tr>
              </thead>
              <tbody>
                ${bills.map(bill => {
                  const billTypeDisplay = bill.bill_type === 'kacchi' ? 'KACCHI' : 'PAKKI'
                  return `
                    <tr>
                      <td style="font-weight: 600; color: #c81e1e;">${bill.bill_number}</td>
                      <td>${new Date(bill.bill_date).toLocaleDateString('en-IN')}</td>
                      <td>${bill.parties?.name || 'N/A'}</td>
                      <td class="amount-cell">₹${(bill.taxable_amount || 0).toLocaleString('en-IN')}</td>
                      <td class="amount-cell">₹${(bill.gst_total || 0).toLocaleString('en-IN')}</td>
                      <td class="amount-cell" style="font-weight: 700;">₹${(bill.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <span style="background: ${bill.bill_type === 'kacchi' ? '#28a745' : '#007bff'};
                                   color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                          ${billTypeDisplay}
                        </span>
                      </td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

function calculateCASummary(bills: any[]) {
  return {
    totalBills: bills.length,
    totalTaxable: bills.reduce((sum, b) => sum + (b.taxable_amount || 0), 0),
    totalGST: bills.reduce((sum, b) => sum + (b.gst_total || 0), 0),
    totalAmount: bills.reduce((sum, b) => sum + (b.total_amount || 0), 0)
  }
}

function calculatePartySummary(bills: any[]) {
  const partyMap = new Map()

  bills.forEach(bill => {
    const partyId = bill.parties?.id || 'unknown'
    const partyName = bill.parties?.name || 'Unknown Party'

    if (!partyMap.has(partyId)) {
      partyMap.set(partyId, {
        name: partyName,
        bills: 0,
        taxable: 0,
        gst: 0,
        total: 0
      })
    }

    const party = partyMap.get(partyId)
    party.bills++
    party.taxable += bill.taxable_amount || 0
    party.gst += bill.gst_total || 0
    party.total += bill.total_amount || 0
  })

  return Array.from(partyMap.values())
    .sort((a, b) => b.total - a.total) // Sort by total amount descending
}

function calculateGSTBreakdown(bills: any[]) {
  return {
    cgst: bills.reduce((sum, b) => sum + (b.cgst_amount || 0), 0),
    sgst: bills.reduce((sum, b) => sum + (b.sgst_amount || 0), 0),
    igst: bills.reduce((sum, b) => sum + (b.igst_amount || 0), 0)
  }
}
