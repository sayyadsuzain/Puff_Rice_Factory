'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, Bill, BillItem, FIXED_PRODUCTS, COMPANY_INFO, SavedBankDetail, numberToWords } from '@/lib/supabase'
import BillPreview from '@/components/bill-preview'
import BillItemForm from '@/components/bill-item-form'
import { PartySearch } from '@/components/party-search'
import { GSTToggle } from '@/components/gst-toggle'
import { ProtectedRoute } from '@/components/protected-route'

export const dynamic = 'force-dynamic'

export default function CreateBillPage() {
  const router = useRouter()
  // Bill Type & Header
  const [billType, setBillType] = useState<'kacchi' | 'pakki'>('kacchi')
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])
  const [nextBillNumber, setNextBillNumber] = useState<string | null>(null)

  // Party Information
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null)
  const [partyName, setPartyName] = useState('')
  const [partyGst, setPartyGst] = useState('')

  // Vehicle & Balance
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [balance, setBalance] = useState('')

  // GST Settings
  const [isGstEnabled, setIsGstEnabled] = useState(false)
  const [cgstPercent, setCgstPercent] = useState(0)
  const [igstPercent, setIgstPercent] = useState(0)

  // Bank Details
  const [bankName, setBankName] = useState('KARNATAKA BANK LTD.')
  const [bankIFSC, setBankIFSC] = useState('KARB0000729')
  const [bankAccount, setBankAccount] = useState('7292000100047001')
  const [showBankDetails, setShowBankDetails] = useState(true)
  const [savedBankDetails, setSavedBankDetails] = useState<SavedBankDetail[]>([])

  // Items & Calculations
  const [items, setItems] = useState<Partial<BillItem>[]>([])
  const [itemsTotal, setItemsTotal] = useState(0)
  const [gstTotal, setGstTotal] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)
  const [totalAmountWords, setTotalAmountWords] = useState('')

  // Loading state
  const [loading, setLoading] = useState(false)

  // Fetch initial data
  useEffect(() => {
    console.log('CreateBillPage mounted, fetching initial data...')
    fetchNextBillNumber()
    fetchSavedBankDetails()

    // Lock body and html scroll on mount
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.height = '100%'
    document.documentElement.style.height = '100%'

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
      document.body.style.height = ''
      document.documentElement.style.height = ''
    }
  }, [])

  const getFinancialYear = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1 // 1-12
    if (month >= 4) {
      return `${year}-${(year + 1) % 100}` // 2025-26
    } else {
      return `${year - 1}-${year % 100}` // 2024-25
    }
  }

  // Auto-calculate totals when items or GST change
  useEffect(() => {
    const calculatedItemsTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0)
    setItemsTotal(calculatedItemsTotal)

    if (billType === 'pakki' && isGstEnabled) {
      const cgstAmount = (calculatedItemsTotal * cgstPercent) / 100
      const igstAmount = (calculatedItemsTotal * igstPercent) / 100
      const calculatedGstTotal = cgstAmount + igstAmount
      setGstTotal(calculatedGstTotal)

      const balanceAmount = balance ? parseFloat(balance) : 0
      const calculatedGrandTotal = calculatedItemsTotal + calculatedGstTotal + balanceAmount
      setGrandTotal(calculatedGrandTotal)

      if (calculatedGrandTotal > 0) {
        setTotalAmountWords(numberToWords(calculatedGrandTotal))
      }
    } else {
      const balanceAmount = balance ? parseFloat(balance) : 0
      const calculatedGrandTotal = calculatedItemsTotal + balanceAmount
      setGrandTotal(calculatedGrandTotal)
      setGstTotal(0)

      if (calculatedGrandTotal > 0) {
        setTotalAmountWords(numberToWords(calculatedGrandTotal))
      }
    }
  }, [items, isGstEnabled, cgstPercent, igstPercent, balance, billType])

  const fetchNextBillNumber = async () => {
    try {
      const fy = getFinancialYear(new Date())
      const prefix = billType === 'pakki' ? 'P' : 'K'
      const pattern = `${prefix}/${fy}/%`
      const { data } = await supabase
        .from('bills')
        .select('bill_number')
        .ilike('bill_number', pattern)
        .order('bill_number', { ascending: false })
        .limit(1)

      let runningNumber = 1
      if (data && data.length > 0) {
        const lastBill = data[0].bill_number
        const parts = lastBill.split('/')
        const numStr = parts[2]
        runningNumber = parseInt(numStr, 10) + 1
      }
      const displayNumber = `${prefix}/${fy}/${runningNumber.toString().padStart(3, '0')}`
      setNextBillNumber(displayNumber)
    } catch (error) {
      // Use fallback if query fails
      const fy = getFinancialYear(new Date())
      const prefix = billType === 'pakki' ? 'P' : 'K'
      const displayNumber = `${prefix}/${fy}/001`
      setNextBillNumber(displayNumber)
    }
  }

  const fetchSavedBankDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_bank_details')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setSavedBankDetails(data || [])
    } catch (error) {
      console.error('Error fetching saved bank details:', error)
    }
  }

  const handleBillTypeChange = (value: 'kacchi' | 'pakki') => {
    setBillType(value)
    fetchNextBillNumber()

    // Reset GST when switching to Kacchi
    if (value === 'kacchi') {
      setIsGstEnabled(false)
    }
  }

  const handlePartySelect = (partyId: number | null, name: string) => {
    setSelectedPartyId(partyId)
    setPartyName(name)

    // Fetch party GST if party is selected
    if (partyId) {
      supabase
        .from('parties')
        .select('gst_number')
        .eq('id', partyId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setPartyGst(data.gst_number || '')
          }
        })
    } else {
      setPartyGst('')
    }
  }

  const handleSaveBankDetails = async () => {
    if (!bankName.trim() || !bankIFSC.trim() || !bankAccount.trim()) {
      toast.error('Please fill all bank details before saving')
      return
    }

    try {
      // Check if this bank combination already exists
      const { data: existingBanks } = await supabase
        .from('saved_bank_details')
        .select('id')
        .eq('bank_name', bankName.trim())
        .eq('bank_ifsc', bankIFSC.trim())
        .eq('bank_account', bankAccount.trim())

      if (existingBanks && existingBanks.length > 0) {
        toast.error('This bank details already exists in saved banks')
        return
      }

      // Save bank details to dedicated table
      const { error: saveError } = await supabase
        .from('saved_bank_details')
        .insert([
          {
            bank_name: bankName.trim(),
            bank_ifsc: bankIFSC.trim(),
            bank_account: bankAccount.trim()
          }
        ])

      if (saveError) throw saveError

      // Refresh saved bank details
      await fetchSavedBankDetails()
      toast.success('Bank details saved successfully!')
    } catch (error) {
      console.error('Error saving bank details:', error)
      toast.error('Failed to save bank details')
    }
  }

  const loadBankDetails = (bank: SavedBankDetail) => {
    setBankName(bank.bank_name)
    setBankIFSC(bank.bank_ifsc)
    setBankAccount(bank.bank_account)
  }

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
    if (!selectedPartyId || !partyName.trim()) {
      toast.error('Please select a party')
      return
    }

    if (items.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.particular?.trim()) {
        toast.error(`Item ${i + 1}: Please enter a product name`)
        return
      }

      const isPaddy = item.particular?.toLowerCase().includes('paddy')
      if (isPaddy && (!item.weight_kg || item.weight_kg <= 0)) {
        toast.error(`Item ${i + 1} (${item.particular}): Weight is required for paddy`)
        return
      }

      if (!item.rate || item.rate <= 0) {
        toast.error(`Item ${i + 1} (${item.particular}): Please enter a valid rate`)
        return
      }

      if (!item.amount || item.amount <= 0) {
        toast.error(`Item ${i + 1} (${item.particular}): Amount calculation failed. Please check your inputs.`)
        return
      }
    }

    if (billType === 'pakki' && isGstEnabled && !COMPANY_INFO.gst) {
      toast.error('Company GST number is required for GST bills')
      return
    }

    console.log('Starting bill creation process...')
    console.log('Bill type:', billType)
    console.log('Items count:', items.length)
    console.log('Selected party:', selectedPartyId, partyName)
    setLoading(true)
    let billId: number | null = null

    try {
      // Generate fresh bill number before saving
      let displayNumber: string
      try {
        const fy = getFinancialYear(new Date())
        const prefix = billType === 'pakki' ? 'P' : 'K'
        const pattern = `${prefix}/${fy}/%`
        const { data } = await supabase
          .from('bills')
          .select('bill_number')
          .ilike('bill_number', pattern)
          .order('bill_number', { ascending: false })
          .limit(1)

        let runningNumber = 1
        if (data && data.length > 0) {
          const lastBill = data[0].bill_number
          const parts = lastBill.split('/')
          const numStr = parts[2]
          runningNumber = parseInt(numStr, 10) + 1
        }
        displayNumber = `${prefix}/${fy}/${runningNumber.toString().padStart(3, '0')}`
      } catch (error) {
        // Use fallback if query fails
        const fy = getFinancialYear(new Date())
        const prefix = billType === 'pakki' ? 'P' : 'K'
        displayNumber = `${prefix}/${fy}/001`
      }

      const billData = {
        bill_number: displayNumber, // Store the display number
        bill_type: billType,
        party_id: selectedPartyId,
        bill_date: billDate,
        total_amount: itemsTotal, // Store only items total, not grand total
        total_amount_words: totalAmountWords, // This should be for the grand total
        vehicle_number: vehicleNumber || null,
        balance: balance ? parseFloat(balance) : 0,
        // GST fields
        is_gst_enabled: isGstEnabled,
        company_gst_number: isGstEnabled ? COMPANY_INFO.gst : null,
        party_gst_number: isGstEnabled ? partyGst : null,
        cgst_percent: isGstEnabled ? cgstPercent : 0,
        igst_percent: isGstEnabled ? igstPercent : 0,
        sgst_percent: 0, // Always 0 since we removed SGST
        cgst_amount: isGstEnabled ? (itemsTotal * cgstPercent) / 100 : 0,
        igst_amount: isGstEnabled ? (itemsTotal * igstPercent) / 100 : 0,
        sgst_amount: 0, // Always 0 since we removed SGST
        gst_total: gstTotal,
        // Bank details
        bank_name: billType === 'pakki' ? bankName : null,
        bank_ifsc: billType === 'pakki' ? bankIFSC : null,
        bank_account: billType === 'pakki' ? bankAccount : null,
        // CA reporting fields
        financial_year: getFinancialYear(new Date(billDate)),
        month_number: new Date(billDate).getMonth() + 1,
        taxable_amount: itemsTotal,
        net_total: grandTotal
      }

      const { data: billResult, error: billError } = await supabase
        .from('bills')
        .insert([billData])
        .select()

      if (billError) {
        console.error('Bill insert error:', billError)
        console.error('Bill data being inserted:', billData)
        throw billError
      }

      billId = billResult[0].id
      console.log('Bill created successfully with ID:', billId)

      // Create bill items
      const itemsToInsert = items.map(item => ({
        bill_id: billId,
        particular: item.particular || '',
        qty_bags: item.qty_bags || null,
        weight_kg: item.weight_kg || null,
        rate: item.rate || null,
        amount: item.amount || null
      }))

      console.log('Items to insert:', itemsToInsert)

      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Items insert error:', itemsError)
        throw itemsError
      }

      console.log('Bill items created successfully')

      toast.success(`Bill created successfully! (${billType})`)

      console.log('🎉 BILL CREATED - About to redirect...')
      console.log('Bill ID:', billId)
      console.log('Redirect URL:', `/bills/${billId}`)

      // Safety check - ensure billId exists
      if (!billId) {
        console.error('❌ ERROR: billId is undefined/null!')
        toast.error('Bill created but redirect failed. Please navigate manually.')
        return
      }

      // Add a small delay to show the success message before redirect
      setTimeout(() => {
        console.log('🔄 REDIRECTING NOW to:', `/bills/${billId}`)
        router.push(`/bills/${billId}`)
      }, 1500)
    } catch (error) {
      console.error('Error creating bill:', error)
      toast.error('Failed to create bill')

      // If bill was created but items failed, clean up
      if (billId) {
        try {
          await supabase.from('bills').delete().eq('id', billId)
        } catch (cleanupError) {
          console.error('Failed to cleanup:', cleanupError)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  console.log('Rendering CreateBillPage...')

  return (
    <ProtectedRoute>
      <div className="container py-6 md:py-8">
        {/* Responsive Back Button */}
        <div className="mb-4 md:mb-6">
          <Link href="/bills">
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4" />
              Back to Bills
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 xl:h-[calc(100vh-180px)] xl:overflow-hidden px-1">
          {/* Form Section */}
          <div className="space-y-4 md:space-y-6 xl:h-full xl:overflow-y-auto xl:pr-4 custom-scrollbar">
            <Card className="shadow-sm">
              <CardHeader className="pb-4 md:pb-6">
                <CardTitle className="text-lg md:text-xl">Create New Bill</CardTitle>
                <CardDescription className="text-sm md:text-base">Fill in the bill details below</CardDescription>
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
                      <Select value={billType} onValueChange={handleBillTypeChange}>
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
                    Bill No. will be auto-generated: <span className="font-semibold text-blue-700">{nextBillNumber}</span>
                  </div>
                </div>

                {/* STEP 2: PARTY SELECTION */}
                <div className="space-y-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                    <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                    Party Information
                  </h3>

                  <PartySearch
                    value={partyName}
                    onChange={handlePartySelect}
                    required
                  />

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
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
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
                      <span className="text-lg font-bold text-purple-600">₹{itemsTotal.toFixed(2)}</span>
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
                        onPercentChange={(type, value) => {
                          if (type === 'cgst') setCgstPercent(value)
                          else if (type === 'igst') setIgstPercent(value)
                        }}
                        itemsTotal={itemsTotal}
                        partyGst={partyGst}
                        onPartyGstChange={setPartyGst}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 6: PAYMENT & BANK DETAILS (PAKKI ONLY) */}
                {billType === 'pakki' && (
                  <div className="space-y-4 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                    <h3 className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                      <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">6</span>
                      Payment Details
                    </h3>

                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <Label className="text-sm md:text-base font-semibold">Bank Information</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowBankDetails(!showBankDetails)}
                            className="text-xs md:text-sm"
                          >
                            {showBankDetails ? 'Hide' : 'Show'} Details
                          </Button>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={handleSaveBankDetails}
                            className="text-xs md:text-sm"
                          >
                            + Save Bank
                          </Button>
                        </div>
                      </div>

                      {showBankDetails && (
                        <div className="space-y-4 p-4 border rounded-lg bg-white">
                          {savedBankDetails.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-xs md:text-sm font-medium">Quick Select</Label>
                              <Select onValueChange={(value) => loadBankDetails(savedBankDetails[parseInt(value)])}>
                                <SelectTrigger className="text-sm md:text-base" suppressHydrationWarning>
                                  <SelectValue placeholder="Choose from saved banks..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {savedBankDetails.map((bank, index) => (
                                    <SelectItem key={bank.id || index} value={index.toString()}>
                                      {bank.bank_name} - {bank.bank_account}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs md:text-sm font-medium">Bank Name</Label>
                              <Input
                                placeholder="e.g., KARNATAKA BANK LTD."
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                className="text-sm md:text-base"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs md:text-sm font-medium">IFSC Code</Label>
                              <Input
                                placeholder="e.g., KARB0000729"
                                value={bankIFSC}
                                onChange={(e) => setBankIFSC(e.target.value)}
                                className="text-sm md:text-base"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs md:text-sm font-medium">Account Number</Label>
                              <Input
                                placeholder="e.g., 7292000100047001"
                                value={bankAccount}
                                onChange={(e) => setBankAccount(e.target.value)}
                                className="text-sm md:text-base"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 7: FINAL REVIEW */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border-l-4 border-gray-500">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="bg-gray-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">7</span>
                    Final Review
                  </h3>

                  {/* Totals Summary */}
                  <div className="bg-white p-4 rounded-lg border space-y-3">
                    <Label className="text-sm md:text-base font-semibold">Bill Summary</Label>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Items Total:</span>
                        <span className="font-medium">₹{itemsTotal.toFixed(2)}</span>
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
                        placeholder="Auto-generated from grand total"
                        value={totalAmountWords}
                        onChange={(e) => setTotalAmountWords(e.target.value)}
                        className="text-sm md:text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* CREATE BILL BUTTON */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSaveBill}
                    disabled={loading || !partyName.trim() || items.length === 0}
                    className="w-full text-base font-semibold py-3"
                    size="lg"
                  >
                    {loading ? 'Creating Bill...' : `Create ${billType === 'pakki' ? 'Pakki' : 'Kacchi'} Bill`}
                  </Button>

                  {(!partyName.trim() || items.length === 0) && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      {!partyName.trim() ? 'Select a party' : 'Add at least one item'} to create bill
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <div className="mt-6 xl:mt-0 xl:h-full xl:flex xl:flex-col xl:overflow-hidden bg-gray-50/30 rounded-xl border">
            <div className="p-2 border-b bg-gray-100/50 text-xs font-bold text-gray-500 uppercase flex justify-between items-center">
              <span>Live Preview</span>
              <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Auto-scaled to fit</span>
            </div>
            <div className="flex-1 xl:overflow-hidden">
            <BillPreview
              billType={billType}
              billNumber={nextBillNumber || ''}
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
              itemsTotal={itemsTotal}
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
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </ProtectedRoute>
  )
}
