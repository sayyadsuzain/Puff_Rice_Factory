'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, Bill, BillItem, FIXED_PRODUCTS, COMPANY_INFO } from '@/lib/supabase'
import BillPreview from '@/components/bill-preview'
import BillItemForm from '@/components/bill-item-form'
import { GSTToggle } from '@/components/gst-toggle'
import { ProtectedRoute } from '@/components/protected-route'

export const dynamic = 'force-dynamic'

export default function EditBillPage() {
  const params = useParams()
  const billId = parseInt(params.id as string)

  const [billType, setBillType] = useState<'kacchi' | 'pakki'>('kacchi')
  const [partyName, setPartyName] = useState('')
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])
  const [items, setItems] = useState<Partial<BillItem>[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [totalAmountWords, setTotalAmountWords] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [balance, setBalance] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankIFSC, setBankIFSC] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [showBankDetails, setShowBankDetails] = useState(true)
  const [notes, setNotes] = useState('')
  const [billNumber, setBillNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // GST-related state variables
  const [isGstEnabled, setIsGstEnabled] = useState(false)
  const [cgstPercent, setCgstPercent] = useState(0)
  const [igstPercent, setIgstPercent] = useState(0)
  const [gstTotal, setGstTotal] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)
  const [partyGst, setPartyGst] = useState('')

  // Auto-format vehicle number to uppercase
  useEffect(() => {
    if (vehicleNumber) {
      setVehicleNumber(vehicleNumber.toUpperCase())
    }
  }, [vehicleNumber])

  // Auto-format party name to title case
  useEffect(() => {
    if (partyName) {
      const titleCase = partyName
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      if (titleCase !== partyName) {
        setPartyName(titleCase)
      }
    }
  }, [partyName])

  useEffect(() => {
    if (billId) {
      console.log('🔄 EDIT PAGE: Starting to fetch bill data for ID:', billId)
      fetchBillData()
    } else {
      console.log('❌ EDIT PAGE: No billId provided')
    }
  }, [billId])

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero'

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    const teens = ['', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    const thousands = ['', 'Thousand', 'Lakh', 'Crore']

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return ''
      if (n < 10) return ones[n]
      if (n < 20) return teens[n - 10]
      if (n < 100) {
        const ten = Math.floor(n / 10)
        const one = n % 10
        return tens[ten] + (one > 0 ? ' ' + ones[one] : '')
      }
      const hundred = Math.floor(n / 100)
      const remainder = n % 100
      return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + convertLessThanThousand(remainder) : '')
    }

    const rupees = Math.floor(num)
    const paise = Math.round((num - rupees) * 100)

    let result = ''

    // Handle rupees
    if (rupees > 0) {
      let temp = rupees
      let thousandIndex = 0

      while (temp > 0 && thousandIndex < thousands.length) {
        const chunk = temp % 1000
        if (chunk > 0) {
          const chunkWords = convertLessThanThousand(chunk)
          result = chunkWords + (thousands[thousandIndex] ? ' ' + thousands[thousandIndex] : '') + (result ? ' ' + result : '')
        }
        temp = Math.floor(temp / 1000)
        thousandIndex++
      }

      result += ' Rupees'
    }

    // Handle paise
    if (paise > 0) {
      if (rupees > 0) result += ' and '
      result += convertLessThanThousand(paise) + ' Paise'
    }

    if (result) result += ' Only'
    return result.trim()
  }

  const fetchBillData = async () => {
    console.log('EDIT PAGE: fetchBillData called')
    try {
      setFetchLoading(true)
      setFetchError(null)

      console.log('EDIT PAGE: Making API call to Supabase...')
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout - please check your internet connection')), 15000)
      )

      const fetchPromise = async () => {
        console.log('EDIT PAGE: Connecting to Supabase...')

        // Fetch bill data
        const { data: billData, error: billError } = await supabase
          .from('bills')
          .select('*')
          .eq('id', billId)
          .single()

        console.log('EDIT PAGE: Bill query result:', { data: billData, error: billError })

        if (billError) {
          console.error('EDIT PAGE: Bill fetch error:', billError)
          throw new Error(`Failed to fetch bill: ${billError.message}`)
        }

        if (!billData) {
          console.error('EDIT PAGE: No bill data found')
          throw new Error('Bill not found')
        }

        console.log('✅ EDIT PAGE: Bill data fetched successfully:', billData)

        // Fetch party information first if we have party_id
        if (billData.party_id) {
          console.log('🔄 EDIT PAGE: Fetching party information for party_id:', billData.party_id)
          const { data: partyData, error: partyError } = await supabase
            .from('parties')
            .select('name, gst_number')
            .eq('id', billData.party_id)
            .single()

          if (!partyError && partyData) {
            console.log('✅ EDIT PAGE: Party data fetched:', partyData)
            setPartyName(partyData.name)
            setPartyGst(partyData.gst_number || '')
          } else {
            console.error('❌ EDIT PAGE: Failed to fetch party data:', partyError)
          }
        }

        // Populate form with existing bill data
        console.log('🔄 EDIT PAGE: Populating form with bill data...')
        setBillType(billData.bill_type)
        setBillDate(billData.bill_date)
        setVehicleNumber(billData.vehicle_number || '')
        setBalance(billData.balance ? billData.balance.toString() : '')
        setBankName(billData.bank_name || '')
        setBankIFSC(billData.bank_ifsc || '')
        setBankAccount(billData.bank_account || '')
        setNotes(billData.notes || '')
        setBillNumber(billData.bill_number)

        // Populate GST fields
        setIsGstEnabled(billData.is_gst_enabled || false)
        setCgstPercent(billData.cgst_percent || 0)
        setIgstPercent(billData.igst_percent || 0)

        // Don't set totalAmount from database - calculate from items instead
        setTotalAmountWords(billData.total_amount_words || '')

        console.log('✅ EDIT PAGE: Form populated with bill data')

        // Fetch bill items
        const { data: itemsData, error: itemsError } = await supabase
          .from('bill_items')
          .select('*')
          .eq('bill_id', billId)
          .order('id', { ascending: true })

        if (itemsError) {
          console.error('Items fetch error:', itemsError)
        }

        console.log('Items data fetched successfully:', itemsData?.length || 0, 'items')
        setItems(itemsData || [])

        // Recalculate total after loading items (don't use database total)
        const calculatedTotal = (itemsData || []).reduce((sum, item) => sum + (item.amount || 0), 0)
        setTotalAmount(calculatedTotal)

        // Recalculate amount in words
        const finalTotal = calculatedTotal + (billData.balance || 0)
        if (finalTotal > 0) {
          setTotalAmountWords(numberToWords(finalTotal))
        }
      }

      await Promise.race([fetchPromise(), timeoutPromise])
      console.log('Bill data loading completed successfully')
    } catch (error) {
      console.error('Error fetching bill data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setFetchError(errorMessage)
      toast.error(`Failed to load bill: ${errorMessage}`)
    } finally {
      setFetchLoading(false)
    }
  }

  // Auto-calculate total amount when items or balance change
  useEffect(() => {
    const calculatedTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0)
    console.log('Recalculating total from items:', items.length, 'items, total:', calculatedTotal)
    setTotalAmount(calculatedTotal)

    // Calculate GST if enabled
    if (billType === 'pakki' && isGstEnabled) {
      const cgstAmount = (calculatedTotal * cgstPercent) / 100
      const igstAmount = (calculatedTotal * igstPercent) / 100
      const calculatedGstTotal = cgstAmount + igstAmount
      setGstTotal(calculatedGstTotal)

      const balanceAmount = balance ? parseFloat(balance) : 0
      const calculatedGrandTotal = calculatedTotal + calculatedGstTotal + balanceAmount
      setGrandTotal(calculatedGrandTotal)

      if (calculatedGrandTotal > 0) {
        const words = numberToWords(calculatedGrandTotal)
        console.log('Generated amount in words:', words)
        setTotalAmountWords(words)
      }
    } else {
      setGstTotal(0)
      const balanceAmount = balance ? parseFloat(balance) : 0
      const calculatedGrandTotal = calculatedTotal + balanceAmount
      setGrandTotal(calculatedGrandTotal)

      if (calculatedGrandTotal > 0) {
        const words = numberToWords(calculatedGrandTotal)
        console.log('Generated amount in words:', words)
        setTotalAmountWords(words)
      }
    }
  }, [items, balance, billType, isGstEnabled, cgstPercent, igstPercent])

  const handleAddItem = () => {
    setItems([...items, {}])
  }

  const handleUpdateItem = (index: number, updatedItem: Partial<BillItem>) => {
    const newItems = [...items]
    newItems[index] = updatedItem
    setItems(newItems)
  }

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
  }

  const handleSaveBill = async () => {
    if (!partyName.trim()) {
      toast.error('Please enter party name')
      return
    }

    if (items.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    setLoading(true)
    console.log('Starting bill update process...')

    try {
      console.log('Updating bill record...')
      // Update bill
      const billUpdateData = {
        bill_type: billType,
        bill_date: billDate,
        total_amount: totalAmount,
        total_amount_words: totalAmountWords,
        vehicle_number: vehicleNumber || null,
        balance: balance ? parseFloat(balance) : null,
        bank_name: billType === 'pakki' ? bankName : null,
        bank_ifsc: billType === 'pakki' ? bankIFSC : null,
        bank_account: billType === 'pakki' ? bankAccount : null,
        // GST fields
        is_gst_enabled: isGstEnabled,
        company_gst_number: billType === 'pakki' ? COMPANY_INFO.gst : null,
        party_gst_number: partyGst || null,
        cgst_percent: isGstEnabled ? cgstPercent : 0,
        igst_percent: isGstEnabled ? igstPercent : 0,
        sgst_percent: 0, // Not used in current implementation
        cgst_amount: isGstEnabled ? (totalAmount * cgstPercent / 100) : 0,
        igst_amount: isGstEnabled ? (totalAmount * igstPercent / 100) : 0,
        sgst_amount: 0, // Not used in current implementation
        gst_total: gstTotal
      }

      console.log('Bill update data:', billUpdateData)

      const { data: billUpdateResult, error: billError } = await supabase
        .from('bills')
        .update(billUpdateData)
        .eq('id', billId)
        .select()

      if (billError) {
        console.error('Bill update error:', billError)
        throw new Error(`Failed to update bill: ${billError.message}`)
      }

      console.log('Bill updated successfully:', billUpdateResult)

      // Delete existing bill items with proper error handling
      console.log('Deleting existing bill items...')
      const { error: deleteError } = await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', billId)

      if (deleteError) {
        console.error('Bill items delete error:', deleteError)
        throw new Error(`Failed to delete existing items: ${deleteError.message}`)
      }

      console.log('Existing items deleted successfully')

      // Insert updated bill items
      if (items.length > 0) {
        console.log('Inserting updated bill items...')
        const itemsToInsert = items.map(item => ({
          bill_id: billId,
          particular: item.particular || '',
          qty_bags: item.qty_bags || null,
          weight_kg: item.weight_kg || null,
          rate: item.rate || null,
          amount: item.amount || null
        }))

        console.log('Items to insert:', itemsToInsert)

        const { data: itemsInsertResult, error: itemsError } = await supabase
          .from('bill_items')
          .insert(itemsToInsert)
          .select()

        if (itemsError) {
          console.error('Bill items insert error:', itemsError)
          throw new Error(`Failed to insert bill items: ${itemsError.message}`)
        }

        console.log('Bill items inserted successfully:', itemsInsertResult)
      }

      console.log('Bill update process completed successfully!')
      toast.success('Bill updated successfully! Redirecting to view...')

      console.log('🚀 REDIRECTING BACK TO VIEW PAGE...')
      const viewUrl = `/bills/${billId}`
      console.log('Redirecting to view:', viewUrl)

      // Redirect immediately back to bill detail to see the updated bill
      window.location.href = viewUrl

    } catch (error) {
      console.error('Error updating bill:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to update bill: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-muted-foreground">Loading bill data...</p>
              <p className="text-sm text-gray-500">Bill ID: {billId}</p>
              <p className="text-xs text-gray-400">This may take a few seconds</p>
              <Link href={`/bills/${billId}`}>
                <Button variant="outline" size="sm">
                  Back to Bill View
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (fetchError) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="text-red-500 text-6xl">⚠️</div>
              <h2 className="text-xl font-semibold text-red-600">Failed to Load Bill</h2>
              <p className="text-muted-foreground max-w-md">{fetchError}</p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => window.location.reload()} variant="outline">
                  Retry
                </Button>
                <Link href="/bills">
                  <Button>Back to Bills</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container py-6 md:py-8">
        {/* Responsive Back Button */}
        <div className="mb-4 md:mb-6">
          <Link href={`/bills/${billId}`}>
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4" />
              Back to Bill View
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
          {/* Form Section */}
          <div className="space-y-4 md:space-y-6">
            <Card className="bg-white shadow-md rounded-lg">
              <CardHeader className="pb-4 md:pb-6">
                <CardTitle className="text-lg md:text-xl">Edit Bill</CardTitle>
                <CardDescription className="text-sm md:text-base">Update bill details below</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8">

                {/* STEP 1: BILL TYPE & DATE */}
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                    Basic Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm md:text-base font-medium">Bill Type</Label>
                      <Select value={billType} onValueChange={(value) => setBillType(value as 'kacchi' | 'pakki')}>
                        <SelectTrigger className="w-full" suppressHydrationWarning>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kacchi">Kacchi (Cash)</SelectItem>
                          <SelectItem value="pakki">Pakki (Credit/GST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm md:text-base font-medium">Bill Date</Label>
                      <Input
                        type="date"
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                        className="text-sm md:text-base"
                      />
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Bill Number: <span className="font-semibold text-blue-700">{billType === 'kacchi' ? 'K' : 'P'}{String(billNumber || 0).padStart(3, '0')}</span>
                  </div>
                </div>

                {/* STEP 2: PARTY INFORMATION */}
                <div className="space-y-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                    <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                    Party Information
                  </h3>

                  <div className="space-y-2">
                    <Label className="text-sm md:text-base font-medium">Party Name (M/s.)</Label>
                    <Input
                      placeholder="Enter customer/party name"
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      className="text-sm md:text-base"
                    />
                  </div>

                  {partyGst && billType === 'pakki' && (
                    <div className="text-sm text-green-700 bg-green-100 p-2 rounded">
                      Party GST: <span className="font-semibold">{partyGst}</span>
                    </div>
                  )}
                </div>

                {/* STEP 3: VEHICLE & LOGISTICS */}
                <div className="space-y-4 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                  <h3 className="text-lg font-semibold text-yellow-900 flex items-center gap-2">
                    <span className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                    Vehicle & Logistics
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm md:text-base font-medium">Vehicle Number</Label>
                      <Input
                        placeholder="e.g., MH-12-AB-1234"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        className="text-sm md:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm md:text-base font-medium">Balance Amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={balance}
                        onChange={(e) => setBalance(e.target.value)}
                        step="0.01"
                        className="text-sm md:text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* STEP 4: ITEMS (MAIN CONTENT) */}
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                    <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                    Items & Products
                  </h3>

                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-sm md:text-base font-semibold">Bill Items</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                      className="text-xs md:text-sm"
                    >
                      + Add Item
                    </Button>
                  </div>

                  <div className="space-y-3 md:space-y-4 max-h-80 md:max-h-96 overflow-y-auto border rounded-md p-3 md:p-4 bg-white">
                    {items.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground text-sm mb-3">No items added yet</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddItem}
                        >
                          Add First Item
                        </Button>
                      </div>
                    ) : (
                      items.map((item, index) => (
                        <BillItemForm
                          key={index}
                          index={index}
                          item={item}
                          onUpdate={(updatedItem) => handleUpdateItem(index, updatedItem)}
                          onRemove={() => handleRemoveItem(index)}
                        />
                      ))
                    )}
                  </div>

                  {/* Items Summary */}
                  <div className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Items Sub Total:</span>
                      <span className="text-lg font-bold text-purple-600">₹{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* STEP 5: GST SETTINGS (PAKKI ONLY) */}
                {billType === 'pakki' && (
                  <div className="space-y-4 p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
                    <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                      <span className="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</span>
                      GST Settings
                    </h3>

                    <div className="space-y-3">
                      <div className="bg-white p-3 rounded border">
                        <Label className="text-sm font-medium">Company GST Number</Label>
                        <Input
                          value={COMPANY_INFO.gst}
                          disabled
                          className="bg-muted text-sm mt-1"
                        />
                      </div>

                      <GSTToggle
                        isEnabled={isGstEnabled}
                        onToggle={setIsGstEnabled}
                        cgstPercent={cgstPercent}
                        igstPercent={igstPercent}
                        onPercentChange={(type: 'cgst' | 'igst', value: number) => {
                          if (type === 'cgst') setCgstPercent(value)
                          else if (type === 'igst') setIgstPercent(value)
                        }}
                        itemsTotal={totalAmount}
                        partyGst={partyGst}
                        onPartyGstChange={(value: string) => setPartyGst(value)}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 6: FINAL REVIEW & SAVE */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border-l-4 border-gray-500">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="bg-gray-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">6</span>
                    Final Review
                  </h3>

                  {/* Totals Summary */}
                  <div className="bg-white p-4 rounded-lg border space-y-3">
                    <Label className="text-sm md:text-base font-semibold">Bill Summary</Label>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Items Total:</span>
                        <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                      </div>

                      {billType === 'pakki' && isGstEnabled && (
                        <div className="flex justify-between">
                          <span>GST Total:</span>
                          <span className="font-medium text-indigo-600">₹{gstTotal.toFixed(2)}</span>
                        </div>
                      )}

                      {balance && parseFloat(balance) !== 0 && (
                        <div className="flex justify-between">
                          <span>Balance:</span>
                          <span className="font-medium text-orange-600">₹{parseFloat(balance).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="border-t pt-2 flex justify-between text-base font-bold">
                        <span>Grand Total:</span>
                        <span className="text-green-600">₹{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-sm md:text-base font-medium">Amount in Words</Label>
                      <Input
                        placeholder="e.g., Sixty-Five Thousand Only"
                        value={totalAmountWords}
                        onChange={(e) => setTotalAmountWords(e.target.value)}
                        className="text-sm md:text-base"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* UPDATE BILL BUTTON */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSaveBill}
                    disabled={loading}
                    className="w-full text-base font-semibold py-3"
                  >
                    {loading ? 'Updating Bill...' : 'Update Bill'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <div className="mt-6 md:mt-0">
            <BillPreview
              billType={billType}
              billNumber={`${billType === 'kacchi' ? 'K' : 'P'}${String(billNumber || 0).padStart(3, '0')}`}
              billDate={billDate}
              partyName={partyName}
              partyGst={isGstEnabled ? partyGst : undefined}
              vehicleNumber={vehicleNumber}
              balance={balance && parseFloat(balance) > 0 ? parseFloat(balance) : undefined}
              bankName={billType === 'pakki' ? bankName : undefined}
              bankIFSC={billType === 'pakki' ? bankIFSC : undefined}
              bankAccount={billType === 'pakki' ? bankAccount : undefined}
              showBankDetails={showBankDetails}
              items={items}
              itemsTotal={totalAmount}
              gstEnabled={isGstEnabled}
              cgstPercent={isGstEnabled ? cgstPercent : 0}
              igstPercent={isGstEnabled ? igstPercent : 0}
              gstTotal={gstTotal}
              grandTotal={grandTotal}
              totalAmountWords={totalAmountWords}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}