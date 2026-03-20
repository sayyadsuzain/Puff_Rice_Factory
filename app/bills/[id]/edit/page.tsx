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
import { ArrowLeft, Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, Bill, BillItem, FIXED_PRODUCTS, COMPANY_INFO, SavedBankDetail } from '@/lib/supabase'
import BillPreview from '@/components/bill-preview'
import BillItemForm from '@/components/bill-item-form'
import { GSTToggle } from '@/components/gst-toggle'
import { PartySearch } from '@/components/party-search'
import { ProtectedRoute } from '@/components/protected-route'

export const dynamic = 'force-dynamic'

export default function EditBillPage() {
  const params = useParams()
  const billId = parseInt(params.id as string)

  const [billType, setBillType] = useState<'kacchi' | 'pakki'>('kacchi')
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null)
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
  const [bankBranch, setBankBranch] = useState('')
  const [showBankDetails, setShowBankDetails] = useState(true)
  const [notes, setNotes] = useState('')
  const [billNumber, setBillNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [savedBankDetails, setSavedBankDetails] = useState<SavedBankDetail[]>([])
  const [defaultBankId, setDefaultBankId] = useState<number | null>(null)

  // GST-related state variables
  const [isGstEnabled, setIsGstEnabled] = useState(false)
  const [cgstPercent, setCgstPercent] = useState(0)
  const [igstPercent, setIgstPercent] = useState(0)
  const [gstTotal, setGstTotal] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)
  const [partyGst, setPartyGst] = useState('')
  const [originalPartyGst, setOriginalPartyGst] = useState('')
  const [shouldUpdatePartyGst, setShouldUpdatePartyGst] = useState(false)
  const [originalBankDetails, setOriginalBankDetails] = useState<{id?: number, name: string, ifsc: string, account: string, branch: string} | null>(null)
  const [shouldUpdateBankProfile, setShouldUpdateBankProfile] = useState(false)

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
      fetchSavedBankDetails().then((banks: SavedBankDetail[]) => {
        // Check for default bank in localStorage
        const savedDefaultId = localStorage.getItem('default_bank_id')
        if (savedDefaultId && banks && banks.length > 0) {
          setDefaultBankId(parseInt(savedDefaultId))
        }
      })
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

  const handlePartySelect = (partyId: number | null, name: string) => {
    setSelectedPartyId(partyId)
    setPartyName(name)
    setShouldUpdatePartyGst(false)

    // Fetch party GST if party is selected
    if (partyId) {
      supabase
        .from('parties')
        .select('gst_number')
        .eq('id', partyId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            const gst = data.gst_number || ''
            setPartyGst(gst)
            setOriginalPartyGst(gst)
          }
        })
    } else {
      setPartyGst('')
      setOriginalPartyGst('')
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
      setDefaultBankId(null)
      localStorage.removeItem('default_bank_id')
      toast.success('Default bank removed')
    } else {
      setDefaultBankId(bank.id!)
      localStorage.setItem('default_bank_id', bank.id!.toString())
      toast.success(`Set ${bank.bank_name} as default`)
    }
  }

  const handleSaveBankDetails = async () => {
    if (!bankName.trim() || !bankIFSC.trim() || !bankAccount.trim()) {
      toast.error('Please fill all bank details before saving')
      return
    }

    try {
      const { data: existingBanks } = await supabase
        .from('saved_bank_details')
        .select('id')
        .eq('bank_name', bankName.trim())
        .eq('bank_ifsc', bankIFSC.trim())
        .eq('bank_account', bankAccount.trim())

      if (existingBanks && existingBanks.length > 0) {
        // Update existing bank's branch if it matches name/ifsc/account
        const { error: updateError } = await supabase
          .from('saved_bank_details')
          .update({ bank_branch: bankBranch.trim() })
          .eq('id', existingBanks[0].id)

        if (updateError) throw updateError

        await fetchSavedBankDetails()
        toast.success('Bank details updated successfully!')
        return
      }

      const { error: saveError } = await supabase
        .from('saved_bank_details')
        .insert([
          {
            bank_name: bankName.trim(),
            bank_ifsc: bankIFSC.trim(),
            bank_account: bankAccount.trim(),
            bank_branch: bankBranch.trim()
          }
        ])

      if (saveError) throw saveError
      await fetchSavedBankDetails()
      toast.success('Bank details saved successfully!')
    } catch (error) {
      console.error('Error saving bank details:', error)
      toast.error('Failed to save bank details')
    }
  }

  const loadSavedBankDetails = (bank: SavedBankDetail) => {
    setBankName(bank.bank_name || '')
    setBankIFSC(bank.bank_ifsc || '')
    setBankAccount(bank.bank_account || '')
    setBankBranch(bank.bank_branch || '')
    setOriginalBankDetails({
      id: bank.id,
      name: bank.bank_name || '',
      ifsc: bank.bank_ifsc || '',
      account: bank.bank_account || '',
      branch: bank.bank_branch || ''
    })
    setShouldUpdateBankProfile(false)
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
            const gst = partyData.gst_number || ''
            setPartyGst(gst)
            setOriginalPartyGst(gst)
            setSelectedPartyId(billData.party_id)
            setPartyName(partyData.name)
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
        setBankBranch(billData.bank_branch || '')
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

  const handleSaveBill = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!partyName.trim()) {
      toast.error('Please enter party name')
      return
    }

    if (items.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    setLoading(true)
    console.log('🔄 EDIT PAGE: Starting save process...')

    try {
      // Sync GST if requested
      if (shouldUpdatePartyGst && selectedPartyId && partyGst !== originalPartyGst) {
        console.log('Syncing updated GST to party record...')
        const { error: syncError } = await supabase
          .from('parties')
          .update({ gst_number: partyGst })
          .eq('id', selectedPartyId)
        
        if (syncError) {
          console.error('Failed to sync GST:', syncError)
          toast.error('Bill will be saved, but party GST update failed.')
        } else {
          toast.success('Party GST updated in settings!')
        }
      }

      // --- SMART BANK SYNC ---
      if (billType === 'pakki' && shouldUpdateBankProfile && originalBankDetails?.id) {
        try {
          await supabase
            .from('saved_bank_details')
            .update({
              bank_name: bankName,
              bank_ifsc: bankIFSC,
              bank_account: bankAccount,
              bank_branch: bankBranch
            })
            .eq('id', originalBankDetails.id)
          console.log('✅ Bank Profile Updated Successfully')
        } catch (err) {
          console.error('❌ Failed to update bank profile:', err)
        }
      }
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
        bank_branch: billType === 'pakki' ? bankBranch : null,
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 xl:h-[calc(100vh-180px)] xl:overflow-hidden px-1">
          {/* Form Section */}
          <div className="space-y-4 md:space-y-6 xl:h-full xl:overflow-y-auto xl:pr-4 custom-scrollbar">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden">
                    <div className="space-y-2 min-w-0">
                      <Label className="text-sm md:text-base font-medium">Bill Type</Label>
                      <Select value={billType} onValueChange={(value) => setBillType(value as 'kacchi' | 'pakki')}>
                        <SelectTrigger className="w-full" suppressHydrationWarning>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kacchi">Kacchi (Cash/Rough)</SelectItem>
                          <SelectItem value="pakki">Pakki (GST Invoice)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label className="text-sm md:text-base font-medium">Bill Date</Label>
                      <Input
                        type="date"
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                        className="w-full h-11 bg-white px-4 font-medium border-gray-200 focus:ring-blue-500/20"
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
                    <PartySearch
                      value={partyName}
                      onChange={handlePartySelect}
                      placeholder="Start typing party name..."
                      required
                    />

                    {billType === 'pakki' && isGstEnabled && (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest pl-1">Modify Party GST (Optional)</Label>
                          <div className="relative group">
                            <Input
                              placeholder="27XXXXX0000X0Z0"
                              value={partyGst}
                              onChange={(e) => setPartyGst(e.target.value.toUpperCase())}
                              className="h-10 bg-white font-mono uppercase font-bold border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all pl-9"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] font-black">GST</span>
                            </div>
                          </div>
                        </div>

                        {partyGst !== originalPartyGst && selectedPartyId && (
                          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in slide-in-from-top-1">
                            <input
                              type="checkbox"
                              id="sync-gst-edit"
                              checked={shouldUpdatePartyGst}
                              onChange={(e) => setShouldUpdatePartyGst(e.target.checked)}
                              className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <Label htmlFor="sync-gst-edit" className="text-[11px] font-bold text-amber-900 cursor-pointer">
                              Update this GST number in Party Settings?
                            </Label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

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
                      {isGstEnabled && (
                        <div className="bg-white p-3 rounded border">
                          <Label className="text-sm font-medium">Company GST Number</Label>
                          <Input
                            value={COMPANY_INFO.gst}
                            disabled
                            className="bg-muted text-sm mt-1"
                          />
                        </div>
                      )}

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
                        originalPartyGst={originalPartyGst}
                        shouldUpdatePartyGst={shouldUpdatePartyGst}
                        onShouldUpdatePartyGstChange={setShouldUpdatePartyGst}
                        selectedPartyId={selectedPartyId}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 6: BANK INFORMATION (PAKKI ONLY) */}
                {billType === 'pakki' && (
                  <div className="space-y-5 p-4 sm:p-5 bg-orange-50/50 rounded-xl border border-orange-100 shadow-sm">
                     <div className="flex items-center justify-between">
                       <h3 className="text-lg font-bold text-orange-900 flex items-center gap-2">
                        <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">6</span>
                        Bank Information
                      </h3>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSaveBankDetails}
                        className="h-8 text-[10px] sm:text-xs font-bold border-orange-200 text-orange-700 bg-white shadow-sm"
                      >
                        Keep for Future
                      </Button>
                     </div>

                    <div className="space-y-5">
                      {savedBankDetails.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-xs font-bold text-orange-800 uppercase tracking-wider">Saved Bank Profiles</Label>
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
                                  onClick={() => loadSavedBankDetails(bank)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="font-extrabold text-slate-900 flex items-center gap-1 max-w-full">
                                      <span className="truncate">{bank.bank_name}</span>
                                      {bank.bank_branch && (
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded truncate shrink-0" title={bank.bank_branch}>
                                          {bank.bank_branch}
                                        </span>
                                      )}
                                    </div>
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
                              placeholder="SANGLI BRANCH"
                              value={bankBranch}
                              onChange={(e) => setBankBranch(e.target.value)}
                            className="h-10 bg-white"
                          />
                        </div>
                      </div>

                      {/* SMART BANK SYNC PROMPT */}
                      {originalBankDetails && (
                        (bankName !== originalBankDetails.name || 
                         bankIFSC !== originalBankDetails.ifsc || 
                         bankAccount !== originalBankDetails.account || 
                         bankBranch !== originalBankDetails.branch)
                      ) && (
                        <div className="flex items-center gap-2 p-3 bg-orange-100/50 border border-orange-200 rounded-xl animate-in fade-in slide-in-from-top-1 mt-4">
                          <input
                            type="checkbox"
                            id="sync-bank-toggle-edit"
                            checked={shouldUpdateBankProfile}
                            onChange={(e) => setShouldUpdateBankProfile(e.target.checked)}
                            className="w-4 h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                          <Label htmlFor="sync-bank-toggle-edit" className="text-xs font-bold text-orange-900 cursor-pointer">
                            Update this Bank Profile in Settings?
                          </Label>
                        </div>
                      )}
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
                              <span className="font-mono">₹{totalAmount.toFixed(2)}</span>
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

                           <div className="pt-4 border-t border-slate-700">
                              <div className="mb-4">
                                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">In Words:</p>
                                 <textarea
                                   value={totalAmountWords}
                                   onChange={(e) => setTotalAmountWords(e.target.value)}
                                   className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 font-medium italic resize-none h-20 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                   placeholder="Amount in words..."
                                 />
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mb-1">Invoice Total</p>
                                 <p className="text-3xl sm:text-4xl font-black text-green-400">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                              </div>
                           </div>
                        </div>

                        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                          <Button
                            onClick={handleSaveBill}
                            disabled={loading}
                            className="w-full sm:flex-1 h-14 text-lg font-black bg-green-500 hover:bg-green-400 text-slate-900 shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02] active:scale-95"
                          >
                            {loading ? 'Synchronizing...' : 'UPDATE BILL NOW'}
                          </Button>
                          <Link href={`/bills/${billId}`} className="w-full sm:w-auto">
                            <Button type="button" variant="ghost" className="w-full h-14 text-slate-500 hover:text-white font-bold uppercase tracking-tighter text-xs">
                              Discard
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
          </div>

          {/* Preview Section - Left column in XL, Second row in stack */}
          <div className="flex flex-col xl:h-full bg-white/50 rounded-2xl border border-gray-200 overflow-hidden min-h-[700px] xl:min-h-0 order-2 xl:order-1">
            <div className="p-3 border-b bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between items-center">
              <span>Live PDF Preview Engine</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-black italic">A4 Scaled v2.0</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <BillPreview
                billType={billType}
                billNumber={billNumber ? `${billType === 'kacchi' ? 'K' : 'P'}${String(billNumber).padStart(3, '0')}` : ''}
                billDate={billDate}
                partyName={partyName}
                partyGst={isGstEnabled ? partyGst : undefined}
                vehicleNumber={vehicleNumber}
                balance={balance && parseFloat(balance) > 0 ? parseFloat(balance) : undefined}
                bankName={bankName}
                bankIFSC={bankIFSC}
                      bankAccount={bankAccount}
                      bankBranch={bankBranch}
                      showBankDetails={billType === 'pakki'}
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