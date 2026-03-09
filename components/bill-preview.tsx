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
    <Card className="p-8 bg-white text-black relative overflow-hidden" style={{ fontFamily: 'Arial, sans-serif', width: '210mm', minHeight: '297mm', margin: '0 auto' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      
      {/* Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0 rotate-12 opacity-[0.08]" 
           style={{ fontSize: '200px', fontWeight: 700, letterSpacing: '14px', fontFamily: '"Playfair Display", serif', color: '#8c8c8c' }}>
        MS
      </div>

      <div className="relative z-10 space-y-4 flex flex-col h-full">
        {/* Header */}
        <div className="border-b-2 border-red-600 pb-4">
          <div className="grid grid-cols-3 items-center">
            <div className="text-xs text-gray-600">
              {!isKacchi && <div>Subject to Sangli Jurisdiction</div>}
            </div>
            <div className="text-center">
              <div className="inline-block bg-red-600 text-white px-4 py-1 rounded text-sm font-bold mb-2">
                {isKacchi ? 'CASH / CREDIT MEMO' : 'CREDIT MEMO'}
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <div className="font-bold text-gray-700">Contact:</div>
              <div>9860022450</div>
              <div>9561420666</div>
            </div>
          </div>

          <h1 className="text-center text-4xl font-black text-red-600 tracking-wider mb-1 mt-2">{COMPANY_INFO.name}</h1>
          <p className="text-center text-xs tracking-wide text-gray-700">{COMPANY_INFO.address}</p>
          {!isKacchi && (
            <p className="text-center text-xs font-bold mt-1">GST IN : {COMPANY_INFO.gst}</p>
          )}
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
        <div className="border-t border-b border-gray-300 py-3">
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
        <div className="flex-1 min-h-[300px]">
          <table className="w-full text-sm border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-left font-bold uppercase text-xs">Particulars</th>
                <th className="border border-gray-400 p-2 text-center font-bold uppercase text-xs w-20">Qty Bags</th>
                <th className="border border-gray-400 p-2 text-center font-bold uppercase text-xs w-24">Weight Kg</th>
                <th className="border border-gray-400 p-2 text-center font-bold uppercase text-xs w-20">Rate</th>
                <th className="border border-gray-400 p-2 text-right font-bold uppercase text-xs w-28">Amount ₹</th>
              </tr>
            </thead>
            <tbody>
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
                    <tr key={idx} className="h-8">
                      <td className="border border-gray-300 px-2 py-1.5 font-medium">
                        <div>{item.particular || ''}</div>
                        {isPaddyItem && item.weight_kg && (
                          <div className="text-[10px] text-blue-600 font-bold">
                            ({item.weight_kg}kg total)
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center">{item.qty_bags || ''}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center">
                        {isPaddyItem ? `${item.weight_kg || ''}kg` : (item.weight_kg || '')}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-center">
                        {item.rate ? `${item.rate.toFixed(2)}${isPaddyItem ? ' ₹/kg' : ''}` : ''}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-bold">{item.amount?.toFixed(2) || ''}</td>
                    </tr>
                  )
                })
              )}
              {/* Fill remaining space to match Pic 2's structure */}
              {items.length < 10 && (
                Array.from({ length: 10 - items.length }).map((_, idx) => (
                  <tr key={`empty-${idx}`} className="h-8">
                    <td className="border border-gray-300 p-2">&nbsp;</td>
                    <td className="border border-gray-300 p-2 text-center border-l-2 border-r-2 border-gray-300">&nbsp;</td>
                    <td className="border border-gray-300 p-2 text-center border-l-2 border-r-2 border-gray-300">&nbsp;</td>
                    <td className="border border-gray-300 p-2 text-center border-l-2 border-r-2 border-gray-300">&nbsp;</td>
                    <td className="border border-gray-300 p-2 text-right">&nbsp;</td>
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
                <div className="font-bold text-xs uppercase text-gray-500 mb-1">Rs. in Words:</div>
                <div className="text-xs font-semibold leading-relaxed border-b border-gray-200 pb-2">
                  {grandTotal > 0 ? numberToWords(grandTotal) : ''}
                </div>
              </div>

              {/* Bank Details for Pakki */}
              {!isKacchi && showBankDetails && bankName && bankIFSC && bankAccount && (
                <div className="pt-2 text-[11px] border-t border-gray-100">
                  <div className="font-bold text-red-600 mb-1 uppercase tracking-tight">Bank Details:</div>
                  <div className="grid grid-cols-1 gap-0.5 font-medium">
                    <div className="flex gap-1"><strong>BANK :</strong> {bankName}</div>
                    <div className="flex gap-1"><strong>IFSC :</strong> {bankIFSC}</div>
                    <div className="flex gap-1"><strong>A/C No :</strong> {bankAccount}</div>
                  </div>
                </div>
              )}
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

              <div className="border-t-2 border-black pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-black italic">TOTAL</span>
                  <span className="text-2xl font-black">₹ {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Signatory Area */}
        <div className="mt-8 flex justify-between items-end pb-4">
          <div className="text-xs font-bold text-red-600 italic">
            Thank you for your business!
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-red-600 mb-10 uppercase">
              For {COMPANY_INFO.name}
            </div>
            <div className="text-[10px] font-bold border-t border-gray-400 pt-1 w-32 ml-auto text-center">
              Auth. Signatory
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
