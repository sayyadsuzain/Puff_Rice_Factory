'use client'

import { useRef, useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { BillItem, COMPANY_INFO, formatDate, numberToWords } from '@/lib/supabase'

interface BillPreviewProps {
  billType: 'kacchi' | 'pakki'
  billNumber: string
  billDate: string
  partyName: string
  partyGst?: string
  vehicleNumber?: string
  balance?: number
  bankName?: string
  bankIFSC?: string
  bankAccount?: string
  bankBranch?: string
  showBankDetails?: boolean
  items: Partial<BillItem>[]
  itemsTotal: number
  gstEnabled?: boolean
  cgstPercent?: number
  igstPercent?: number
  gstTotal?: number
  grandTotal: number
  totalAmountWords: string
}

// Natural bill dimensions (210mm x 297mm at 96dpi ≈ 794x1122px)
const BILL_W = 794
const BILL_H = 1122

// EXACT CSS FROM lib/pdf/bill-styles.ts (Adapted for React style tags)
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
    font-size: 14px;
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
    border-top: 1px solid #9ca3af;
    padding-top: 2px;
    color: #4b5563;
  }
`;

export default function BillPreview({
  billType,
  billNumber,
  billDate,
  partyName,
  partyGst,
  vehicleNumber,
  balance,
  bankName,
  bankIFSC,
  bankAccount,
  bankBranch,
  showBankDetails = true,
  items,
  itemsTotal,
  gstEnabled = false,
  cgstPercent = 0,
  igstPercent = 0,
  gstTotal = 0,
  grandTotal,
  totalAmountWords
}: BillPreviewProps) {
  const isKacchi = billType === 'kacchi'
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  useEffect(() => {
    const calculate = () => {
      const el = outerRef.current
      if (!el) return
      const { width, height } = el.getBoundingClientRect()
      const pad = 16
      const scaleW = (width - pad * 2) / BILL_W
      const scaleH = (height - pad * 2) / BILL_H
      const s = Math.max(0.25, scaleW)
      setScale(s)
    }

    const timer = setTimeout(calculate, 50)
    const observer = new ResizeObserver(calculate)
    if (outerRef.current) observer.observe(outerRef.current)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  const scaledW = Math.round(BILL_W * scale)
  const scaledH = Math.round(BILL_H * scale)

  return (
    <div
      ref={outerRef}
      style={{
        width: '100%',
        height: '100%',
        overflowX: 'hidden', overflowY: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: '#f3f4f6',
        borderRadius: '0.75rem',
        border: '1px dashed #d1d5db',
        padding: '8px',
      }}
    >
      <style>{BILL_CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&display=swap" rel="stylesheet" />
      
      <div style={{ width: scaledW, height: scaledH, position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: BILL_W,
            height: BILL_H,
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
          }}
        >
          <div className="a4-page shadow-2xl relative">
            <div className="watermark-ms">MS</div>
            
            <div className="content-wrapper">
              <div className="header-top">
                <div className="jurisdiction">{!isKacchi ? 'Subject to Sangli Jurisdiction' : ''}</div>
                <div className="header-grid">
                  <div></div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="memo-badge">{isKacchi ? 'CASH / CREDIT MEMO' : 'CREDIT MEMO'}</div>
                  </div>
                    <div className="contact-info text-right" style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937' }}>
                      <div className="uppercase">Contact:</div>
                      <div style={{ fontWeight: 900, color: '#dc2626' }}>9860022450</div>
                      <div style={{ fontWeight: 900, color: '#dc2626' }}>9561420666</div>
                    </div>
                </div>
                
                <h1 className="company-name" style={{ margin: '-10px 0 0 0' }}>M S TRADING COMPANY</h1>
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
                  <div className="bill-no">{billNumber || '---'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="info-label">Date :</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{billDate ? formatDate(billDate) : '19/3/2026'}</div>
                </div>
              </div>

              <div className="party-details">
                <div className="party-name-row">
                  <span style={{ fontWeight: 'bold' }}>M/s. </span>
                  <span className="party-name-underline">{partyName || '_'.repeat(40)}</span>
                </div>
                {(vehicleNumber || (!isKacchi && gstEnabled && partyGst)) ? (
                  <div className="vehicle-gst-row">
                    {vehicleNumber ? (
                      <div>
                        <span style={{ color: '#4b5563' }}>Vehicle No.: </span>
                        <span>{vehicleNumber}</span>
                      </div>
                    ) : <div></div>}
                    {!isKacchi && gstEnabled && partyGst ? (
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
                        {totalAmountWords || 'Zero Rupees Only.'}
                      </div>
                    </div>
                  </div>
        
                  <div className="totals-section">
                    <div className="total-row">
                      <span style={{ fontWeight: 'bold', color: '#4b5563' }}>SUB TOTAL</span>
                      <span style={{ fontWeight: 'bold' }}>₹ {itemsTotal.toFixed(2)}</span>
                    </div>
        
                    {gstEnabled && gstTotal > 0 ? (
                      <div style={{ marginTop: '4px', borderTop: '1px solid #f3f4f6', paddingTop: '4px' }}>
                        {cgstPercent > 0 && (
                          <div className="total-row">
                            <span style={{ color: '#4b5563' }}>CGST @ {cgstPercent}%</span>
                            <span style={{ fontWeight: 'bold', color: 'black' }}>₹ {(itemsTotal * cgstPercent / 100).toFixed(2)}</span>
                          </div>
                        )}
                        {igstPercent > 0 && (
                          <div className="total-row">
                            <span style={{ color: '#4b5563' }}>IGST @ {igstPercent}%</span>
                            <span style={{ fontWeight: 'bold', color: 'black' }}>₹ {(itemsTotal * igstPercent / 100).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="total-row" style={{ fontWeight: 'bold', paddingTop: '4px', borderTop: '1px solid #f3f4f6', marginTop: '2px' }}>
                          <span style={{ color: '#4b5563' }}>GST Total:</span>
                          <span>₹ {gstTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : null}
        
                    {balance && balance > 0 ? (
                      <div className="total-row" style={{ marginTop: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase' }}>BALANCE</span>
                        <span style={{ fontWeight: 'bold', color: '#ea580c' }}>₹ {balance.toFixed(2)}</span>
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
                  {!isKacchi && bankName && showBankDetails && (
                    <div className="bank-info">
                      <div className="bank-title">BANK DETAILS:</div>
                      <div className="bank-grid">
                        <div style={{ display: 'flex', gap: '8px' }}><span>BANK :</span> <span style={{ color: '#000' }}>{bankName}</span></div>
                        <div style={{ display: 'flex', gap: '8px' }}><span>BRANCH :</span> <span style={{ color: '#000' }}>{bankBranch || 'SANGLI BRANCH'}</span></div>
                        <div style={{ display: 'flex', gap: '8px' }}><span>A/C NO :</span> <span style={{ color: '#000' }}>{bankAccount}</span></div>
                        <div style={{ display: 'flex', gap: '8px' }}><span>IFSC :</span> <span style={{ color: '#000' }}>{bankIFSC}</span></div>
                      </div>
                    </div>
                  )}
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
