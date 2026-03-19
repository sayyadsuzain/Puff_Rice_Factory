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
import { ArrowLeft, Plus, Trash2, Star } from 'lucide-react'
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
  const [bankBranch, setBankBranch] = useState('SANGLI BRANCH')
  const [showBankDetails, setShowBankDetails] = useState(false)
  const [savedBankDetails, setSavedBankDetails] = useState<SavedBankDetail[]>([])
  const [defaultBankId, setDefaultBankId] = useState<number | null>(null)

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
    fetchSavedBankDetails().then((banks: SavedBankDetail[]) => {
      // Check for default bank in localStorage
      const savedDefaultId = localStorage.getItem('default_bank_id')
      if (savedDefaultId && banks && banks.length > 0) {
        const id = parseInt(savedDefaultId)
        setDefaultBankId(id)
        const defaultBank = banks.find(b => b.id === id)
        if (defaultBank) {
          loadBankDetails(defaultBank)
        }
      }
    })
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

  const fetchNextBillNumber = async (typeOverride?: 'kacchi' | 'pakki') => {
    const effectiveType = typeOverride ?? billType
    try {
      const fy = getFinancialYear(new Date())
      const prefix = effectiveType === 'pakki' ? 'P' : 'K'
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
      const prefix = effectiveType === 'pakki' ? 'P' : 'K'
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
      return data || []
    } catch (error) {
      console.error('Error fetching saved bank details:', error)
      return []
    }
  }

  const handleBillTypeChange = (value: 'kacchi' | 'pakki') => {
    setBillType(value)
    fetchNextBillNumber(value)

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
            bank_account: bankAccount.trim(),
            notes: '',
            bank_branch: bankBranch.trim()
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
    setBankBranch(bank.bank_branch || 'SANGLI BRANCH')
  }

  const handleDeleteBankDetail = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bank profile?')) return

    try {
      const { error } = await supabase
        .from('saved_bank_details')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Bank detail deleted')
      fetchSavedBankDetails()
      
      // Clear default if deleted
      if (defaultBankId === id) {
        setDefaultBankId(null)
        localStorage.removeItem('default_bank_id')
      }
    } catch (error) {
      console.error('Error deleting bank:', error)
      toast.error('Failed to delete bank detail')
    }
  }

  const handleSetDefaultBankDetail = (bank: SavedBankDetail) => {
    if (defaultBankId === bank.id) {
      // Unset default
      setDefaultBankId(null)
      localStorage.removeItem('default_bank_id')
      toast.success('Default bank removed')
    } else {
      // Set default
      setDefaultBankId(bank.id!)
      localStorage.setItem('default_bank_id', bank.id!.toString())
      toast.success(`Set ${bank.bank_name} as default`)
    }
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

  const handleSaveBill = async (e?: React.FormEvent) => {
    e?.preventDefault()
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

      if (!billResult || billResult.length === 0) {
        console.error('❌ ERROR: Bill insert succeeded but no result returned!')
        throw new Error('No bill data returned after insert')
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

      // Redirect to view page
      router.refresh()
      router.push(`/bills/${billId}`)
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
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-4 md:pb-6 bg-gray-50/50 rounded-t-xl">
                <CardTitle className="text-xl md:text-2xl font-black text-gray-900">Create New Bill</CardTitle>
                <CardDescription className="text-sm md:text-base font-medium">Step-by-step bill generation engine</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 md:p-8">
                <form onSubmit={handleSaveBill} className="space-y-8">
                  {/* STEP 1: BILL TYPE & DATE */}
                  <div className="space-y-5 p-4 sm:p-5 bg-blue-50/50 rounded-xl border border-blue-100 shadow-sm">
                    <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                       <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">1</span>
                       Basic Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 overflow-hidden">
                      <div className="space-y-2 min-w-0">
                        <Label className="text-sm font-bold text-gray-700">Bill Type</Label>
                        <Select value={billType} onValueChange={handleBillTypeChange}>
                          <SelectTrigger className="w-full h-11 bg-white" suppressHydrationWarning>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kacchi">Kacchi (Cash/Rough)</SelectItem>
                            <SelectItem value="pakki">Pakki (GST Invoice)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 min-w-0">
                        <Label className="text-sm font-bold text-gray-700">Bill Date</Label>
                        <Input
                          type="date"
                          value={billDate}
                          onChange={(e) => setBillDate(e.target.value)}
                          className="w-full h-11 bg-white px-4 font-medium border-gray-200 focus:ring-blue-500/20"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-white/80 rounded border border-blue-100 flex items-center justify-between">
                       <span className="text-xs font-bold text-blue-800 uppercase tracking-tighter">Next Bill Number:</span>
                       <span className="font-mono text-sm font-black text-blue-900">{nextBillNumber || 'Fetching...'}</span>
                    </div>
                  </div>

                  {/* STEP 2: PARTY SELECTION */}
                  <div className="space-y-5 p-4 sm:p-5 bg-emerald-50/50 rounded-xl border border-emerald-100 shadow-sm">
                    <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                      <span className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">2</span>
                      Party Information
                    </h3>
                    
                    <PartySearch
                      value={partyName}
                      onChange={handlePartySelect}
                      placeholder="Start typing party name..."
                      required
                    />

                    {partyGst && billType === 'pakki' && (
                      <div className="text-xs font-bold text-emerald-700 bg-white p-2 rounded border border-emerald-100 flex items-center gap-2">
                        <span className="opacity-60 uppercase">GSTIN:</span> 
                        <span className="font-mono">{partyGst}</span>
                      </div>
                    )}
                  </div>

                  {/* STEP 3: VEHICLE & LOGISTICS */}
                  <div className="space-y-5 p-4 sm:p-5 bg-amber-50/50 rounded-xl border border-amber-100 shadow-sm">
                    <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                      <span className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">3</span>
                      Vehicle & Logistics
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Vehicle Number</Label>
                        <Input
                          placeholder="MH-12-XX-0000"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                          className="h-11 bg-white font-mono uppercase font-bold"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700">Old Balance (₹)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={balance}
                          onChange={(e) => setBalance(e.target.value)}
                          step="0.01"
                          className="h-11 bg-white font-black text-amber-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* STEP 4: ITEMS */}
                  <div className="space-y-5 p-4 sm:p-5 bg-purple-50/50 rounded-xl border border-purple-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                       <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">4</span>
                        Items & Products
                      </h3>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={handleAddItem}
                        className="h-8 text-xs bg-purple-700 hover:bg-purple-800 font-bold"
                      >
                        + Add Product
                      </Button>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto border-2 border-dashed border-purple-200 rounded-xl p-3 sm:p-4 bg-white/50 custom-scrollbar">
                      {items.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                             <Plus className="h-6 w-6 text-purple-600" />
                          </div>
                          <p className="text-purple-900 font-bold text-sm">No items added</p>
                          <p className="text-xs text-purple-500 mb-4">Start by adding a product to this bill</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddItem}
                            className="border-purple-200 text-purple-700 hover:bg-purple-50"
                          >
                            Add Your First Item
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

                    <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex justify-between items-center">
                       <span className="text-sm font-black text-purple-900 uppercase">Items Sub-Total:</span>
                       <span className="text-xl sm:text-2xl font-black text-purple-700">₹{itemsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* STEP 5: GST (PAKKI ONLY) */}
                  {billType === 'pakki' && (
                    <div className="space-y-5 p-4 sm:p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm">
                      <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                        <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">5</span>
                        GST Settings
                      </h3>

                      <div className="space-y-4">
                        {isGstEnabled && (
                          <div className="bg-white/80 p-3 rounded-lg border border-indigo-100">
                            <Label className="text-xs font-bold text-indigo-700 uppercase mb-1 block">Your GST Number</Label>
                            <p className="font-mono text-sm font-bold text-gray-800">{COMPANY_INFO.gst}</p>
                          </div>
                        )}

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

                  {/* STEP 6: BANK (PAKKI ONLY) */}
                  {billType === 'pakki' && (
                    <div className="space-y-5 p-4 sm:p-5 bg-orange-50/50 rounded-xl border border-orange-100 shadow-sm">
                       <div className="flex items-center justify-between">
                         <h3 className="text-lg font-bold text-orange-900 flex items-center gap-2">
                          <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">6</span>
                          Bank Information
                        </h3>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={handleSaveBankDetails}
                            className="h-8 text-[10px] sm:text-xs font-bold border-orange-200 text-orange-700 bg-white"
                          >
                            Save Details
                          </Button>
                        </div>
                       </div>

                      <div className="space-y-5">
                        {savedBankDetails.length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-xs font-bold text-orange-800 uppercase">Saved Bank Profiles</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                              {savedBankDetails.map((bank) => (
                                <div 
                                  key={bank.id} 
                                  className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-md group ${
                                    bankAccount === bank.bank_account 
                                      ? 'bg-orange-100 border-orange-300 ring-2 ring-orange-400/20' 
                                      : 'bg-white border-orange-100'
                                  }`}
                                >
                                  <div 
                                    className="flex-1 cursor-pointer min-w-0"
                                    onClick={() => loadBankDetails(bank)}
                                  >
                                    <div className="font-extrabold text-slate-900 flex items-center gap-1 max-w-full">
                                      <span className="truncate">{bank.bank_name}</span>
                                      {bank.bank_branch && (
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded truncate shrink-0" title={bank.bank_branch}>
                                          {bank.bank_branch}
                                        </span>
                                      )}
                                      {defaultBankId === bank.id && (
                                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                      )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-mono font-bold">{bank.bank_account}</p>
                                  </div>
                                  <div className="flex gap-1 ml-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleSetDefaultBankDetail(bank)
                                      }}
                                      className={`h-8 w-8 p-0 rounded-lg transition-colors ${
                                        defaultBankId === bank.id 
                                          ? 'text-amber-600 bg-amber-50' 
                                          : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                                      }`}
                                      title={defaultBankId === bank.id ? "Default Account" : "Set as Default"}
                                    >
                                      <Star className={`h-4 w-4 ${defaultBankId === bank.id ? 'fill-current' : ''}`} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteBankDetail(bank.id!)
                                      }}
                                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete Profile"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2 text-left">
                            <Label className="text-xs font-bold text-gray-600">Bank Name</Label>
                            <Input
                              placeholder="Karnatka Bank..."
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              className="h-10 bg-white"
                            />
                          </div>
                          <div className="space-y-2 text-left">
                            <Label className="text-xs font-bold text-gray-600">IFSC Code</Label>
                            <Input
                              placeholder="KARB000..."
                              value={bankIFSC}
                              onChange={(e) => setBankIFSC(e.target.value)}
                              className="h-10 bg-white font-mono"
                            />
                          </div>
                          <div className="space-y-2 text-left">
                            <Label className="text-xs font-bold text-gray-600">Account No.</Label>
                            <Input
                              placeholder="7292..."
                              value={bankAccount}
                              onChange={(e) => setBankAccount(e.target.value)}
                              className="h-10 bg-white font-mono"
                            />
                          </div>
                          <div className="space-y-2 text-left">
                            <Label className="text-xs font-bold text-gray-600">Branch Name</Label>
                            <Input
                              placeholder="Sangli Branch..."
                              value={bankBranch}
                              onChange={(e) => setBankBranch(e.target.value)}
                              className="h-10 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FINAL STEP: GRAND REVIEW */}
                  <div className="space-y-5 p-4 sm:p-6 bg-slate-900 text-white rounded-2xl shadow-xl border-4 border-slate-800">
                    <h3 className="text-xl font-black flex items-center gap-3">
                      <span className="bg-green-500 text-slate-900 rounded-lg w-8 h-8 flex items-center justify-center text-base font-black italic">✓</span>
                      Final Review
                    </h3>

                    <div className="space-y-4 pt-2">
                       <div className="flex justify-between items-center text-slate-400 text-sm">
                          <span className="font-bold">Items Total:</span>
                          <span className="font-mono">₹{itemsTotal.toFixed(2)}</span>
                       </div>
                       
                       {billType === 'pakki' && gstTotal > 0 && (
                         <div className="flex justify-between items-center text-blue-400 text-sm">
                            <span className="font-bold">GST (Applied):</span>
                            <span className="font-mono">₹{gstTotal.toFixed(2)}</span>
                         </div>
                       )}

                       {parseFloat(balance || '0') !== 0 && (
                         <div className="flex justify-between items-center text-amber-400 text-sm">
                            <span className="font-bold">Old Balance:</span>
                            <span className="font-mono">₹{parseFloat(balance).toFixed(2)}</span>
                         </div>
                       )}

                       <div className="pt-4 border-t border-slate-700 flex justify-between items-end">
                          <div>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">In Words:</p>
                             <p className="text-xs text-slate-300 font-medium italic max-w-[200px] leading-snug">{totalAmountWords}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mb-1">Invoice Total</p>
                             <p className="text-3xl sm:text-4xl font-black text-green-400">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                          </div>
                       </div>
                    </div>

                    <div className="pt-8 flex flex-col sm:flex-row items-center gap-4">
                      <Button
                        type="submit"
                        className="w-full sm:flex-1 h-14 text-lg font-black bg-green-500 hover:bg-green-400 text-slate-900 shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02] active:scale-95"
                        disabled={loading || !partyName || items.length === 0}
                      >
                        {loading ? 'Sychronizing...' : 'GENERATE BILL NOW'}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <div className="flex flex-col xl:h-full bg-white/50 rounded-2xl border border-gray-200 overflow-hidden min-h-[700px] xl:min-h-0">
            <div className="p-3 border-b bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between items-center">
              <span>Live PDF Preview Engine</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-black italic">A4 Scaled v2.0</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <BillPreview
                billType={billType}
                billNumber={nextBillNumber || ''}
                billDate={billDate}
                partyName={partyName}
                partyGst={partyGst}
                vehicleNumber={vehicleNumber}
                balance={balance ? parseFloat(balance) : undefined}
                bankName={bankName}
                bankIFSC={bankIFSC}
                bankAccount={bankAccount}
                bankBranch={bankBranch}
                showBankDetails={billType === 'pakki'}
                items={items}
                itemsTotal={itemsTotal}
                gstEnabled={isGstEnabled}
                cgstPercent={cgstPercent}
                igstPercent={igstPercent}
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
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </ProtectedRoute>
  )
}

