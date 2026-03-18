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
    background: white;
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
    width: 100%;
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
    font-size: 44px; /* Slightly adjusted to match 34px-48px range */
    font-weight: bold;
    color: #dc2626;
    letter-spacing: -1px;
    margin: 2px 0;
  }

  .company-address {
    text-align: center;
    font-size: 9px;
    letter-spacing: 1px;
    color: #374151;
    font-weight: bold;
    text-transform: uppercase;
  }

  .company-gst {
    text-align: center;
    font-size: 10px;
    font-weight: bold;
    margin-top: 1px;
    color: #111827;
    text-transform: uppercase;
  }

  .red-divider-main {
    border-bottom: 4px solid #dc2626;
    margin-top: 6px;
  }
  .red-divider-sub {
    border-bottom: 1px solid #dc2626;
    margin-top: 2px;
  }

  .bill-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    font-size: 11px;
    align-items: center;
    padding: 6px 0;
  }

  .info-label {
    font-weight: bold;
    font-size: 10px;
    text-transform: uppercase;
    color: #6b7280;
  }

  .bill-no {
    font-size: 18px;
    font-weight: 900;
    color: #dc2626;
  }

  .party-details {
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 8px 12px;
    margin-bottom: 8px;
  }

  .party-name-row {
    font-size: 16px;
    font-weight: 500;
  }

  .party-name-underline {
    border-bottom: 1px dotted #9ca3af;
    min-width: 300px;
    display: inline-block;
  }

  .vehicle-gst-row {
    font-size: 12px;
    margin-top: 6px;
    display: flex;
    justify-content: space-between;
    font-weight: 600;
  }

  .items-table-container {
    flex: 1;
    min-height: 450px;
  }

  .items-table {
    width: 100%;
    font-size: 13px;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .items-table thead tr {
    background-color: #f9fafb;
    border-top: 1px solid #9ca3af;
    border-bottom: 1px solid #9ca3af;
  }

  .items-table th {
    border-left: 1px solid #9ca3af;
    border-right: 1px solid #9ca3af;
    padding: 6px 8px;
    text-align: left;
    font-weight: 900;
    text-transform: uppercase;
    font-size: 11px;
  }

  .items-table td {
    padding: 6px 8px;
    vertical-align: middle;
  }

  .item-row {
    height: 32px;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 20px;
  }

  .grand-total-section {
    border-top: 3px solid black;
    padding-top: 6px;
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .grand-total-label {
    font-size: 20px;
    font-weight: 900;
    font-style: italic;
  }

  .grand-total-value {
    font-size: 24px;
    font-weight: 900;
  }

  .signature-area {
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding-bottom: 8px;
  }

  .bank-info {
    text-align: left;
    width: 50%;
  }

  .bank-title {
    font-size: 11px;
    font-weight: bold;
    color: #dc2626;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .bank-grid {
    font-size: 10px;
    font-weight: bold;
    color: #1f2937;
    text-transform: uppercase;
  }

  .signatory-title {
    font-size: 11px;
    font-weight: bold;
    color: #dc2626;
    margin-bottom: 30px;
    text-transform: uppercase;
  }

  .signatory-line {
    font-size: 10px;
    font-weight: 500;
    width: 160px;
    margin-left: auto;
    text-align: center;
    border-top: 1px solid #9ca3af;
    padding-top: 4px;
    color: #4b5563;
  }
`;
