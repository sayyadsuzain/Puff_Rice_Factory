export const BILL_CSS = `
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
    font-family: Arial, sans-serif;
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
    page-break-after: always;
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

  .page-number {
    position: absolute;
    bottom: 5mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10px;
    color: #6b7280;
    z-index: 100;
  }
`;
