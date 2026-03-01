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
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <div className="inline-block min-w-full align-middle">
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
                              // Check if bill_number already has prefix (old format: "P001", new format: "1")
                              if (billNum.startsWith('P') || billNum.startsWith('K')) {
                                const numPart = billNum.substring(1)
                                return billNum.charAt(0) + numPart.padStart(3, '0')
                              } else {
                                // New format: just number, add prefix
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
                            {/* Mobile: Stack buttons vertically, Desktop: Horizontal */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                              <div className="flex gap-2">
                                <Link href={`/bills/${bill.id}`}>
                                  <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1 px-2 md:px-3">
                                    <Eye className="h-3 w-3 md:h-4 md:w-4" />
                                    <span className="hidden xs:inline">View</span>
                                  </Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full sm:w-auto gap-1 px-2 md:px-3"
                                  onClick={() => handleEdit(bill.id)}
                                >
                                  <Edit2 className="h-3 w-3 md:h-4 md:w-4" />
                                  <span className="hidden xs:inline">Edit</span>
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full sm:w-auto gap-1 px-2 md:px-3"
                                  onClick={() => handlePrint(bill.id)}
                                >
                                  <Printer className="h-3 w-3 md:h-4 md:w-4" />
                                  <span className="hidden xs:inline">Print</span>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full sm:w-auto gap-1 px-2 md:px-3 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                                      <span className="hidden xs:inline">Delete</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="mx-4">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-base md:text-lg">Delete Bill</AlertDialogTitle>
                                      <AlertDialogDescription className="text-sm md:text-base">
                                        Are you sure you want to delete bill {(() => {
                                          const billNum = String(bill.bill_number)
                                          if (billNum.startsWith('P') || billNum.startsWith('K')) {
                                            const numPart = billNum.substring(1)
                                            return billNum.charAt(0) + numPart.padStart(3, '0')
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
                                      <AlertDialogAction
                                        onClick={() => handleDelete(bill.id, (() => {
                                          const billNum = String(bill.bill_number)
                                          if (billNum.startsWith('P') || billNum.startsWith('K')) {
                                            const numPart = billNum.substring(1)
                                            return billNum.charAt(0) + numPart.padStart(3, '0')
                                          } else {
                                            const prefix = bill.bill_type === 'kacchi' ? 'K' : 'P'
                                            return `${prefix}${billNum.padStart(3, '0')}`
                                          }
                                        })())}
                                        className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
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
