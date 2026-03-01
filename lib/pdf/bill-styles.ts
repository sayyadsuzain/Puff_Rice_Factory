export const BILL_CSS = `
@page { size: A4; margin: 0; }

body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
}

.a4-page {
  width: 210mm;
  height: 297mm;
  padding: 15mm;
  box-sizing: border-box;
  position: relative;
}

.header-main {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.header-center {
  text-align: center;
}

.header-center h1 {
  font-size: 28px;
  font-weight: 800;
  color: #c81e1e;
  letter-spacing: 1.5px;
  margin: 4px 0;
}

.header-center div {
  font-size: 12px;
  margin: 2px 0;
}

.header-right {
  text-align: right;
  font-size: 12px;
}

.jurisdiction {
  text-align: center;
  font-size: 11px;
  margin-bottom: 5px;
}

.red-line {
  border-top: 2px solid #c81e1e;
  margin-top: 10px;
}

.bill-meta {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  margin: 15px 0;
}

.center { text-align: center; }
.right { text-align: right; }

.bill-number {
  font-weight: bold;
  color: #c81e1e;
}

.party {
  margin: 15px 0;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #f9fafb;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}

.items-table th,
.items-table td {
  border: 1px solid #cbd5e1;
  padding: 6px;
}

.items-table th {
  background: #f1f5f9;
  font-weight: 600;
}

.totals {
  width: 280px;
  margin-left: auto;
  margin-top: 20px;
  font-size: 14px;
}

.totals div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.total-final {
  border-top: 2px solid #000;
  font-weight: bold;
  margin-top: 8px;
  padding-top: 4px;
}
`
