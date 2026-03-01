'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, FileText, ArrowLeft } from 'lucide-react'

interface Bill {
  id: string
  bill_number: string
  bill_type: string
  bill_date: string
  party_id: string
  total_amount?: number
  taxable_amount?: number
  gst_total?: number
  net_total?: number
  cgst_amount?: number
  sgst_amount?: number
  igst_amount?: number
  vehicle_number?: string
  financial_year?: string
  month_number?: number
  is_gst_enabled?: boolean
  cgst_percent?: number
  igst_percent?: number
  bank_name?: string
  bank_ifsc?: string
  bank_account?: string
  total_amount_words?: string
  balance?: number
  parties?: {
    name: string
    gst_number?: string
  }
}

interface BillItem {
  id: string
  bill_id: string
  particular: string
  qty_bags?: number
  weight_kg?: number
  rate?: number
  amount?: number
}

const MONTHS = [
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
]
const FINANCIAL_YEARS = ['2024-25', '2025-26', '2026-27', '2027-28']
export default function MonthlyBillBookPage() {
  const currentDate = new Date()
  const [selectedFY, setSelectedFY] = useState('2025-26')
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [bills, setBills] = useState<Bill[]>([])
  const [billItems, setBillItems] = useState<Record<string, BillItem[]>>({})
  const [loading, setLoading] = useState(false)
  const [generatingMonthly, setGeneratingMonthly] = useState(false)
  const [generatingYearly, setGeneratingYearly] = useState(false)
  const [generatingMonthlyKacchi, setGeneratingMonthlyKacchi] = useState(false)
  const [generatingMonthlyPakki, setGeneratingMonthlyPakki] = useState(false)
  const [generatingYearlyPakki, setGeneratingYearlyPakki] = useState(false)
  const [generatingYearlyKacchi, setGeneratingYearlyKacchi] = useState(false)

  const handleGoBack = () => {
    window.history.back()
  }

  const fetchBills = async () => {
    try {
      console.log('Fetching bills for:', selectedFY, selectedMonth)

      // Try a simpler query first to test connection
      const { data: testData, error: testError } = await supabase
        .from('bills')
        .select('count')
        .limit(1)

      if (testError) {
        console.error('Supabase connection test failed:', testError)
        throw new Error(`Connection failed: ${testError.message}`)
      }

      console.log('Supabase connection OK, proceeding with full query...')

      // Try without JOIN first, then add party data separately
      let billsData: any[] = []
      const { data: queryData, error } = await supabase
        .from('bills')
        .select('*')
        .eq('financial_year', selectedFY)
        .eq('month_number', selectedMonth)
        .order('bill_date', { ascending: true })
        .order('bill_number', { ascending: true })

      if (error) {
        console.error('Error fetching bills (basic query):', error)
        // Try without filters as fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('bills')
          .select('*')
          .order('bill_date', { ascending: false })
          .limit(50)

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError)
          throw new Error(`Database query failed: ${error.message}`)
        }

        console.log('Using fallback data (last 50 bills):', fallbackData?.length || 0)
        // For fallback, filter client-side
        billsData = fallbackData?.filter(bill => {
          const billFY = bill.financial_year || 'unknown'
          const billMonth = bill.month_number || 0
          const matches = billFY === selectedFY && billMonth === selectedMonth
          console.log(`Fallback filter - Bill ${bill.id} (${bill.bill_number}): FY=${billFY}, Month=${billMonth}, Matches=${matches}`)
          return matches
        }) || []
      } else {
        billsData = queryData || []
      }

      console.log('Fetched bills:', billsData?.length || 0)

      // Debug: Log each bill's financial year and month - ALL bills
      billsData?.forEach(bill => {
        console.log(`Bill ${bill.id} (${bill.bill_number}): FY=${bill.financial_year}, Month=${bill.month_number}, Date=${bill.bill_date}`)
      })

      // Also log all bills from a broader query to see what's available
      const { data: allBills, error: allError } = await supabase
        .from('bills')
        .select('id, bill_number, financial_year, month_number, bill_date')
        .order('bill_date', { ascending: false })
        .limit(10)

      if (!allError && allBills) {
        console.log('ALL bills in system (last 10):')
        allBills.forEach(bill => {
          console.log(`  Bill ${bill.id} (${bill.bill_number}): FY=${bill.financial_year}, Month=${bill.month_number}, Date=${bill.bill_date}`)
        })
      }

      // Add party data to bills
      if (billsData && billsData.length > 0) {
        const partyIds = billsData.map(bill => bill.party_id).filter(id => id)
        if (partyIds.length > 0) {
          const { data: partiesData, error: partiesError } = await supabase
            .from('parties')
            .select('id, name, gst_number')
            .in('id', partyIds)

          if (!partiesError && partiesData) {
            const partiesMap = partiesData.reduce((map, party) => {
              map[party.id] = party
              return map
            }, {} as Record<number, any>)

            // Add party data to bills
            billsData.forEach(bill => {
              if (bill.party_id && partiesMap[bill.party_id]) {
                bill.parties = partiesMap[bill.party_id]
              }
            })
          }
        }
      }

      // Set the bills with party data
      setBills(billsData || [])

      // Fetch items for all filtered bills
      const itemsMap: Record<string, BillItem[]> = {}
      for (const bill of billsData || []) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('bill_items')
          .select('*')
          .eq('bill_id', bill.id)
          .order('id', { ascending: true })

        if (!itemsError && itemsData) {
          itemsMap[bill.id] = itemsData
        }
      }
      setBillItems(itemsMap)

    } catch (error) {
      console.error('Error fetching bills:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBills()
  }, [selectedFY, selectedMonth])

  // Add real-time subscription for bills
  useEffect(() => {
    const channel = supabase
      .channel('bills_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bills'
      }, (payload) => {
        console.log('Bill changed:', payload)
        // Refresh bills when any bill changes
        fetchBills()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedFY, selectedMonth])

  const getFinancialYear = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1 // 1-12
    if (month >= 4) {
      return `${year}-${(year + 1) % 100}` // 2025-26
    } else {
      return `${year - 1}-${year % 100}` // 2024-25
    }
  }

  const generateMonthlyBillBookPDF = async () => {
    if (bills.length === 0) {
      alert('No bills found for selected month.')
      return
    }

    setGeneratingMonthly(true)
    try {
      const response = await fetch('/api/monthly-bill-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financialYear: selectedFY,
          month: selectedMonth,
          mode: 'monthly'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `BillBook_${MONTHS.find(m => m.value === selectedMonth)?.label}_${selectedFY}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      alert('Monthly Bill Book PDF downloaded successfully!')

    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('PDF generation failed. Please try again.')
    } finally {
      setGeneratingMonthly(false)
    }
  }

  const generateYearlyBillBookPDF = async () => {
    if (bills.length === 0) {
      alert('No bills found for selected financial year.')
      return
    }

    setGeneratingYearly(true)
    try {
      const response = await fetch('/api/monthly-bill-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financialYear: selectedFY,
          mode: 'yearly'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `YearlyBillBook_${selectedFY}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      alert('Yearly Bill Book PDF downloaded successfully!')

    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('PDF generation failed. Please try again.')
    }
  }

  const generateMonthlyKacchiBillBookPDF = async () => {
    const kacchiBills = bills.filter(bill => bill.bill_type === 'kacchi')
    if (kacchiBills.length === 0) {
      alert('No Kacchi bills found for selected month.')
      return
    }

    setGeneratingMonthlyKacchi(true)
    try {
      const response = await fetch('/api/monthly-bill-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financialYear: selectedFY,
          month: selectedMonth,
          mode: 'monthly',
          billType: 'kacchi'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Kacchi_BillBook_${MONTHS.find(m => m.value === selectedMonth)?.label}_${selectedFY}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      alert('Kacchi Monthly Bill Book PDF downloaded successfully!')

    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('PDF generation failed. Please try again.')
    } finally {
      setGeneratingMonthlyKacchi(false)
    }
  }

  const generateMonthlyPakkiBillBookPDF = async () => {
    const pakkiBills = bills.filter(bill => bill.bill_type === 'pakki')
    if (pakkiBills.length === 0) {
      alert('No Pakki bills found for selected month.')
      return
    }

    setGeneratingMonthlyPakki(true)
    try {
      const response = await fetch('/api/monthly-bill-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financialYear: selectedFY,
          month: selectedMonth,
          mode: 'monthly',
          billType: 'pakki'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Pakki_BillBook_${MONTHS.find(m => m.value === selectedMonth)?.label}_${selectedFY}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      alert('Pakki Monthly Bill Book PDF downloaded successfully!')

    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('PDF generation failed. Please try again.')
    } finally {
      setGeneratingMonthlyPakki(false)
    }
  }

  const generateYearlyKacchiBillBookPDF = async () => {
    const kacchiBills = bills.filter(bill => bill.bill_type === 'kacchi')
    if (kacchiBills.length === 0) {
      alert('No Kacchi bills found for selected financial year.')
      return
    }

    setGeneratingYearlyKacchi(true)
    try {
      const response = await fetch('/api/monthly-bill-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financialYear: selectedFY,
          mode: 'yearly',
          billType: 'kacchi'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Kacchi_YearlyBillBook_${selectedFY}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      alert('Kacchi Yearly Bill Book PDF downloaded successfully!')

    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('PDF generation failed. Please try again.')
    } finally {
      setGeneratingYearlyKacchi(false)
    }
  }

  const generateYearlyPakkiBillBookPDF = async () => {
    const pakkiBills = bills.filter(bill => bill.bill_type === 'pakki')
    if (pakkiBills.length === 0) {
      alert('No Pakki bills found for selected financial year.')
      return
    }

    setGeneratingYearlyPakki(true)
    try {
      const response = await fetch('/api/monthly-bill-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financialYear: selectedFY,
          mode: 'yearly',
          billType: 'pakki'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Pakki_YearlyBillBook_${selectedFY}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      alert('Pakki Yearly Bill Book PDF downloaded successfully!')

    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('PDF generation failed. Please try again.')
    } finally {
      setGeneratingYearlyPakki(false)
    }
  }


  const formatBillNumber = (bill: Bill) => {
    const billNum = String(bill.bill_number)
    if (billNum.startsWith('P') || billNum.startsWith('K')) {
      const numPart = billNum.substring(1)
      return billNum.charAt(0) + numPart.padStart(3, '0')
    } else {
      const prefix = bill.bill_type === 'kacchi' ? 'K' : 'P'
      return `${prefix}${billNum.padStart(3, '0')}`
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  return (
    <div className="container py-6 md:py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          onClick={handleGoBack}
          variant="outline"
          className="flex items-center gap-2 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Bill Book Generator</h1>
        <p className="text-muted-foreground">Generate professional CA-ready PDF bill books with cover pages and page numbering (replaces physical bill book submission)</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select Month & Financial Year</CardTitle>
          <CardDescription>Choose the period for which you want to generate the bill book</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Financial Year</label>
              <Select value={selectedFY} onValueChange={setSelectedFY}>
                <SelectTrigger suppressHydrationWarning>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_YEARS.map(fy => (
                    <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Month</label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger suppressHydrationWarning>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchBills} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh Bills'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bill Count and Download */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Professional Bill Book PDFs</CardTitle>
          <CardDescription>
            Generate CA-ready PDF bill books with cover pages, page numbering, and exact bill layouts. Monthly books include bills for selected month, yearly books include all bills for the financial year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bills.length > 0 ? (
            <div className="space-y-6">
              {/* Monthly Bill Books */}
              <div>
                <h4 className="font-medium mb-3 text-sm text-gray-700">Monthly Bill Books (Selected Month)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Button
                    onClick={generateMonthlyBillBookPDF}
                    disabled={generatingMonthly || generatingYearly || generatingMonthlyKacchi || generatingMonthlyPakki || generatingYearlyKacchi || generatingYearlyPakki}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    {generatingMonthly ? 'Generating...' : 'Combined Monthly'}
                  </Button>
                  <Button
                    onClick={generateMonthlyKacchiBillBookPDF}
                    disabled={generatingMonthly || generatingYearly || generatingMonthlyKacchi || generatingMonthlyPakki || generatingYearlyKacchi || generatingYearlyPakki}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4" />
                    {generatingMonthlyKacchi ? 'Generating...' : 'Kacchi Monthly'}
                  </Button>
                  <Button
                    onClick={generateMonthlyPakkiBillBookPDF}
                    disabled={generatingMonthly || generatingYearly || generatingMonthlyKacchi || generatingMonthlyPakki || generatingYearlyKacchi || generatingYearlyPakki}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    <Download className="h-4 w-4" />
                    {generatingMonthlyPakki ? 'Generating...' : 'Pakki Monthly'}
                  </Button>
                </div>
              </div>

              {/* Yearly Bill Books */}
              <div>
                <h4 className="font-medium mb-3 text-sm text-gray-700">Yearly Bill Books (Full Financial Year)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Button
                    onClick={generateYearlyBillBookPDF}
                    variant="outline"
                    disabled={generatingMonthly || generatingYearly || generatingMonthlyKacchi || generatingMonthlyPakki || generatingYearlyKacchi || generatingYearlyPakki}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {generatingYearly ? 'Generating...' : 'Combined Yearly'}
                  </Button>
                  <Button
                    onClick={generateYearlyKacchiBillBookPDF}
                    variant="outline"
                    disabled={generatingMonthly || generatingYearly || generatingMonthlyKacchi || generatingMonthlyPakki || generatingYearlyKacchi || generatingYearlyPakki}
                    className="flex items-center gap-2 border-green-600 text-green-600 hover:bg-green-50"
                  >
                    <Download className="h-4 w-4" />
                    {generatingYearlyKacchi ? 'Generating...' : 'Kacchi Yearly'}
                  </Button>
                  <Button
                    onClick={generateYearlyPakkiBillBookPDF}
                    variant="outline"
                    disabled={generatingMonthly || generatingYearly || generatingMonthlyKacchi || generatingMonthlyPakki || generatingYearlyKacchi || generatingYearlyPakki}
                    className="flex items-center gap-2 border-purple-600 text-purple-600 hover:bg-purple-50"
                  >
                    <Download className="h-4 w-4" />
                    {generatingYearlyPakki ? 'Generating...' : 'Pakki Yearly'}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                Files: BillBook_{MONTHS.find(m => m.value === selectedMonth)?.label}_{selectedFY}.pdf & YearlyBillBook_{selectedFY}.pdf
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Please select a different month or financial year.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bills Preview (Optional - just showing count for now) */}
      {bills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bill Summary</CardTitle>
            <CardDescription>Bills will be sorted by date (oldest first) then by bill number</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {bills.map((bill, index) => (
                <div key={bill.id} className="flex justify-between py-1 border-b last:border-b-0">
                  <span>{index + 1}. {formatBillNumber(bill)} - {formatDate(bill.bill_date)}</span>
                  <span>{bill.parties?.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
