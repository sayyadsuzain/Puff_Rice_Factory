import { Bill, BillItem, COMPANY_INFO, formatDate } from '@/lib/supabase'
import { numberToWords } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface BillDisplayProps {
  bill: Bill
  items: BillItem[]
  partyName?: string
  partyGst?: string
}

export default function BillDisplay({ bill, items, partyName, partyGst }: BillDisplayProps) {
  const isKacchi = bill.bill_type === 'kacchi'

  // Calculate the final grand total
  const grandTotal = (bill.total_amount || 0) + (bill.gst_total || 0) + (bill.balance || 0)

  // Calculate total in words for the grand total
  const totalInWords = numberToWords(grandTotal)

  const handlePrint = async () => {
    try {
      console.log('🎨 BILL-PDF: Generating PDF for bill ID:', bill.id)
      // Open the Puppeteer-generated PDF inline in browser
      const pdfUrl = `/api/bill-pdf?id=${bill.id}`
      window.open(pdfUrl, '_blank')
    } catch (error) {
      console.error('❌ BILL-PDF: Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  return (
    <div
      className="a4-container bill-display relative overflow-hidden"
      style={{
        maxWidth: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        backgroundColor: 'white',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        padding: '15mm',
        width: '100%',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />

      {/* Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0 rotate-12 opacity-[0.08]"
        style={{ fontSize: '200px', fontWeight: 700, letterSpacing: '14px', fontFamily: '"Playfair Display", serif', color: '#8c8c8c' }}>
        MS
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Print Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }} className="no-print">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print PDF
          </Button>
        </div>

        {/* Header Section */}
        <div className="w-full border-b-2 border-red-600 pb-4 mb-6">
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

          <h1 className="text-center text-4xl font-black text-red-600 tracking-wider mb-1 mt-2">
            M S TRADING COMPANY
          </h1>
          <div className="text-center text-xs tracking-wide text-gray-700">
            KUPWAD MIDC NEAR NAV KRISHNA VALLEY, PLOT NO L-52
          </div>
          {!isKacchi && (
            <p className="text-center text-xs font-bold mt-1">GST IN : {COMPANY_INFO.gst}</p>
          )}
        </div>

        {/* Bill Info Grid */}
        <div className="grid grid-cols-3 gap-4 text-sm items-center py-2 mb-4">
          <div>
            <div className="font-bold text-xs uppercase text-gray-500">From :</div>
            <div className="font-bold">M S TRADING COMPANY</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-xs uppercase text-gray-500">No.</div>
            <div className="text-xl font-black text-red-600">
              {(() => {
                const billNum = String(bill.bill_number)
                if (billNum.startsWith('P') || billNum.startsWith('K')) {
                  const numPart = billNum.substring(1)
                  return billNum.charAt(0) + numPart.padStart(3, '0')
                } else {
                  const prefix = bill.bill_type === 'kacchi' ? 'K' : 'P'
                  return `${prefix}${billNum.padStart(3, '0')}`
                }
              })()}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-xs uppercase text-gray-500">Date :</div>
            <div className="font-bold text-base">{formatDate(bill.bill_date)}</div>
          </div>
        </div>

        {/* Party Details */}
        <div className="border border-gray-300 rounded-md p-3 mb-6 relative">
          <div className="text-base font-medium">
            <span className="font-bold">M/s. </span>
            <span className="border-b border-dotted border-gray-400 min-w-[300px] inline-block">{partyName || '_'.repeat(40)}</span>
          </div>

          {(bill.vehicle_number || (!isKacchi && partyGst)) && (
            <div className="text-sm mt-2 flex justify-between font-semibold">
              {bill.vehicle_number && (
                <div>
                  <span className="font-bold text-gray-600">Vehicle No.: </span>
                  <span>{bill.vehicle_number}</span>
                </div>
              )}
              {!isKacchi && partyGst && (
                <div className={bill.vehicle_number ? "text-right" : ""}>
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
              {items.map((item, idx) => {
                const isPaddyItem = item.particular?.toLowerCase().includes('paddy')
                return (
                  <tr key={idx} className="h-8">
                    <td className="border border-gray-300 px-2 py-1.5 font-medium">
                      <div>{item.particular}</div>
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
              })}
              {items.length < 10 && Array.from({ length: 10 - items.length }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="h-8">
                  <td className="border border-gray-300 p-2">&nbsp;</td>
                  <td className="border border-gray-300 p-2 text-center border-l-2 border-r-2 border-gray-300">&nbsp;</td>
                  <td className="border border-gray-300 p-2 text-center border-l-2 border-r-2 border-gray-300">&nbsp;</td>
                  <td className="border border-gray-300 p-2 text-center border-l-2 border-r-2 border-gray-300">&nbsp;</td>
                  <td className="border border-gray-300 p-2 text-right">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Section */}
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <div className="font-bold text-xs uppercase text-gray-500 mb-1">Rs. in Words:</div>
                <div className="text-xs font-semibold leading-relaxed border-b border-gray-200 pb-2">
                  {totalInWords}
                </div>
              </div>

              {/* Bank Details & Signature */}
              {!isKacchi && bill.bank_name && bill.bank_ifsc && bill.bank_account && (
                <div className="pt-2 text-[11px] border-t border-gray-100">
                  <div className="font-bold text-red-600 mb-1 uppercase tracking-tight">BANK DETAILS:</div>
                  <div className="grid grid-cols-1 gap-0.5 font-medium">
                    <div className="flex gap-1"><strong>Bank:</strong> {bill.bank_name}</div>
                    <div className="flex gap-1"><strong>IFSC:</strong> {bill.bank_ifsc}</div>
                    <div className="flex gap-1"><strong>A/C No:</strong> {bill.bank_account}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-right space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-gray-600">SUB TOTAL</span>
                <span className="font-bold text-sm">₹ {bill.total_amount.toFixed(2)}</span>
              </div>

              {!isKacchi && bill.is_gst_enabled && (bill.gst_total || 0) > 0 && (
                <div className="space-y-1 pt-1 border-t border-gray-100 mt-1">
                  {(bill.cgst_percent || 0) > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">CGST @ {bill.cgst_percent}%</span>
                      <span className="font-bold">₹ {bill.cgst_amount.toFixed(2)}</span>
                    </div>
                  )}
                  {(bill.igst_percent || 0) > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">IGST @ {bill.igst_percent}%</span>
                      <span className="font-bold">₹ {bill.igst_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-gray-100">
                    <span className="text-gray-600">GST Total:</span>
                    <span>₹ {bill.gst_total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {bill.balance != null && bill.balance > 0 && (
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="font-bold text-gray-600 uppercase">BALANCE</span>
                  <span className="font-bold text-orange-600">₹ {bill.balance.toFixed(2)}</span>
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

          {/* Auth Signatory Area */}
          <div className="mt-8 flex justify-between items-end pb-4">
            <div className="text-xs font-bold text-red-600 italic">
              Thank you for your business!
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-red-600 mb-10 uppercase">
                For M S TRADING COMPANY
              </div>
              <div className="text-[10px] font-bold border-t border-gray-400 pt-1 w-32 ml-auto text-center">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          .a4-container {
            width: 210mm;
            height: 297mm;
            padding: 18mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .no-print {
            display: none !important;
          }

          table {
            page-break-inside: avoid;
          }

          .border {
            border-width: 1px !important;
          }
        }
      `}</style>
    </div>
  )
}
