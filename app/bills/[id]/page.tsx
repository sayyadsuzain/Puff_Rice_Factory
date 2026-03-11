'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { supabase, Bill, BillItem, formatDate, formatDateTime } from '@/lib/supabase'
import { ArrowLeft, Printer, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import BillDisplay from '@/components/bill-display'
import { ProtectedRoute } from '@/components/protected-route'

export default function BillDetailPage() {
  const params = useParams()
  const billId = parseInt(params.id as string)
  const [bill, setBill] = useState<Bill | null>(null)
  const [items, setItems] = useState<BillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [partyName, setPartyName] = useState('')
  const [partyGst, setPartyGst] = useState('')

  useEffect(() => {
    fetchBillDetails()
  }, [billId])

  const fetchBillDetails = async () => {
    setLoading(true)
    try {
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single()

      if (billError) throw billError

      setBill(billData)

      // Fetch party information if we have party_id
      if (billData.party_id) {
        const { data: partyData, error: partyError } = await supabase
          .from('parties')
          .select('name, gst_number')
          .eq('id', billData.party_id)
          .single()

        if (!partyError && partyData) {
          setPartyName(partyData.name)
          setPartyGst(partyData.gst_number || '')
        }
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', billId)
        .order('id', { ascending: true })

      if (itemsError) throw itemsError

      setItems(itemsData || [])
    } catch (error) {
      console.error('Error fetching bill details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading bill details...</p>
      </div>
    )
  }
  if (!bill) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-red-600">Bill not found</p>
      </div>
    )
  }

  const handlePrint = async () => {
    // Check if party data is loaded
    if (!partyName || partyName.trim() === '') {
      toast.error('Please wait for party data to load before printing')
      return
    }

    try {
      toast.loading('Opening PDF preview...', { id: 'print' })

      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // Construct URL with auth token for window.open (restores original functionality)
      const pdfUrl = `/api/bill-pdf?id=${billId}${token ? `&token=${token}` : ''}`
      
      window.open(pdfUrl, '_blank')
      toast.success('PDF preview opened!', { id: 'print' })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Error generating PDF', { id: 'print' })
    }
  }


  const handleEdit = () => {
    if (!billId || isNaN(billId)) {
      toast.error('Invalid bill ID')
      return
    }
    const editUrl = `/bills/${billId}/edit`
    window.location.href = editUrl
  }

  const handleDelete = async () => {
    if (!bill) return

    try {
      // Delete bill items first (due to foreign key constraint)
      await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', billId)

      // Delete the bill
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', billId)

      if (error) throw error

      toast.success('Bill deleted successfully!')
      window.location.href = '/bills'
    } catch (error) {
      console.error('Error deleting bill:', error)
      toast.error('Failed to delete bill')
    }
  }

  return (
    <ProtectedRoute>
      <div className="container py-6 md:py-8">
        {/* Responsive Header */}
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hidden-print">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Link href="/bills" className="flex-shrink-0">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Bills</span>
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-3xl font-bold truncate">
                Bill {(() => {
                  const billNum = String(bill.bill_number)
                  if (billNum.startsWith('P') || billNum.startsWith('K')) {
                    return billNum
                  } else {
                    const prefix = bill.bill_type === 'kacchi' ? 'K' : 'P'
                    return `${prefix}${billNum.padStart(3, '0')}`
                  }
                })()}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground truncate">{partyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={bill.bill_type === 'kacchi' ? 'default' : 'secondary'} className="text-xs">
              {bill.bill_type === 'kacchi' ? 'Kacchi (Cash)' : 'Pakki (Credit/GST)'}
            </Badge>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handlePrint}
              disabled={!partyName || partyName.trim() === ''}
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print Bill as PDF</span>
              <span className="sm:hidden">Print</span>
            </Button>
            <Button
              variant="default"
              className="gap-2"
              onClick={handleEdit}
            >
              <Edit2 className="h-4 w-4" />
              <span className="hidden sm:inline">Edit Bill</span>
              <span className="sm:hidden">Edit</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete Bill</span>
                  <span className="sm:hidden">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="mx-4">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-base md:text-lg">Delete Bill</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm md:text-base">
                    Are you sure you want to delete bill {(() => {
                      const billNum = String(bill.bill_number)
                      if (billNum.startsWith('P') || billNum.startsWith('K')) {
                        return billNum
                      } else {
                        const prefix = bill.bill_type === 'kacchi' ? 'K' : 'P'
                        return `${prefix}${billNum.padStart(3, '0')}`
                      }
                    })()}?
                    This action cannot be undone and will permanently remove the bill and all its items.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto bg-red-600 hover:bg-red-700">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Bill Display */}
          <div className="lg:col-span-2">
            <BillDisplay bill={bill} items={items} partyName={partyName} partyGst={partyGst} />
          </div>

          {/* Bill Info Sidebar - Hidden during print */}
          <div className="space-y-4 hidden-print">
            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-base md:text-lg">Bill Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Bill Number</p>
                  <p className="text-base md:text-lg font-semibold">{(() => {
                    const billNum = String(bill.bill_number)
                    if (billNum.startsWith('P') || billNum.startsWith('K')) {
                      return billNum
                    } else {
                      const prefix = bill.bill_type === 'kacchi' ? 'K' : 'P'
                      return `${prefix}${billNum.padStart(3, '0')}`
                    }
                  })()}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Date</p>
                  <p className="text-base md:text-lg font-semibold">{formatDate(bill.bill_date)}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Party Name</p>
                  <p className="text-base md:text-lg font-semibold break-words">{partyName}</p>
                </div>
                {bill.vehicle_number && (
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Vehicle Number</p>
                    <p className="text-base md:text-lg font-semibold break-all">{bill.vehicle_number}</p>
                  </div>
                )}
                
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs md:text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-base md:text-lg font-bold">₹{bill.total_amount.toFixed(2)}</p>
                  </div>
                  
                  {bill.balance !== null && bill.balance !== undefined && bill.balance > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs md:text-sm text-muted-foreground">Balance</p>
                      <p className="text-base md:text-lg font-bold text-orange-600">₹{bill.balance.toFixed(2)}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-300">
                    <div className="flex justify-between items-center">
                      <p className="text-sm md:text-base font-bold text-muted-foreground uppercase">Grand Total</p>
                      <p className="text-xl md:text-3xl font-black text-green-600">₹{(bill.total_amount + (bill.balance || 0)).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {bill.total_amount_words && (
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Amount in Words</p>
                    <p className="text-xs md:text-sm break-words">{bill.total_amount_words}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Created</p>
                  <p className="text-xs md:text-sm">{formatDateTime(bill.created_at)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-base md:text-lg">Items ({items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 md:space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="pb-2 md:pb-3 border-b last:border-b-0">
                      <p className="text-sm md:text-base font-semibold break-words">{item.particular}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs md:text-sm text-muted-foreground mt-1">
                        {item.qty_bags && <p>Qty: {item.qty_bags} bags</p>}
                        {item.weight_kg && <p>Wt: {item.weight_kg} kg</p>}
                        {item.rate && <p>Rate: ₹{item.rate}</p>}
                        {item.amount && <p className="font-semibold text-foreground col-span-2 md:col-span-1">₹{item.amount.toFixed(2)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
