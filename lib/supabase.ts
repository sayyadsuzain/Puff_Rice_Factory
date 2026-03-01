import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wvhswztjjahhbdtxnhxb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2aHN3enRqamFoaGJkdHhuaHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzA5NDMsImV4cCI6MjA4NzQwNjk0M30.Cw4V-eU2jcOmH8CRrk9HvPHdgAF3IfOtMtGoW6To0JI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

export type Party = {
  id: number
  party_id: string // PYT01, PYT02 format
  name: string
  gst_number?: string
  created_at: string
  updated_at: string
}

export type Bill = {
  id: number
  bill_number: string // P001, K001 format
  bill_type: 'kacchi' | 'pakki'
  party_id: number
  bill_date: string
  total_amount: number
  total_amount_words?: string
  vehicle_number?: string
  balance: number
  // GST fields
  is_gst_enabled: boolean
  company_gst_number?: string
  party_gst_number?: string
  cgst_percent: number
  igst_percent: number
  sgst_percent: number
  cgst_amount: number
  igst_amount: number
  sgst_amount: number
  gst_total: number
  // Bank details
  bank_name?: string
  bank_ifsc?: string
  bank_account?: string
  notes?: string
  created_at: string
  updated_at: string
}

export type BillItem = {
  id: number
  bill_id: number
  particular: string
  qty_bags?: number
  weight_kg?: number
  rate?: number
  amount?: number
  created_at: string
}

export const FIXED_PRODUCTS = [
  'Adsigiri (Bhadang Murmura)',
  'Kolhapuri',
  'MP',
  'PADDY'
]

export type SavedBankDetail = {
  id: number
  bank_name: string
  bank_ifsc: string
  bank_account: string
  created_at: string
}

export const COMPANY_INFO = {
  name: 'M S TRADING COMPANY',
  address: 'KUPWAD MIDC NEAR NAV KRISHNA VALLEY, PLOT NO L-52',
  gst: '27CQIPS6685K1ZU',
  jurisdiction: 'Subject to Sangli Jurisdiction'
}

// Utility functions
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

// Amount to words conversion
export const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return ''
    if (n < 10) return ones[n]
    if (n < 20) return teens[n - 10]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '')
  }

  const convert = (n: number): string => {
    if (n === 0) return 'Zero'

    let result = ''
    if (n >= 10000000) { // Crore
      result += convertLessThanThousand(Math.floor(n / 10000000)) + ' Crore '
      n %= 10000000
    }
    if (n >= 100000) { // Lakh
      result += convertLessThanThousand(Math.floor(n / 100000)) + ' Lakh '
      n %= 100000
    }
    if (n >= 1000) { // Thousand
      result += convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand '
      n %= 1000
    }
    if (n > 0) {
      result += convertLessThanThousand(n)
    }

    return result.trim()
  }

  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)

  let result = convert(rupees) + ' Rupees'
  if (paise > 0) {
    result += ' and ' + convert(paise) + ' Paise'
  }
  result += ' Only'

  return result
}
