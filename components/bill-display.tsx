import { Bill, BillItem, COMPANY_INFO, formatDate, supabase } from '@/lib/supabase'
import { numberToWords } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'

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
      toast.loading('Generating PDF...', { id: 'print' })

      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // Call the individual bill PDF API endpoint with auth header
      const response = await fetch(`/api/bill-pdf?id=${bill.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)

        // Create download link
        const a = document.createElement('a')
        const billNum = String(bill.bill_number)
        let filename = `Bill_${billNum}.pdf`
        
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()

        // Cleanup
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast.success('PDF downloaded successfully!', { id: 'print' })
      } else {
        const errorText = await response.text()
        console.error('❌ BILL-PDF: PDF generation failed:', errorText)
        toast.error('Failed to generate PDF', { id: 'print' })
      }
    } catch (error) {
      console.error('❌ BILL-PDF: Error generating PDF:', error)
      toast.error('Error generating PDF', { id: 'print' })
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
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&display=swap" rel="stylesheet" />

      {/* Watermark */}
      <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0 opacity-[0.06]"
        style={{ fontSize: '320px', fontWeight: 900, letterSpacing: '25px', fontFamily: '"Playfair Display", serif', color: '#c0c0c0' }}>
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
        <div className="w-full mb-2">
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

          <h1 className="text-center text-5xl font-bold text-red-600 tracking-tight mb-1 mt-1" style={{ textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.05)' }}>
            M S TRADING COMPANY
          </h1>
          <div className="text-center text-[10px] tracking-widest text-gray-700 font-bold uppercase">
            KUPWAD MIDC NEAR NAV KRISHNA VALLEY, PLOT NO L-52
          </div>
          {!isKacchi && (
            <p className="text-center text-[11px] font-bold mt-1 text-gray-800 tracking-widest uppercase">GST IN : {COMPANY_INFO.gst}</p>
          )}

          {/* Double Red Header Lines */}
          <div className="border-b-[4px] border-red-600 mt-2"></div>
          <div className="border-b-[1px] border-red-600 mt-[2px]"></div>
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
              {items.map((item, idx) => {
                const isPaddyItem = item.particular?.toLowerCase().includes('paddy')
                return (
                  <tr key={idx} className="h-8 border-none">
                    <td className="border-l border-r border-gray-200 px-2 py-1.5 font-medium">
                      <div>{item.particular}</div>
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
              })}
              {items.length < 18 && Array.from({ length: 18 - items.length }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="h-8 border-none">
                  <td className="border-l border-r border-gray-100 p-2 text-gray-100 select-none">-</td>
                  <td className="border-l border-r border-gray-100 p-2 text-center text-gray-100 select-none">-</td>
                  <td className="border-l border-r border-gray-100 p-2 text-center text-gray-100 select-none">-</td>
                  <td className="border-l border-r border-gray-100 p-2 text-center text-gray-100 select-none">-</td>
                  <td className="border-l border-r border-gray-100 p-2 text-right text-gray-100 select-none">-</td>
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
                <div className="font-bold text-[10px] uppercase text-gray-500 mb-1">Rs. in Words:</div>
                <div className="text-[11px] font-bold leading-tight border-b border-gray-200 pb-2">
                  {totalInWords}
                </div>
              </div>
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

              <div className="border-t-[3px] border-black pt-2 mt-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xl font-black italic">TOTAL</span>
                  <span className="text-2xl font-black">₹ {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Auth Signatory Area */}
          <div className="mt-auto pt-6 flex justify-between items-end pb-2">
            <div className="text-left w-1/2">
              {/* Bank Details Moved Here */}
              {!isKacchi && bill.bank_name && bill.bank_ifsc && bill.bank_account && (
                <div className="text-[11px]">
                  <div className="font-bold text-red-600 mb-1 uppercase tracking-tight">BANK DETAIL S:</div>
                  <div className="grid grid-cols-1 gap-0.5 font-bold uppercase text-[10px] text-gray-800">
                    <div className="flex gap-2"><span>BANK :</span> <span className="text-gray-900">{bill.bank_name}</span></div>
                    <div className="flex gap-2"><span>IFSC CODE NO. :</span> <span className="text-gray-900">{bill.bank_ifsc}</span></div>
                    <div className="flex gap-2"><span>S. B. No. :</span> <span className="text-gray-900">{bill.bank_account}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-red-600 mb-8 uppercase tracking-tight">
                For M S TRADING COMPANY
              </div>
              <div className="text-[10px] font-medium w-44 ml-auto text-center border-t border-gray-400 pt-1 text-gray-600">
                Auth. Signatory
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
