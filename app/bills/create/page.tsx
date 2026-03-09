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
  // ... (rest of the file remains same until return)
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
    fetchNextBillNumber()
    fetchSavedBankDetails()
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

  return (
    <ProtectedRoute>
      <div className="container py-6 md:py-8">
        {/* ... existing content ... */}
      </div>

      <style jsx global>{`
        /* ... existing style ... */
      `}</style>
    </ProtectedRoute>
  )
}

