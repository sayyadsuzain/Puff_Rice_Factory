import { supabase } from '@/lib/supabase'
import BillDisplay from '@/components/bill-display'
import { notFound } from 'next/navigation'

interface PrintPageProps {
  params: {
    id: string
  }
}

export default async function BillPrintPage({ params }: PrintPageProps) {
  const billId = parseInt(params.id)

  if (!billId || isNaN(billId)) {
    notFound()
  }

  try {
    // Fetch bill with party data
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select(`
        *,
        parties (
          id,
          name,
          gst_number
        )
      `)
      .eq('id', billId)
      .single()

    if (billError || !bill) {
      notFound()
    }

    // Fetch bill items
    const { data: items, error: itemsError } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', billId)
      .order('id', { ascending: true })

    if (itemsError) {
      notFound()
    }

    const partyName = bill.parties?.name || 'Party Not Found'
    const partyGst = bill.parties?.gst_number || ''

    return (
      <div className="print-container" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <style jsx global>{`
          @media print {
            body { margin: 0; }
            .print-container { padding: 0; }
            @page { margin: 0.5in; }
          }
        `}</style>
        <BillDisplay
          bill={bill}
          items={items || []}
          partyName={partyName}
          partyGst={partyGst}
        />
      </div>
    )
  } catch (error) {
    console.error('Error loading bill for print:', error)
    notFound()
  }
}
