'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function PrintContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const token = searchParams.get('token')
  
  const [pdfUrl, setPdfUrl] = useState('')

  useEffect(() => {
    if (id) {
      setPdfUrl(`/api/bill-pdf?id=${id}${token ? `&token=${token}` : ''}&v=9`)
    }
  }, [id, token])

  if (!id) return <div className="flex items-center justify-center min-h-screen">Bill ID missing.</div>

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      <iframe 
        src={pdfUrl} 
        className="flex-1 w-full h-full border-none"
        title="MS Trading - Bill PDF"
      />
    </div>
  )
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading Viewer...</div>}>
      <PrintContent />
    </Suspense>
  )
}
