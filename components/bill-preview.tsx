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

    // Initial calculation after DOM renders
    const timer = setTimeout(calculate, 50)
    const observer = new ResizeObserver(calculate)
    if (outerRef.current) observer.observe(outerRef.current)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  // The wrapper div is sized to exactly the scaled bill dimensions
  // The bill is absolutely positioned inside and scaled from top-left
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
      {/* Sized to scaled dimensions so no layout overflow */}
      <div style={{ width: scaledW, height: scaledH, position: 'relative', flexShrink: 0 }}>
        {/* Bill at natural size, scaled from top-left corner */}
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
          <Card
            className="p-8 bg-white text-black relative shadow-2xl border-none"
            style={{ fontFamily: 'Arial, sans-serif', width: BILL_W, height: BILL_H, margin: 0, overflow: 'hidden' }}
          >
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&display=swap" rel="stylesheet" />

            {/* Watermark — Centered and subtly improved */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0 opacity-[0.035]"
              style={{ 
                fontSize: '520px', 
                fontWeight: 900, 
                letterSpacing: '30px', 
                fontFamily: '"Times New Roman", Times, serif', 
                color: '#808080',
                textAlign: 'center',
                lineHeight: 1
              }}
            >
              MS
            </div>

            <div className="relative z-10 flex flex-col h-full">
              {/* Header */}
              <div className="mb-2">
                <div className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-tight mb-2 font-serif italic">
                  {!isKacchi && <div>Subject to Sangli Jurisdiction</div>}
                </div>
                <div className="grid grid-cols-3 items-start mb-1">
                  <div className="text-[10px]"></div>
                  <div className="text-center">
                    <div className="inline-block bg-red-600 text-white px-10 py-1.5 rounded-sm text-[12px] font-black tracking-widest shadow-lg uppercase font-serif">
                      {isKacchi ? 'CASH / CREDIT MEMO' : 'CREDIT MEMO'}
                    </div>
                  </div>
                  <div className="text-right text-[10px] space-y-0.5 font-bold text-gray-800 font-serif leading-none">
                    <div className="uppercase tracking-widest text-red-600 mb-1">Contact:</div>
                    <div className="font-mono text-[12px] font-black">9860022450</div>
                    <div className="font-mono text-[12px] font-black">9561420666</div>
                  </div>
                </div>
                <h1 className="text-center text-6xl font-black text-red-600 tracking-tight leading-none mb-1 mt-2 uppercase" style={{ fontFamily: '"Playfair Display", serif', textShadow: '1px 1px 0px rgba(0,0,0,0.05)' }}>{COMPANY_INFO.name}</h1>
                <div className="text-center text-[11px] tracking-widest text-gray-700 font-black uppercase font-serif">{COMPANY_INFO.address}</div>
                {!isKacchi && (
                  <p className="text-center text-[12px] font-black mt-1 text-gray-800 tracking-widest uppercase font-serif">GST IN : {COMPANY_INFO.gst}</p>
                )}
                <div className="border-b-[4px] border-red-600 mt-3"></div>
                <div className="border-b-[1px] border-red-600 mt-[3px]"></div>
              </div>

              {/* Bill/Party Info Block — Unified 3-column layout like Pic 2 */}
              <div className="border border-gray-400 rounded-sm mb-3 overflow-hidden">
                <div className="grid grid-cols-[1fr_140px_180px] border-b border-gray-400 bg-gray-50/20">
                  <div className="p-2 border-r border-gray-400 h-12 flex flex-col justify-center">
                    <span className="text-[9px] font-black text-gray-500 uppercase font-serif select-none">FROM :</span>
                    <span className="text-[15px] font-black uppercase font-serif text-gray-800 leading-none">{COMPANY_INFO.name}</span>
                  </div>
                  <div className="p-2 border-r border-gray-400 h-12 flex flex-col justify-center text-center">
                    <span className="text-[9px] font-black text-gray-500 uppercase font-serif select-none mb-1">NO.</span>
                    <span className="text-[22px] font-black text-red-600 tracking-tighter font-serif italic leading-none">{billNumber || '---'}</span>
                  </div>
                  <div className="p-2 h-12 flex flex-col justify-center text-center">
                    <span className="text-[9px] font-black text-gray-500 uppercase font-serif select-none mb-1">DATE :</span>
                    <span className="text-[17px] font-black font-serif italic leading-none">{billDate ? formatDate(billDate) : '18/3/2026'}</span>
                  </div>
                </div>
                
                <div className="p-3 bg-white flex flex-col gap-2">
                  <div className="flex items-baseline">
                    <span className="text-[16px] font-black mr-2 font-serif text-gray-700">M/s.</span>
                    <span className="text-[18px] font-black flex-1 border-b border-dotted border-gray-500 pb-0.5 font-serif text-gray-900 italic">
                      {partyName || 'Suzain Sayyad'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[13px] font-bold font-serif uppercase text-gray-700 mt-1">
                    <div className="flex items-baseline">
                      <span className="text-[11px] text-gray-500 mr-2 font-black">Vehicle No.:</span>
                      <span className="font-black text-gray-900">{vehicleNumber || 'MH10BR9001'}</span>
                    </div>
                    {!isKacchi && gstEnabled && partyGst && (
                      <div className="flex items-baseline">
                        <span className="text-[11px] text-gray-500 mr-2 font-black">GSTIN:</span>
                        <span className="font-mono text-gray-900 font-black">{partyGst}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Table — Sized and stylized like Pic 2 */}
              <div className="flex-1 flex flex-col">
                <table className="w-full text-[14px] border-collapse table-fixed">
                  <thead>
                    <tr className="bg-gray-50 border-t border-b border-gray-500">
                      <th className="border-l border-r border-gray-400 p-2 text-left font-black uppercase text-[11px] tracking-tight w-[42%] font-serif">PARTICULARS</th>
                      <th className="border-l border-r border-gray-400 p-2 text-center font-black uppercase text-[11px] tracking-tight w-[14%] font-serif">QTY. BAGS</th>
                      <th className="border-l border-r border-gray-400 p-2 text-center font-black uppercase text-[11px] tracking-tight w-[16%] font-serif">WEIGHT IN KG.</th>
                      <th className="border-l border-r border-gray-400 p-2 text-center font-black uppercase text-[11px] tracking-tight w-[13%] font-serif">RATE</th>
                      <th className="border-l border-r border-gray-400 p-2 text-right font-black uppercase text-[11px] tracking-tight w-[15%] font-serif">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="border-b border-gray-500">
                    {items.map((item, idx) => {
                        return (
                          <tr key={idx} className="h-8 border-none font-serif">
                            <td className="border-l border-r border-gray-300 px-3 py-1 font-black text-gray-800 uppercase overflow-hidden text-ellipsis whitespace-nowrap text-[14px]">
                              {item.particular || ''}
                            </td>
                            <td className="border-l border-r border-gray-300 px-1 py-1 text-center font-black text-[14px]">{item.qty_bags || ''}</td>
                            <td className="border-l border-r border-gray-300 px-1 py-1 text-center font-black text-[14px]">{item.weight_kg || ''}</td>
                            <td className="border-l border-r border-gray-300 px-1 py-1 text-center font-black text-[14px]">{item.rate?.toFixed(2) || ''}</td>
                            <td className="border-l border-r border-gray-400 px-3 py-1 text-right font-black text-[14px]">{item.amount?.toFixed(2) || ''}</td>
                          </tr>
                        )
                    })}
                    {Array.from({ length: Math.max(0, 18 - items.length) }).map((_, idx) => (
                      <tr key={`empty-${idx}`} className="h-8 border-none">
                        <td className="border-l border-r border-gray-100 p-1 select-none"></td>
                        <td className="border-l border-r border-gray-100 p-1 select-none border-dashed border-l border-gray-100"></td>
                        <td className="border-l border-r border-gray-100 p-1 select-none border-dashed border-l border-gray-100"></td>
                        <td className="border-l border-r border-gray-100 p-1 select-none border-dashed border-l border-gray-100"></td>
                        <td className="border-l border-r border-gray-400 p-1 select-none"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary Section — Exactly matching Pic 2 stacking */}
                <div className="grid grid-cols-[1fr_260px] border-l border-r border-b border-gray-400">
                  <div className="p-3 flex flex-col justify-end">
                    <div className="font-bold text-[11px] uppercase text-gray-600 mb-1 select-none font-serif">RS. IN WORDS:</div>
                    <div className="text-[15px] font-black leading-tight italic uppercase text-gray-900 border-b border-gray-200 pb-1 font-serif">
                      {grandTotal > 0 ? `${totalAmountWords} Only.` : 'Zero Rupees Only.'}
                    </div>
                  </div>
                  
                  <div className="border-l border-gray-400 flex flex-col text-gray-900">
                    <div className="flex justify-between items-center px-4 py-2 border-b border-gray-300 text-[13px] font-black font-serif">
                      <span className="text-gray-500 uppercase">SUB TOTAL</span>
                      <span className="text-[15px]">{itemsTotal.toFixed(2)}</span>
                    </div>
                    
                    {balance != null && (
                      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-400 text-[13px] font-black font-serif">
                        <span className="text-orange-600 uppercase italic">BALANCE</span>
                        <span className="text-[15px] text-orange-600">{(balance || 0).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline px-4 py-4 relative bg-gray-50/10">
                      <span className="text-[22px] font-black italic tracking-tighter font-serif">TOTAL</span>
                      <div className="text-right">
                        <span className="text-[28px] font-black text-gray-900 relative font-serif">
                          {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="h-[4px] bg-red-600 mt-0.5 rounded-full w-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer — Right aligned like Pic 2 */}
              <div className="mt-4 flex flex-col items-end pr-4">
                  <div className="text-[15px] font-black text-red-600 mb-16 uppercase tracking-widest italic font-serif">
                    FOR {COMPANY_INFO.name}
                  </div>
                  <div className="w-72 border-t border-gray-400 pt-2 flex flex-col items-center">
                    <span className="font-black text-[12px] uppercase text-gray-700 font-serif leading-none tracking-widest">Auth. Signatory</span>
                  </div>
              </div>

              {/* Bank Details — Stylized Box on bottom left */}
              {showBankDetails && bankName && bankAccount && (
                <div className="absolute bottom-8 left-8 text-[10px] border border-gray-200 p-3 rounded-xl bg-gray-50/50 z-20 shadow-sm font-serif min-w-[220px]">
                  <div className="font-black text-red-600 mb-2 uppercase tracking-widest text-[9px]">Bank Account Details:</div>
                  <div className="space-y-1.5 font-black uppercase text-gray-700 text-[10px]">
                    <div className="flex justify-between gap-4 border-b border-gray-100 pb-0.5"><span className="text-gray-400 w-16">BANK:</span><span className="text-right truncate">{bankName}</span></div>
                    {bankIFSC && <div className="flex justify-between gap-4 border-b border-gray-100 pb-0.5"><span className="text-gray-400 w-16">IFSC:</span><span className="text-right">{bankIFSC}</span></div>}
                    <div className="flex justify-between gap-4"><span className="text-gray-400 w-16">A/C NO:</span><span className="text-right">{bankAccount}</span></div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
