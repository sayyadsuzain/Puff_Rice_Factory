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
  const [isSharing, setIsSharing] = useState(false)
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


  const handleShareWhatsApp = async () => {
    if (!partyName || partyName.trim() === '') {
      toast.error('Please wait for party data to load')
      return
    }

    setIsSharing(true)
    const toastId = toast.loading('Preparing accurate PDF...', { id: 'whatsapp-share' })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const safeBillNumber = String(bill.bill_number).replace(/\//g, '-')
      const filename = `${safeBillNumber} - ${partyName}.pdf`
      const downloadUrl = `/api/bill-pdf-download?id=${billId}${token ? `&token=${token}` : ''}`

      // Detect mobile/tablet viewports (including iPad 1024px)
      const isMobile = window.innerWidth <= 1024 || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)

      if (isMobile) {
        // Fetch the blob first to see if it's healthy
        const response = await fetch(downloadUrl)
        if (!response.ok) throw new Error('Failed to generate PDF')
        const blob = await response.blob()
        const file = new File([blob], filename, { type: 'application/pdf' })

        // Check if Web Share API can share the file
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          toast.success('PDF Ready!', {
            id: 'whatsapp-share',
            description: 'Tap "Share" then select WhatsApp',
            action: {
              label: 'Share PDF',
              onClick: async () => {
                try {
                  await navigator.share({
                    files: [file],
                    title: `Bill ${bill.bill_number}`,
                    text: `Bill from M S Trading for ${partyName}`,
                  })
                } catch (shareErr: any) {
                  if (shareErr.name !== 'AbortError') {
                    // Fallback to direct URL if share fails
                    window.open(downloadUrl, '_blank')
                  }
                }
              }
            },
            duration: 10000,
          })
        } else {
          // Fallback if sharing is not supported: open in new tab
          toast.success('PDF prepared!', {
            id: 'whatsapp-share',
            description: 'Opening PDF... Use the Share button (↑) in your browser to send to WhatsApp.',
            duration: 6000,
          })
          window.open(downloadUrl, '_blank')
        }
        return
      }

      // Desktop: just download the PDF (already works fine)
      const response = await fetch(downloadUrl)
      if (!response.ok) throw new Error('Failed to generate PDF')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded! Attach it in WhatsApp manually.', {
        id: 'whatsapp-share',
        duration: 5000,
      })
    } catch (error: any) {
      console.error('WhatsApp share error:', error)
      toast.error('Failed to generate PDF. Please check your connection.', { id: 'whatsapp-share' })
    } finally {
      setIsSharing(false)
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
        <div className="mb-4 md:mb-6 space-y-4 hidden-print">
          {/* Top Header: Back + Title */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Link href="/bills" className="flex-shrink-0">
                <Button variant="outline" size="sm" className="gap-2 h-9">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden xs:inline">Back to Bills</span>
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg md:text-2xl font-bold truncate flex items-center gap-2">
                  <span className="text-red-600">Bill</span>
                  <span>{(() => {
                    const billNum = String(bill.bill_number)
                    if (billNum.startsWith('P') || billNum.startsWith('K')) {
                      return billNum
                    } else {
                      const prefix = bill.bill_type === 'kacchi' ? 'K' : 'P'
                      return `${prefix}${billNum.padStart(3, '0')}`
                    }
                  })()}</span>
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground truncate font-medium">{partyName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:flex-shrink-0 self-end sm:self-auto">
              <Badge variant={bill.bill_type === 'kacchi' ? 'default' : 'secondary'} className="text-[10px] h-6 px-3">
                {bill.bill_type === 'kacchi' ? 'Kacchi' : 'Pakki'}
              </Badge>
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
            <Button
              variant="outline"
              className="gap-2 h-12 text-sm md:text-base font-bold shadow-sm"
              onClick={handlePrint}
              disabled={!partyName || partyName.trim() === ''}
            >
              <Printer className="h-4 w-4 text-gray-400" />
              <span>Print <span className="hidden xs:inline">PDF</span></span>
            </Button>

            <Button
              className="gap-2 bg-green-500 hover:bg-green-600 text-white h-12 text-sm md:text-base font-bold shadow-md shadow-green-100"
              onClick={handleShareWhatsApp}
              disabled={isSharing || !partyName || partyName.trim() === ''}
            >
              {isSharing ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              )}
              <span>{isSharing ? '...' : 'WhatsApp'}</span>
            </Button>

            <Button
              variant="default"
              className="gap-2 h-12 text-sm md:text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100"
              onClick={handleEdit}
            >
              <Edit2 className="h-4 w-4" />
              <span>Edit <span className="hidden xs:inline">Bill</span></span>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="gap-2 h-12 text-sm md:text-base font-bold shadow-md shadow-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete <span className="hidden xs:inline">Bill</span></span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="mx-4 max-w-[90vw] rounded-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg">Delete Bill</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm">
                    Are you sure you want to delete bill {(() => {
                      const billNum = String(bill.bill_number)
                      if (billNum.startsWith('P') || billNum.startsWith('K')) {
                        return billNum
                      } else {
                        const prefix = bill.bill_type === 'kacchi' ? 'K' : 'P'
                        return `${prefix}${billNum.padStart(3, '0')}`
                      }
                    })()}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto bg-red-600 hover:bg-red-700">
                    Delete Permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          {/* Bill Display */}
          <div className="xl:col-span-2">
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
