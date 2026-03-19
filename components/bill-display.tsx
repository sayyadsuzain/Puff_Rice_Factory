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

// EXACT CSS FROM lib/pdf/bill-styles.ts
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
    margin: 0;
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
  }

  .vehicle-gst-row {
    font-size: 11px;
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
    font-weight: 600;
  }

  .items-table-container {
    height: 100%;
    display: flex;
    flex-direction: column;
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
    border-top: 1px solid #9ca3af;
    border-bottom: 1px solid #9ca3af;
    height: 28px;
  }

  .items-table th {
    border-left: 1px solid #9ca3af;
    border-right: 1px solid #9ca3af;
    padding: 2px 6px;
    text-align: left;
    font-weight: 900;
    text-transform: uppercase;
    font-size: 10px;
  }

  .items-table td {
    border-left: 1px solid #9ca3af;
    border-right: 1px solid #9ca3af;
    padding: 3px 6px;
    vertical-align: top;
  }

  .item-row {
    height: 24px;
  }

  .spacer-row {
    height: 100%;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding-top: 8px;
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

  .grand-total-section {
    border-top: 1.5px solid black;
    padding-top: 4px;
    margin-top: 2px;
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
    font-size: 14px;
  }

  .bank-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0px;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 14px;
    color: #1f2937;
  }

  .signatory-title {
    font-size: 12px;
    font-weight: bold;
    color: #dc2626;
    margin-bottom: 20px;
    text-transform: uppercase;
  }

  .signatory-line {
    font-size: 11px;
    font-weight: 500;
    width: 140px;
    margin-left: auto;
    text-align: center;
    border-top: 1px solid #9ca3af;
    padding-top: 2px;
    color: #4b5563;
  }
`;

export default function BillDisplay({ bill, items, partyName, partyGst }: BillDisplayProps) {
  const isKacchi = bill.bill_type === 'kacchi'
  const grandTotal = (bill.total_amount || 0) + (bill.gst_total || 0) + (bill.balance || 0)
  const totalInWords = numberToWords(grandTotal)
  
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return
      const containerWidth = containerRef.current.getBoundingClientRect().width
      const padding = 32 // Total horizontal padding
      
      if (containerWidth < BILL_W + padding) {
        const availableWidth = containerWidth - padding
        setScale(Math.max(0.25, availableWidth / BILL_W))
      } else {
        setScale(1)
      }
    }

    calculateScale()
    
    const observer = new ResizeObserver(calculateScale)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    window.addEventListener('resize', calculateScale)
    
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', calculateScale)
    }
  }, [])

  const handlePrint = async () => {
    try {
      toast.loading('Opening PDF preview...', { id: 'print' })
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const pdfUrl = `/api/bill-pdf?id=${bill.id}${token ? `&token=${token}` : ''}`
      window.open(pdfUrl, '_blank')
      toast.success('PDF preview opened!', { id: 'print' })
    } catch (error) {
      toast.error('Error generating PDF', { id: 'print' })
    }
  }

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

  return (
    <div className="w-full flex flex-col items-center bg-gray-50/50 py-8">
      <style>{BILL_CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&display=swap" rel="stylesheet" />

      {/* Action Buttons */}
      <div className="mb-6 flex gap-4 no-print">
        <Button onClick={handlePrint} variant="default" className="bg-red-600 hover:bg-red-700">
          <Printer className="h-4 w-4 mr-2" />
          Print / Download PDF
        </Button>
      </div>

      {/* Shared PDF-fidelity Layout Container */}
      <div 
        ref={containerRef}
        className="w-full flex justify-center overflow-hidden"
      >
        <div 
          style={{ 
            width: BILL_W, 
            height: BILL_H, 
            transform: `scale(${scale})`, 
            transformOrigin: 'top center',
            marginBottom: `calc(${BILL_H}px * (${scale} - 1))`
          }}
          className="shadow-2xl overflow-hidden bg-white"
        >
        <div className="a4-page relative">
          <div className="watermark-ms">MS</div>
          
          <div className="content-wrapper">
            <div className="header-top">
              <div className="jurisdiction">{!isKacchi ? 'Subject to Sangli Jurisdiction' : ''}</div>
              <div className="header-grid">
                <div></div>
                <div style={{ textAlign: 'center' }}>
                  <div className="memo-badge">{isKacchi ? 'CASH / CREDIT MEMO' : 'CREDIT MEMO'}</div>
                </div>
                <div className="contact-info">
                  <div style={{ textTransform: 'uppercase' }}>Contact:</div>
                  {isKacchi ? (
                    <>
                      <div style={{ fontWeight: '900', color: '#dc2626' }}>9860022450</div>
                      <div style={{ fontWeight: '900', color: '#dc2626' }}>9561420666</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: '900', color: '#dc2626' }}>9850280800</div>
                      <div style={{ fontWeight: '900', color: '#dc2626' }}>8855050505</div>
                    </>
                  )}
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
              <div style={{ textAlign: 'center' }}>
                <div className="info-label">No.</div>
                <div className="bill-no">{formattedBillNo || '---'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="info-label">Date :</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatDate(bill.bill_date)}</div>
              </div>
            </div>

            <div className="party-details">
              <div className="party-name-row">
                <span style={{ fontWeight: 'bold' }}>M/s. </span>
                <span className="party-name-underline">{partyName || '_'.repeat(40)}</span>
              </div>
              {(bill.vehicle_number || (!isKacchi && partyGst)) ? (
                <div className="vehicle-gst-row">
                  {bill.vehicle_number ? (
                    <div>
                      <span style={{ color: '#4b5563' }}>Vehicle No.: </span>
                      <span>{bill.vehicle_number}</span>
                    </div>
                  ) : <div></div>}
                  {!isKacchi && partyGst ? (
                    <div>
                      <span style={{ color: '#4b5563' }}>GST No.: </span>
                      <span>{partyGst}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="items-table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ width: 'auto' }}>Particulars</th>
                    <th style={{ width: '96px', textAlign: 'center' }}>Qty. Bags</th>
                    <th style={{ width: '112px', textAlign: 'center' }}>Weight in Kg.</th>
                    <th style={{ width: '96px', textAlign: 'center' }}>Rate</th>
                    <th style={{ width: '128px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="item-row">
                      <td>{item.particular}</td>
                      <td style={{ textAlign: 'center' }}>{item.qty_bags || ''}</td>
                      <td style={{ textAlign: 'center' }}>{item.weight_kg || ''}</td>
                      <td style={{ textAlign: 'center' }}>{item.rate ? item.rate.toFixed(2) : ''}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.amount?.toFixed(2) || ''}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 16 - items.length) }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className="item-row">
                      <td style={{ borderLeft: '1px solid #9ca3af', borderRight: '1px solid #9ca3af' }}></td>
                      <td style={{ borderLeft: '1px solid #9ca3af', borderRight: '1px solid #9ca3af' }}></td>
                      <td style={{ borderLeft: '1px solid #9ca3af', borderRight: '1px solid #9ca3af' }}></td>
                      <td style={{ borderLeft: '1px solid #9ca3af', borderRight: '1px solid #9ca3af' }}></td>
                      <td style={{ borderLeft: '1px solid #9ca3af', borderRight: '1px solid #9ca3af' }}></td>
                    </tr>
                  ))}
                  <tr className="spacer-row">
                    <td style={{ borderBottom: '1px solid #9ca3af' }}></td>
                    <td style={{ borderBottom: '1px solid #9ca3af' }}></td>
                    <td style={{ borderBottom: '1px solid #9ca3af' }}></td>
                    <td style={{ borderBottom: '1px solid #9ca3af' }}></td>
                    <td style={{ borderBottom: '1px solid #9ca3af' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="form-footer">
              <div className="footer-grid">
                <div className="words-section">
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Rs. in Words:</div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', lineHeight: 1.25, borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                        {totalInWords || 'Zero Rupees Only.'}
                      </div>
                    </div>
                </div>
      
                <div className="totals-section">
                  <div className="total-row">
                    <span style={{ fontWeight: 'bold', color: '#4b5563' }}>SUB TOTAL</span>
                    <span style={{ fontWeight: 'bold' }}>₹ {(bill.total_amount || 0).toFixed(2)}</span>
                  </div>
      
                  {!isKacchi && bill.is_gst_enabled && (bill.gst_total || 0) > 0 ? (
                    <div style={{ marginTop: '4px', borderTop: '1px solid #f3f4f6', paddingTop: '4px' }}>
                      {(bill.cgst_percent || 0) > 0 && (
                        <div className="total-row">
                          <span style={{ color: '#4b5563' }}>CGST @ {bill.cgst_percent}%</span>
                          <span style={{ fontWeight: 'bold', color: 'black' }}>₹ {(bill.cgst_amount || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {(bill.igst_percent || 0) > 0 && (
                        <div className="total-row">
                          <span style={{ color: '#4b5563' }}>IGST @ {bill.igst_percent}%</span>
                          <span style={{ fontWeight: 'bold', color: 'black' }}>₹ {(bill.igst_amount || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="total-row" style={{ fontWeight: 'bold', paddingTop: '4px', borderTop: '1px solid #f3f4f6', marginTop: '2px' }}>
                        <span style={{ color: '#4b5563' }}>GST Total:</span>
                        <span>₹ {(bill.gst_total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ) : null}
      
                  {bill.balance && bill.balance > 0 ? (
                    <div className="total-row" style={{ marginTop: '4px' }}>
                      <span style={{ fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase' }}>BALANCE</span>
                      <span style={{ fontWeight: 'bold', color: '#ea580c' }}>₹ {bill.balance.toFixed(2)}</span>
                    </div>
                  ) : null}
      
                  <div className="grand-total-section">
                    <div className="grand-total-row">
                      <span className="grand-total-label">TOTAL</span>
                      <span className="grand-total-value">₹ {grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
    
              <div className="signature-area">
                <div className="bank-info">
                  {(!isKacchi && bill.bank_name) ? (
                    <>
                      <div className="bank-title">BANK DETAILS:</div>
                      <div className="bank-grid">
                        <div style={{ display: 'flex', gap: '8px' }}><span>BANK :</span> <span style={{ color: '#000' }}>{bill.bank_name}</span></div>
                        {bill.bank_branch && (
                          <div style={{ display: 'flex', gap: '8px' }}><span>BRANCH :</span> <span style={{ color: '#000' }}>{bill.bank_branch}</span></div>
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}><span>A/C NO :</span> <span style={{ color: '#000' }}>{bill.bank_account}</span></div>
                        <div style={{ display: 'flex', gap: '8px' }}><span>IFSC :</span> <span style={{ color: '#000' }}>{bill.bank_ifsc}</span></div>
                      </div>
                    </>
                  ) : null}
                </div>
                <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                  <div className="signatory-title">For M S TRADING COMPANY</div>
                  <div className="signatory-line">Auth. Signatory</div>
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
