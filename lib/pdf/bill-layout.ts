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

  const companyName = 'M S TRADING COMPANY'
  const companyAddress = 'KUPWAD MIDC NEAR NAV KRISHNA VALLEY, PLOT NO L-52'
  const companyGst = '27CQIPS6685K1ZU'

  const billDate = new Date(bill.bill_date).toLocaleDateString('en-IN')

  const grandTotal =
    (bill.total_amount || 0) +
    (bill.gst_total || 0) +
    (bill.balance || 0)

  const formattedBillNumber = bill.bill_number

  const itemRows = items.map(item => `
    <tr>
      <td>${item.particular || ''}</td>
      <td class="center">${item.qty_bags || ''}</td>
      <td class="center">${item.weight_kg || ''}</td>
      <td class="center">${item.rate?.toFixed(2) || ''}</td>
      <td class="right">${item.amount?.toFixed(2) || ''}</td>
    </tr>
  `).join('')

  return `
  <div class="a4-page">

    <div class="header">

      ${!isKacchi ? `
        <div class="jurisdiction">
          Subject to Sangli Jurisdiction
        </div>
      ` : ''}

      <div class="header-main">
        <div></div>

        <div class="header-center">
          <h1>${companyName}</h1>
          <div>${companyAddress}</div>
          ${!isKacchi ? `<div>GST IN : ${companyGst}</div>`  : ''}
        </div>

        <div class="header-right">
          <div>Contact:</div>
          <div>9860022450</div>
          <div>9561420666</div>
        </div>
      </div>

      <div class="red-line"></div>

    </div>

    <div class="bill-meta">
      <div>
        <div class="label">From :</div>
        <div>${companyName}</div>
      </div>

      <div class="center">
        <div class="label">No.</div>
        <div class="bill-number">${formattedBillNumber}</div>
      </div>

      <div class="right">
        <div class="label">Date :</div>
        <div>${billDate}</div>
      </div>
    </div>

    <div class="party">
      <strong>M/s.</strong> ${partyName}
      ${partyGst ? `<div>GST No.: ${partyGst}</div>`  : ''}
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Particulars</th>
          <th>Qty</th>
          <th>Weight</th>
          <th>Rate</th>
          <th>Amount ₹</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals">
      <div>SUB TOTAL <span>₹ ${(bill.total_amount || 0).toFixed(2)}</span></div>
      ${!isKacchi ? `
        <div>GST <span>₹ ${(bill.gst_total || 0).toFixed(2)}</span></div>
      ` : ''}
      <div class="total-final">
        TOTAL <span>₹ ${grandTotal.toFixed(2)}</span>
      </div>
    </div>

  </div>
  `
}
