'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { supabase, Bill, formatDate } from '@/lib/supabase'
import { Plus, Eye, Printer, Edit2, Trash2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { ProtectedRoute } from '@/components/protected-route'

interface BillWithParties extends Bill {
  parties?: {
    name: string
  }
}

export const dynamic = 'force-dynamic'

export default function BillsPage() {
  const [bills, setBills] = useState<BillWithParties[]>([])
  const [filteredBills, setFilteredBills] = useState<BillWithParties[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [billTypeFilter, setBillTypeFilter] = useState<'all' | 'kacchi' | 'pakki'>('all')

  useEffect(() => {
    fetchBills()
  }, [])

  useEffect(() => {
    filterBills()
  }, [bills, searchTerm, billTypeFilter])

  const fetchBills = async () => {
    setLoading(true)
    try {
      console.log('Connecting to Supabase...')
      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          parties:party_id (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      console.log('Bills fetched successfully:', data?.length || 0, 'bills')
      setBills(data || [])
    } catch (error) {
      console.error('Error fetching bills:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterBills = () => {
    let filtered = bills

    // Filter by bill type
    if (billTypeFilter !== 'all') {
      filtered = filtered.filter(bill => bill.bill_type === billTypeFilter)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(bill =>
        bill.parties?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.bill_number.toString().includes(searchTerm)
      )
    }

    setFilteredBills(filtered)
  }

  const handlePrint = async (billId: number) => {
    try {
      console.log('🎨 BILL-LIST: Generating PDF for bill ID:', billId)
      // Open the Puppeteer-generated PDF inline in browser
      const pdfUrl = `/api/bill-pdf?id=${billId}`
      window.open(pdfUrl, '_blank')
    } catch (error) {
      console.error('❌ BILL-LIST: Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    }
  }

  const handleEdit = (billId: number) => {
    window.location.href = `/bills/${billId}/edit`
  }

  const handleDelete = async (billId: number, billNumber: string) => {
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

      toast.success(`Bill ${billNumber} deleted successfully!`)
      // Refresh the bills list
      fetchBills()
    } catch (error) {
      console.error('Error deleting bill:', error)
      toast.error('Failed to delete bill')
    }
  }

  return (
    <ProtectedRoute>
      <div className="container py-6 md:py-8">
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold truncate">Bill Management</h1>
            <p className="text-sm md:text-base text-muted-foreground">Manage Kacchi and Pakki bills for puff rice products</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 flex-shrink-0">
            <Link href="/reports/ca">
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <FileText className="h-4 w-4" />
                CA Reports
              </Button>
            </Link>
            <Link href="/bills/create" className="flex-shrink-0">
              <Button className="w-full sm:w-auto gap-2">
                <Plus className="h-4 w-4" />
                Create Bill
              </Button>
            </Link>
          </div>
        </div>

        {/* Responsive Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <Card className="p-4 md:p-6">
            <p className="text-xs md:text-sm text-muted-foreground">Total Bills</p>
            <p className="text-2xl md:text-3xl font-bold">{bills.length}</p>
          </Card>
          <Card className="p-4 md:p-6">
            <p className="text-xs md:text-sm text-muted-foreground">Kacchi Bills</p>
            <p className="text-2xl md:text-3xl font-bold">{bills.filter(b => b.bill_type === 'kacchi').length}</p>
          </Card>
          <Card className="p-4 md:p-6">
            <p className="text-xs md:text-sm text-muted-foreground">Pakki Bills</p>
            <p className="text-2xl md:text-3xl font-bold">{bills.filter(b => b.bill_type === 'pakki').length}</p>
          </Card>
        </div>

        {/* Responsive Search and Filter */}
        <Card className="mb-4 md:mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              <Input
                placeholder="Search by party name or bill number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              <Tabs value={billTypeFilter} onValueChange={(value) => setBillTypeFilter(value as any)}>
                <TabsList className="grid w-full grid-cols-3" suppressHydrationWarning>
                  <TabsTrigger value="all" className="text-xs md:text-sm" suppressHydrationWarning>All</TabsTrigger>
                  <TabsTrigger value="kacchi" className="text-xs md:text-sm" suppressHydrationWarning>Kacchi</TabsTrigger>
                  <TabsTrigger value="pakki" className="text-xs md:text-sm" suppressHydrationWarning>Pakki</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Responsive Bills Table */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-lg md:text-xl">Bills List</CardTitle>
            <CardDescription className="text-sm">
              Showing {filteredBills.length} of {bills.length} bills
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {loading ? (
              <div className="text-center py-6 md:py-8">
                <p className="text-sm md:text-base text-muted-foreground">Loading bills...</p>
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <p className="text-sm md:text-base text-muted-foreground">No bills found</p>
              </div>
            ) : (
              <div>
                {/* Mobile/Tablet Card View (shown on screens < md) */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {filteredBills.map((bill) => (
                    <Card key={bill.id} className="overflow-hidden border-l-4 shadow-sm" style={{ borderLeftColor: bill.bill_type === 'kacchi' ? '#ef4444' : '#6366f1' }}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg font-bold">
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
                              </span>
                              <Badge variant={bill.bill_type === 'kacchi' ? 'default' : 'secondary'} className="text-[10px] h-5">
                                {bill.bill_type === 'kacchi' ? 'Kacchi' : 'Pakki'}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-gray-900 line-clamp-1">
                              {bill.parties?.name || 'Unknown Party'}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(bill.bill_date)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">₹{bill.total_amount.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <Link href={`/bills/${bill.id}`} className="w-full">
                            <Button variant="outline" size="sm" className="w-full gap-2 h-9">
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 h-9"
                            onClick={() => handleEdit(bill.id)}
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 h-9"
                            onClick={() => handlePrint(bill.id)}
                          >
                            <Printer className="h-4 w-4" />
                            Print
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-2 h-9 text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="mx-4 max-w-[90vw] rounded-lg">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Bill</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Permanently delete bill {bill.bill_number}? This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(bill.id, bill.bill_number)}
                                  className="w-full bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View (shown on screens >= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Bill No.</TableHead>
                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                        <TableHead className="min-w-[120px]">Party Name</TableHead>
                        <TableHead className="hidden md:table-cell">Amount</TableHead>
                        <TableHead className="hidden lg:table-cell">Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-semibold whitespace-nowrap">
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
                          </TableCell>
                          <TableCell className="hidden sm:table-cell whitespace-nowrap">
                            {formatDate(bill.bill_date)}
                          </TableCell>
                          <TableCell className="font-medium max-w-[120px] truncate md:max-w-none md:truncate-none">
                            {bill.parties?.name || 'Unknown Party'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell whitespace-nowrap">
                            ₹{bill.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant={bill.bill_type === 'kacchi' ? 'default' : 'secondary'} className="text-xs">
                              {bill.bill_type === 'kacchi' ? 'Kacchi' : 'Pakki'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/bills/${bill.id}`}>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="View">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEdit(bill.id)}
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handlePrint(bill.id)}
                                title="Print"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Bill</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete bill {bill.bill_number}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(bill.id, bill.bill_number)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
