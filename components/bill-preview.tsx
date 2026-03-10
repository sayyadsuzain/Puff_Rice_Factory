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

  return (
    <div className="bill-preview-wrapper w-full overflow-hidden flex justify-center py-4 bg-gray-100/50 rounded-xl border border-dashed border-gray-300">
      <div className="bill-preview-container origin-top transition-transform duration-300 ease-in-out">
        <Card className="p-8 bg-white text-black relative shadow-2xl border-none" style={{ fontFamily: 'Arial, sans-serif', width: '210mm', minHeight: '297mm', margin: '0' }}>
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&display=swap" rel="stylesheet" />

          {/* Watermark */}
          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0 opacity-[0.06]"
            style={{ fontSize: '320px', fontWeight: 900, letterSpacing: '25px', fontFamily: '"Playfair Display", serif', color: '#c0c0c0' }}>
            MS
          </div>

          <div className="relative z-10 space-y-4 flex flex-col h-full">
            {/* Header */}
            <div className="mb-2">
              <div className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-tight mb-1">
                {!isKacchi && <div>Subject to Sangli Jurisdiction</div>}
              </div>
              <div className="grid grid-cols-3 items-start mb-2">
                <div className="text-[10px]"></div>
                <div className="text-center">
                  <div className="inline-block bg-red-600 text-white px-8 py-1 rounded-sm text-[11px] font-black tracking-widest shadow-sm uppercase">
                    {isKacchi ? 'CASH / CREDIT MEMO' : 'CREDIT MEMO'}
                  </div>
                </div>
                <div className="text-right text-[10px] space-y-0.5 font-bold text-gray-800">
                  <div className="uppercase">Contact:</div>
                  <div>9860022450</div>
                  <div>9561420666</div>
                </div>
              </div>

              <h1 className="text-center text-5xl font-bold text-red-600 tracking-tight mb-1 mt-1" style={{ textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.05)' }}>{COMPANY_INFO.name}</h1>
              <div className="text-center text-[10px] tracking-widest text-gray-700 font-bold uppercase">{COMPANY_INFO.address}</div>
              {!isKacchi && (
                <p className="text-center text-[11px] font-bold mt-1 text-gray-800 tracking-widest uppercase">GST IN : {COMPANY_INFO.gst}</p>
              )}

              {/* Double Red Header Lines */}
              <div className="border-b-[4px] border-red-600 mt-2"></div>
              <div className="border-b-[1px] border-red-600 mt-[2px]"></div>
            </div>

            {/* Bill Info */}
            <div className="grid grid-cols-3 gap-4 text-sm items-center py-2">
              <div>
                <div className="font-bold text-xs uppercase text-gray-500">From :</div>
                <div className="font-bold">{COMPANY_INFO.name}</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-xs uppercase text-gray-500">No.</div>
                <div className="text-xl font-black text-red-600">{billNumber || '---'}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-xs uppercase text-gray-500">Date :</div>
                <div className="font-bold text-base">{billDate ? formatDate(billDate) : '--/--/----'}</div>
              </div>
            </div>

            {/* Party Details */}
            <div className="border border-gray-300 rounded-md py-3 px-4">
              <div className="text-base font-medium">
                <span className="font-bold">M/s. </span>
                <span className="border-b border-dotted border-gray-400 min-w-[300px] inline-block">{partyName || ''}</span>
              </div>
              {(vehicleNumber || (!isKacchi && gstEnabled && partyGst)) && (
                <div className="text-sm mt-2 flex justify-between font-semibold">
                  {vehicleNumber && (
                    <div>
                      <span className="font-bold text-gray-600">Vehicle No.: </span>
                      <span>{vehicleNumber}</span>
                    </div>
                  )}
                  {!isKacchi && gstEnabled && partyGst && (
                    <div className={vehicleNumber ? "text-right" : ""}>
                      <span className="font-bold text-gray-600">GST No.: </span>
                      <span>{partyGst}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="flex-1 min-h-[450px]">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-t border-b border-gray-400">
                    <th className="border-l border-r border-gray-400 p-2 text-left font-black uppercase text-xs tracking-tight">Particulars</th>
                    <th className="border-l border-r border-gray-400 p-2 text-center font-black uppercase text-xs tracking-tight w-24">Qty. Bags</th>
                    <th className="border-l border-r border-gray-400 p-2 text-center font-black uppercase text-xs tracking-tight w-28">Weight in Kg.</th>
                    <th className="border-l border-r border-gray-400 p-2 text-center font-black uppercase text-xs tracking-tight w-24">Rate</th>
                    <th className="border-l border-r border-gray-400 p-2 text-right font-black uppercase text-xs tracking-tight w-32">Amount</th>
                  </tr>
                </thead>
                <tbody className="border-b border-gray-400">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-gray-300 p-8 text-center text-gray-400 italic">
                        Add items to preview
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const isPaddyItem = item.particular?.toLowerCase().includes('paddy')
                      return (
                        <tr key={idx} className="h-8 border-none">
                          <td className="border-l border-r border-gray-200 px-2 py-1.5 font-medium">
                            <div>{item.particular || ''}</div>
                            {isPaddyItem && item.weight_kg && (
                              <div className="text-[10px] text-blue-600 font-bold">
                                ({item.weight_kg}kg total)
                              </div>
                            )}
                          </td>
                          <td className="border-l border-r border-gray-200 px-2 py-1.5 text-center">{item.qty_bags || ''}</td>
                          <td className="border-l border-r border-gray-200 px-2 py-1.5 text-center">
                            {isPaddyItem ? `${item.weight_kg || ''}kg` : (item.weight_kg || '')}
                          </td>
                          <td className="border-l border-r border-gray-200 px-2 py-1.5 text-center">
                            {item.rate ? `${item.rate.toFixed(2)}${isPaddyItem ? ' ₹/kg' : ''}` : ''}
                          </td>
                          <td className="border-l border-r border-gray-200 px-2 py-1.5 text-right font-bold">{item.amount?.toFixed(2) || ''}</td>
                        </tr>
                      )
                    })
                  )}
                  {/* Fill remaining space to match Pic 2's structure */}
                  {items.length < 18 && (
                    Array.from({ length: 18 - items.length }).map((_, idx) => (
                      <tr key={`empty-${idx}`} className="h-8 border-none">
                        <td className="border-l border-r border-gray-100 p-2 text-gray-100 select-none">-</td>
                        <td className="border-l border-r border-gray-100 p-2 text-center text-gray-100 select-none">-</td>
                        <td className="border-l border-r border-gray-100 p-2 text-center text-gray-100 select-none">-</td>
                        <td className="border-l border-r border-gray-100 p-2 text-center text-gray-100 select-none">-</td>
                        <td className="border-l border-r border-gray-100 p-2 text-right text-gray-100 select-none">-</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <div className="font-bold text-[10px] uppercase text-gray-500 mb-1">R.S. IN WORDS:</div>
                    <div className="text-[11px] font-bold leading-tight border-b border-gray-200 pb-2">
                      {grandTotal > 0 ? numberToWords(grandTotal) : ''}
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-600">SUB TOTAL</span>
                    <span className="font-bold">₹ {itemsTotal.toFixed(2)}</span>
                  </div>

                  {!isKacchi && gstEnabled && gstTotal > 0 && (
                    <div className="space-y-1 pt-1 border-t border-gray-100 mt-1">
                      {cgstPercent > 0 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">CGST @ {cgstPercent}%</span>
                          <span className="font-bold">₹ {(itemsTotal * cgstPercent / 100).toFixed(2)}</span>
                        </div>
                      )}
                      {igstPercent > 0 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">IGST @ {igstPercent}%</span>
                          <span className="font-bold">₹ {(itemsTotal * igstPercent / 100).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-gray-100">
                        <span className="text-gray-600">GST Total:</span>
                        <span>₹ {gstTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {balance && balance > 0 && (
                    <div className="flex justify-between items-center text-sm pt-1">
                      <span className="font-bold text-gray-600 uppercase">Balance</span>
                      <span className="font-bold text-orange-600">₹ {balance.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t-[3px] border-black pt-2 mt-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xl font-black italic">TOTAL</span>
                      <span className="text-2xl font-black">₹ {grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Auth Signatory Area */}
            <div className="mt-auto pt-6 flex justify-between items-end pb-2">
              <div className="text-left w-1/2">
                {/* Bank Details Moved Here */}
                {!isKacchi && showBankDetails && bankName && bankIFSC && bankAccount && (
                  <div className="text-[11px]">
                    <div className="font-bold text-red-600 mb-1 uppercase tracking-tight">BANK DETAIL S:</div>
                    <div className="grid grid-cols-1 gap-0.5 font-bold uppercase text-[10px] text-gray-800">
                      <div className="flex gap-2"><span>BANK :</span> <span className="text-gray-900">{bankName}</span></div>
                      <div className="flex gap-2"><span>IFSC CODE NO. :</span> <span className="text-gray-900">{bankIFSC}</span></div>
                      <div className="flex gap-2"><span>S. B. No. :</span> <span className="text-gray-900">{bankAccount}</span></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-red-600 mb-8 uppercase tracking-tight">
                  For {COMPANY_INFO.name}
                </div>
                <div className="text-[10px] font-medium w-44 ml-auto text-center border-t border-gray-400 pt-1 text-gray-600">
                  Auth. Signatory
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <style jsx>{`
        .bill-preview-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow: hidden;
          background: #f3f4f6;
          border-radius: 0.75rem;
          border: 1px dashed #d1d5db;
          padding: 1.5rem;
        }

        .bill-preview-container {
          width: 210mm;
          height: 297mm;
          transform-origin: top center;
          transition: transform 0.2s ease-out;
          background: white;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        /* Desktop: Precision scaling to fit BOTH width and height */
        @media (min-width: 1280px) {
          .bill-preview-container {
            /* 
               Width limit: Max pane width in 1280px layout is ~600px.
               Height limit: Viewport height minus header/footer (~220px).
            */
            transform: scale(min(
              calc(580 / 794), 
              calc((100vh - 220px) / 1122)
            ));
          }
        }

        /* Tablet/Large Mobile scaling */
        @media (max-width: 1279px) {
          .bill-preview-container {
            transform: scale(0.65);
            margin-bottom: -150px;
          }
        }
        @media (max-width: 1024px) {
          .bill-preview-container {
            transform: scale(0.55);
            margin-bottom: -200px;
          }
        }
        @media (max-width: 768px) {
          .bill-preview-container {
            transform: scale(0.5);
            margin-bottom: -250px;
          }
        }
        @media (max-width: 640px) {
          .bill-preview-container {
            transform: scale(0.42);
            margin-bottom: -350px;
          }
        }
        @media (max-width: 480px) {
          .bill-preview-container {
            transform: scale(0.35);
            margin-bottom: -450px;
          }
        }
        @media (max-width: 380px) {
          .bill-preview-container {
            transform: scale(0.28);
            margin-bottom: -500px;
          }
        }
      `}</style>
    </div>
  )
}
