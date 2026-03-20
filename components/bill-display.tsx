'use client'

import { Bill, BillItem, COMPANY_INFO, formatDate, supabase, numberToWords } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect, useState, useRef } from 'react'

interface BillDisplayProps {
  bill: Bill
  items: BillItem[]
  partyName?: string
  partyGst?: string
}

const BILL_W = 794
const BILL_H = 1122

// Responsive scaling logic for mobile/tablet
const useScale = () => {
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        // Narrower gap for mobile looks better
        const padding = window.innerWidth < 640 ? 16 : 40
        const availableW = containerWidth - padding
        
        if (availableW < BILL_W) {
          setScale(availableW / BILL_W)
        } else {
          setScale(1)
        }
      }
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return { scale, containerRef }
}

// EXACT CSS FROM lib/pdf/bill-styles.ts with minor tweaks for viewing
const BILL_CSS = `
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
    text-align: left;
    color: black;
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
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
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
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .contact-info {
    text-align: right;
    font-size: 13px;
    font-weight: bold;
    color: #1f2937;
  }

  .company-name {
    text-align: center;
    font-size: 34px;
    font-weight: bold;
    color: #dc2626;
    letter-spacing: -0.02em;
    margin: -10px 0 0 0;
    font-family: "Playfair Display", serif;
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
    border-bottom: 1px solid #dc2626;
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
    font-style: italic;
    text-align: center;
  }

  .party-details {
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 6px 10px;
    margin-bottom: 8px;
  }

  .party-name-row {
    font-size: 14px;
    font-weight: 500;
  }

  .party-name-underline {
    border-bottom: 1px dotted #9ca3af;
    min-width: 250px;
    display: inline-block;
    font-weight: bold;
    margin-left: 4px;
  }

  .vehicle-gst-row {
    font-size: 11px;
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
    font-weight: 600;
  }

  .items-table-container {
    flex-grow: 1;
    margin-bottom: 8px;
  }

  .items-table {
    width: 100%;
    font-size: 11px;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .items-table thead tr {
    background-color: #f9fafb;
    border-top: 1.5px solid #374151;
    border-bottom: 1.5px solid #374151;
    height: 28px;
  }

  .items-table th {
    border-left: 1px solid #9ca3af;
    border-right: 1px solid #9ca3af;
    padding: 2px 6px;
    text-align: center;
    font-weight: 900;
    text-transform: uppercase;
    font-size: 10px;
    color: #374151;
  }

  .items-table td {
    border-left: 1px solid #9ca3af;
    border-right: 1px solid #9ca3af;
    padding: 4px 6px;
    vertical-align: middle;
  }

  .item-row {
    height: 26px;
    border-bottom: 0.5px solid #f3f4f6;
  }
  
  .item-row.filler {
    height: 26px;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 16px;
    padding: 8px 0;
    border-top: 1px solid #d1d5db;
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
    padding: 1px 0;
  }

  .gst-summary {
    background-color: #f9fafb;
    padding: 4px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
    border: 1px solid #f3f4f6;
  }

  .grand-total-section {
    border-top: 2px solid #dc2626;
    padding-top: 4px;
    margin-top: 4px;
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
    color: #dc2626;
  }

  .grand-total-value {
    font-size: 18px;
    font-weight: 900;
    color: #dc2626;
  }

  .signature-area {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding-bottom: 4px;
  }

  .bank-info {
    font-size: 9px;
    text-align: left;
    width: 60%;
  }

  .bank-title {
    font-weight: 900;
    color: #dc2626;
    margin-bottom: 4px;
    text-transform: uppercase;
    font-size: 13px;
    border-bottom: 1px solid #fee2e2;
    display: inline-block;
  }

  .bank-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1px;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 11px;
    color: #374151;
  }

  .auth-sign {
    text-align: center;
  }

  .signatory-title {
    font-size: 11px;
    font-weight: 900;
    color: #dc2626;
    margin-bottom: 35px;
    text-transform: uppercase;
  }

  .signatory-line {
    font-size: 10px;
    font-weight: bold;
    width: 150px;
    border-top: 1.5px solid #374151;
    padding-top: 4px;
    color: #374151;
    text-transform: uppercase;
  }
`

export default function BillDisplay({ bill, items, partyName, partyGst }: BillDisplayProps) {
  const { scale, containerRef } = useScale()
  const isKacchi = bill.bill_type === 'kacchi'
  const grandTotal = bill.net_total || bill.grand_total || (bill.total_amount + (bill.gst_total || 0) + (bill.balance || 0))
  
  // Total in words
  const totalInWords = bill.total_amount_words || (grandTotal > 0 ? `${numberToWords(Math.round(grandTotal))} Only.` : '')

  // Format Bill No
  const billNum = String(bill.bill_number || '')
  let formattedBillNo = billNum
  if (billNum) {
    if (billNum.startsWith('P') || billNum.startsWith('K')) {
      const parts = billNum.split('/')
      if (parts.length > 1) {
        const numPart = parts[parts.length - 1]
        formattedBillNo = billNum.substring(0, billNum.length - numPart.length) + numPart.padStart(3, '0')
      } else {
        const numPart = billNum.substring(1)
        formattedBillNo = billNum.charAt(0) + numPart.padStart(3, '0')
      }
    } else {
      const prefix = isKacchi ? 'K' : 'P'
      formattedBillNo = `${prefix}${billNum.padStart(3, '0')}`
    }
  }

  const handlePrint = async () => {
    try {
      toast.loading('Opening PDF preview...', { id: 'print' })
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const printUrl = `/print?id=${bill.id}${token ? `&token=${token}` : ''}`
      window.open(printUrl, '_blank')
      toast.success('PDF preview opened!', { id: 'print' })
    } catch (error) {
      toast.error('Error opening PDF', { id: 'print' })
    }
  }

  return (
    <div className="w-full flex flex-col items-center bg-gray-50/50 py-4 md:py-8 overflow-hidden" ref={containerRef}>
      <style>{BILL_CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&display=swap" rel="stylesheet" />

      {/* Removed redundant PDF button as the main Print button is now polished and prominent */}

      <div className="mb-6 flex gap-4 no-print hidden sm:flex">
        <Button onClick={handlePrint} variant="default" className="bg-red-600 hover:bg-red-700">
          <Printer className="h-4 w-4 mr-2" />
          Print / Download PDF
        </Button>
      </div>

      {/* Responsive Scaling Container */}
      <div 
        style={{ 
          width: `${BILL_W}px`,
          height: `${BILL_H * scale}px`,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          transition: 'height 0.2s ease-out'
        }}
        className="shadow-xl md:shadow-2xl rounded-sm"
      >
        <div 
          style={{ 
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            width: `${BILL_W}px`,
            position: 'absolute',
            top: 0
          }}
        >
          <div className="a4-page relative">
            <div className="watermark-ms">MS</div>
            
            <div className="content-wrapper">
              <div className="header-top">
                <div className="jurisdiction">{!isKacchi ? 'Subject to Sangli Jurisdiction' : ''}</div>
                <div className="header-grid">
                  <div></div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="memo-badge">{isKacchi ? 'CASH / CREDIT MEMO' : 'TAX INVOICE'}</div>
                  </div>
                  <div className="contact-info">
                    <div style={{ textTransform: 'uppercase', fontSize: '10px', color: '#6b7280' }}>Contact:</div>
                    <div style={{ fontWeight: '900', color: '#dc2626' }}>9860022450</div>
                    <div style={{ fontWeight: '900', color: '#dc2626' }}>9561420666</div>
                  </div>
                </div>
                
                <h1 className="company-name">M S TRADING COMPANY</h1>
                <div className="company-address">KUPWAD MIDC NEAR NAV KRISHNA VALLEY, PLOT NO L-52</div>
                {!isKacchi && <div className="company-gst">GST IN : {COMPANY_INFO.gst}</div>}
                
                <div className="red-divider-main"></div>
                <div className="red-divider-sub"></div>
              </div>

              <div className="bill-info-grid">
                <div>
                  <div className="info-label">From :</div>
                  <div style={{ fontWeight: 'bold' }}>M S TRADING COMPANY</div>
                </div>
                <div>
                  <div className="info-label" style={{ textAlign: 'center' }}>Bill No.</div>
                  <div className="bill-no">{formattedBillNo || '---'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="info-label">Date :</div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{formatDate(bill.bill_date)}</div>
                </div>
              </div>

              <div className="party-details">
                <div className="party-name-row">
                  <span style={{ fontWeight: 'bold', color: '#6b7280', fontSize: '12px' }}>TO, M/S. </span>
                  <span className="party-name-underline">{partyName || '_'.repeat(40)}</span>
                </div>
                {(bill.vehicle_number || (!isKacchi && partyGst)) ? (
                  <div className="vehicle-gst-row">
                    {bill.vehicle_number ? (
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '10px' }}>VEHICLE NO.: </span>
                        <span style={{ fontWeight: 'bold' }}>{bill.vehicle_number}</span>
                      </div>
                    ) : <div></div>}
                    {!isKacchi && partyGst ? (
                      <div>
                        <span style={{ color: '#6b7280', fontSize: '10px' }}>GST NO.: </span>
                        <span style={{ fontWeight: 'bold' }}>{partyGst}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="items-table-container">
                <table className="items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>SR.</th>
                      <th style={{ textAlign: 'left' }}>PARTICULARS</th>
                      <th style={{ width: '80px' }}>BAGS</th>
                      <th style={{ width: '100px' }}>WT (KG)</th>
                      <th style={{ width: '100px' }}>RATE</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id || idx} className="item-row">
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{item.particular}</td>
                        <td style={{ textAlign: 'center' }}>{item.qty_bags || ''}</td>
                        <td style={{ textAlign: 'center' }}>{item.weight_kg ? Number(item.weight_kg).toFixed(1) : ''}</td>
                        <td style={{ textAlign: 'center' }}>{item.rate ? Number(item.rate).toFixed(2) : ''}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.amount ? item.amount.toFixed(2) : ''}</td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 14 - items.length) }).map((_, idx) => (
                      <tr key={`empty-${idx}`} className="item-row filler">
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="form-footer">
                <div className="footer-grid">
                  <div className="words-section">
                    <div style={{ fontWeight: 'bold', fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '2px' }}>Rs. in Words:</div>
                    <div style={{ fontSize: '11px', fontWeight: '900', fontStyle: 'italic' }}>
                      {totalInWords}
                    </div>
                  </div>
        
                  <div className="totals-section">
                    {!isKacchi && (bill.is_gst_enabled || bill.gst_total > 0) ? (
                      <div className="gst-summary">
                        <div className="total-row">
                          <span style={{ color: '#6b7280', fontSize: '10px' }}>TAXABLE AMT:</span>
                          <span style={{ fontWeight: 'bold' }}>₹ {(bill.taxable_amount || (grandTotal - (bill.gst_total || 0))).toFixed(2)}</span>
                        </div>
                        {(bill.cgst_percent || 0) > 0 && (
                          <div className="total-row">
                            <span style={{ color: '#6b7280', fontSize: '10px' }}>CGST ({bill.cgst_percent}%):</span>
                            <span style={{ fontWeight: 'bold' }}>₹ {(bill.cgst_amount || 0).toFixed(2)}</span>
                          </div>
                        )}
                        {(bill.igst_percent || 0) > 0 && (
                          <div className="total-row">
                            <span style={{ color: '#6b7280', fontSize: '10px' }}>IGST ({bill.igst_percent}%):</span>
                            <span style={{ fontWeight: 'bold' }}>₹ {(bill.igst_amount || 0).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="total-row" style={{ borderTop: '1px solid #e5e7eb', marginTop: '2px', paddingTop: '2px' }}>
                          <span style={{ color: '#6b7280', fontWeight: '900', fontSize: '10px' }}>GST TOTAL:</span>
                          <span style={{ fontWeight: '900' }}>₹ {(bill.gst_total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    ) : null}
        
                    {bill.balance && bill.balance > 0 ? (
                      <div className="total-row" style={{ marginTop: '2px', padding: '2px 8px', backgroundColor: '#fff7ed', borderRadius: '4px', border: '1px solid #ffedd5' }}>
                        <span style={{ fontWeight: '900', color: '#ea580c', fontSize: '10px' }}>BALANCE:</span>
                        <span style={{ fontWeight: '900', color: '#ea580c' }}>₹ {bill.balance.toFixed(2)}</span>
                      </div>
                    ) : null}
        
                    <div className="grand-total-section">
                      <div className="grand-total-row">
                        <span className="grand-total-label">TOTAL AMOUNT</span>
                        <span className="grand-total-value">₹ {grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
      
                <div className="signature-area">
                  <div className="bank-info">
                    {!isKacchi && bill.bank_name ? (
                      <>
                        <div className="bank-title">Bank Account Details</div>
                        <div className="bank-grid">
                          <div><span style={{ color: '#6b7280', width: '60px', display: 'inline-block' }}>BANK:</span> <span style={{ color: '#111827' }}>{bill.bank_name}</span></div>
                          <div><span style={{ color: '#6b7280', width: '60px', display: 'inline-block' }}>BRANCH:</span> <span style={{ color: '#111827' }}>{bill.bank_branch || ''}</span></div>
                          <div><span style={{ color: '#6b7280', width: '60px', display: 'inline-block' }}>A/C NO:</span> <span style={{ color: '#111827' }}>{bill.bank_account}</span></div>
                          <div><span style={{ color: '#6b7280', width: '60px', display: 'inline-block' }}>IFSC:</span> <span style={{ color: '#111827' }}>{bill.bank_ifsc}</span></div>
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div className="auth-sign">
                    <div className="signatory-title">For M S TRADING COMPANY</div>
                    <div className="signatory-line">Authorized Signatory</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
