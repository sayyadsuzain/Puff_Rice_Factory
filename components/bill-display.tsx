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
      className="a4-container bill-display"
      style={{
        maxWidth: '896px',
        margin: '0 auto',
        backgroundColor: 'white',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        padding: '12px',
        width: '100%',
        overflowX: 'auto'
      }}
    >
      {/* Print Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }} className="no-print">
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print PDF
        </Button>
      </div>

      {/* Header Section */}
      <div className="w-full border-b pb-4 mb-6 relative">
        {/* Top Row */}
        <div className="flex justify-between items-start text-xs">
          <div className="text-gray-600">
            {bill.bill_type !== "kacchi" && (
              <div>Subject to Sangli Jurisdiction</div>
            )}
          </div>

          <div className="text-right text-xs leading-tight">
            <div className="font-semibold">BILL NO.</div>
            <div className="text-red-600 font-bold text-sm">
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
            <div className="mt-2 font-semibold">DATE</div>
            <div>{formatDate(bill.bill_date)}</div>
          </div>
        </div>

        {/* Company Center */}
        <div className="text-center mt-2">
          <h1 className="text-2xl font-extrabold tracking-widest text-red-600">
            M S TRADING COMPANY
          </h1>
          <div className="text-xs tracking-wide text-gray-700 mt-1">
            KUPWAD MIDC NEAR NAV KRISHNA VALLEY, PLOT NO L-52
          </div>

          {/* Contact */}
          <div className="text-xs mt-1">
            Contact: 9860022450 / 9561420666
          </div>

          {/* Memo Badge */}
          <div className="mt-3">
            <span className="bg-red-600 text-white text-xs px-4 py-1 rounded">
              {bill.bill_type === "kacchi"
                ? "CASH / CREDIT MEMO"
                : "CREDIT MEMO"}
            </span>
          </div>
        </div>
      </div>

      {/* Party Details - CA Compliant */}
      <div className="border rounded-md p-3 mb-6 text-sm">
        <div className="font-semibold">TO:</div>
        <div className="mt-1 font-medium">
          M/s. {partyName || '_'.repeat(40)}
        </div>

        {bill.vehicle_number && (
          <div className="text-xs mt-1">
            Vehicle No.: {bill.vehicle_number}
          </div>
        )}

        {!isKacchi && partyGst && (
          <div className="text-xs mt-1">
            GST No.: {partyGst}
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="flex-1 flex flex-col border border-gray-300 mb-6 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm border-collapse min-w-[600px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="w-[40%] sm:w-[50%] border px-1 sm:px-2 py-2 text-left">Particulars</th>
              <th className="w-[15%] sm:w-[10%] border px-1 sm:px-2 py-2 text-center">Qty.</th>
              <th className="w-[15%] sm:w-[12%] border px-1 sm:px-2 py-2 text-center">Weight</th>
              <th className="w-[15%] sm:w-[12%] border px-1 sm:px-2 py-2 text-center">Rate</th>
              <th className="w-[15%] sm:w-[16%] border px-1 sm:px-2 py-2 text-right">Amount ₹</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isPaddyItem = item.particular?.toLowerCase().includes('paddy')
              return (
                <tr key={idx}>
                  <td className="border px-2 py-2">
                    <div>{item.particular}</div>
                    {isPaddyItem && item.weight_kg && (
                      <div className="text-xs text-blue-600">
                        ({item.weight_kg}kg total)
                      </div>
                    )}
                  </td>
                  <td className="border px-2 py-2 text-center">{item.qty_bags || ''}</td>
                  <td className="border px-2 py-2 text-center">
                    {isPaddyItem ? `${item.weight_kg || ''}kg` : (item.weight_kg || '')}
                  </td>
                  <td className="border px-2 py-2 text-center">
                    {item.rate ? `${item.rate.toFixed(2)}${isPaddyItem ? ' ₹/kg' : ''}` : ''}
                  </td>
                  <td className="border px-2 py-2 text-right">{item.amount?.toFixed(2) || ''}</td>
                </tr>
              )
            })}
            {items.length < 8 && Array.from({ length: 8 - items.length }).map((_, idx) => (
              <tr key={`empty-${idx}`}>
                <td className="border px-2 py-2">&nbsp;</td>
                <td className="border px-2 py-2">&nbsp;</td>
                <td className="border px-2 py-2">&nbsp;</td>
                <td className="border px-2 py-2">&nbsp;</td>
                <td className="border px-2 py-2">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Section - Always at Bottom */}
      <div className="mt-auto">
        {/* Rs. in Words */}
        <div className="mb-4 text-sm">
          <div className="font-semibold">Rs. in Words:</div>
          <div className="text-xs">{totalInWords}</div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full sm:w-72 text-xs sm:text-sm space-y-2">
            <div className="flex justify-between">
              <span className="font-semibold">SUB TOTAL</span>
              <span>₹ {bill.total_amount.toFixed(2)}</span>
            </div>

            {!isKacchi && bill.is_gst_enabled && (bill.gst_total || 0) > 0 && (
              <>
                {(bill.cgst_percent || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>CGST @ {bill.cgst_percent}%</span>
                    <span>₹ {bill.cgst_amount.toFixed(2)}</span>
                  </div>
                )}
                {(bill.igst_percent || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>IGST @ {bill.igst_percent}%</span>
                    <span>₹ {bill.igst_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1">
                  <span className="font-semibold">GST Total:</span>
                  <span>₹ {bill.gst_total.toFixed(2)}</span>
                </div>
              </>
            )}

            {bill.balance != null && bill.balance > 0 && (
              <div className="flex justify-between">
                <span className="font-semibold">BALANCE</span>
                <span>₹ {bill.balance.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>TOTAL</span>
              <span>₹ {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Bank Details & Signature */}
        {!isKacchi && bill.bank_name && bill.bank_ifsc && bill.bank_account && (
          <div className="mt-6 pt-4 border-t text-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end">
              <div className="flex-1 mb-4 sm:mb-0">
                <div className="font-semibold text-red-600 mb-1">BANK DETAILS:</div>
                <div className="space-y-1">
                  <div><strong>Bank:</strong> {bill.bank_name}</div>
                  <div><strong>IFSC:</strong> {bill.bank_ifsc}</div>
                  <div><strong>A/C No:</strong> {bill.bank_account}</div>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="font-semibold text-red-600 mb-4">For M S TRADING COMPANY</div>
                <div className="border-t border-gray-400 w-32 pt-1 text-center text-xs">
                  Authorised Signatory
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kacchi Signature */}
        {isKacchi && (
          <div className="mt-6 text-center sm:text-right">
            <div className="font-semibold text-red-600 mb-4">For M S TRADING COMPANY</div>
            <div className="border-t border-gray-400 w-32 pt-1 text-center text-xs ml-auto sm:ml-0">
              Authorised Signatory
            </div>
          </div>
        )}
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
