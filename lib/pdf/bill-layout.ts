import { BILL_CSS } from './bill-styles'
import { numberToWords, formatDate } from '../supabase'

export function generateBillHTML(
  bill: any,
  items: any[],
  options: {
    partyName: string
    partyGst?: string
    isKacchi: boolean
  }
): string {
  const { partyName, partyGst, isKacchi } = options
  const companyGst = '27CQIPS6685K1ZU'

  const grandTotal = (bill.total_amount || 0) + (bill.gst_total || 0) + (bill.balance || 0)
  const totalInWords = numberToWords(grandTotal)
  const billDateStr = formatDate(bill.bill_date)

  const billNum = String(bill.bill_number)
  let formattedBillNo: string
  if (billNum.startsWith('P') || billNum.startsWith('K')) {
    const numPart = billNum.substring(1)
    formattedBillNo = billNum.charAt(0) + numPart.padStart(3, '0')
  } else {
    const prefix = isKacchi ? 'K' : 'P'
    formattedBillNo = `${prefix}${billNum.padStart(3, '0')}`
  }

  const itemRows = items.map((item) => {
    const isPaddyItem = item.particular?.toLowerCase().includes('paddy')
    return `
      <tr class="item-row">
        <td style="border-left: 1px solid #9ca3af; border-right: 1px solid #e5e7eb;">
          <div style="font-weight: 500;">${item.particular || ''}</div>
          ${isPaddyItem && item.weight_kg ? `<div style="font-size: 10px; color: #2563eb; font-weight: bold;">(${item.weight_kg}kg total)</div>` : ''}
        </td>
        <td style="border-right: 1px solid #e5e7eb; text-align: center;">${item.qty_bags || ''}</td>
        <td style="border-right: 1px solid #e5e7eb; text-align: center;">${isPaddyItem ? `${item.weight_kg || ''}kg` : (item.weight_kg || '')}</td>
        <td style="border-right: 1px solid #e5e7eb; text-align: center;">${item.rate ? item.rate.toFixed(2) : ''}</td>
        <td style="border-right: 1px solid #9ca3af; text-align: right; font-weight: bold;">${item.amount?.toFixed(2) || ''}</td>
      </tr>
    `
  }).join('')

  const emptyRowsCount = Math.max(0, 18 - items.length)
  const emptyRows = Array.from({ length: emptyRowsCount }).map(() => `
    <tr style="height: 32px;">
      <td style="border-left: 1px solid #9ca3af; border-right: 1px solid #f3f4f6; color: transparent;">-</td>
      <td style="border-right: 1px solid #f3f4f6; color: transparent;">-</td>
      <td style="border-right: 1px solid #f3f4f6; color: transparent;">-</td>
      <td style="border-right: 1px solid #f3f4f6; color: transparent;">-</td>
      <td style="border-right: 1px solid #9ca3af; color: transparent;">-</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&display=swap" rel="stylesheet">
      <style>${BILL_CSS}</style>
    </head>
    <body>
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
              <div style="font-weight: bold; font-size: 14px;">M S TRADING COMPANY</div>
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
              <span class="party-name-underline">${partyName}</span>
            </div>
            <div class="vehicle-gst-row">
              ${bill.vehicle_number ? `<div><span style="color: #4b5563;">Vehicle No.: </span><span>${bill.vehicle_number}</span></div>` : '<div></div>'}
              ${!isKacchi && partyGst ? `<div><span style="color: #4b5563;">GST No.: </span><span>${partyGst}</span></div>` : ''}
            </div>
          </div>

          <div class="items-table-container">
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: auto;">Particulars</th>
                  <th style="width: 80px; text-align: center;">Qty. Bags</th>
                  <th style="width: 100px; text-align: center;">Weight in Kg.</th>
                  <th style="width: 80px; text-align: center;">Rate</th>
                  <th style="width: 120px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody style="border-bottom: 1px solid #9ca3af;">
                ${itemRows}
                ${emptyRows}
              </tbody>
            </table>
          </div>

          <div class="form-footer">
            <div class="footer-grid">
              <div>
                <div style="font-weight: bold; font-size: 10px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Rs. in Words:</div>
                <div style="font-size: 11px; font-weight: bold; line-height: 1.25; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
                  ${totalInWords}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span style="font-weight: bold; color: #4b5563;">SUB TOTAL</span>
                  <span style="font-weight: bold;">₹ ${(bill.total_amount || 0).toFixed(2)}</span>
                </div>
                ${!isKacchi && (bill.is_gst_enabled || (bill.gst_total || 0) > 0) ? `
                  <div style="margin-top: 4px; border-top: 1px solid #f3f4f6; padding-top: 4px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #4b5563;">
                      <span>GST TOTAL</span><span style="font-weight: bold; color: black;">₹ ${(bill.gst_total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ` : ''}
                ${bill.balance > 0 ? `
                  <div style="display: flex; justify-content: space-between; font-size: 14px; margin-top: 4px;">
                    <span style="font-weight: bold; color: #4b5563; text-transform: uppercase;">BALANCE</span>
                    <span style="font-weight: bold; color: #ea580c;">₹ ${bill.balance.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div class="grand-total-section">
                  <span class="grand-total-label">TOTAL</span>
                  <span class="grand-total-value">₹ ${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div class="signature-area">
              <div class="bank-info">
                ${(!isKacchi && bill.bank_name) ? `
                  <div class="bank-title">BANK DETAILS:</div>
                  <div class="bank-grid">
                    <div style="display: flex; gap: 8px;"><span>BANK :</span> <span style="color: #000;">${bill.bank_name}</span></div>
                    <div style="display: flex; gap: 8px;"><span>IFSC CODE :</span> <span style="color: #000;">${bill.bank_ifsc}</span></div>
                    <div style="display: flex; gap: 8px;"><span>ACCOUNT NO. :</span> <span style="color: #000;">${bill.bank_account}</span></div>
                  </div>
                ` : ''}
              </div>
              <div style="text-align: right;">
                <div class="signatory-title">For M S TRADING COMPANY</div>
                <div class="signatory-line">Auth. Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}
