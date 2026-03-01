'use client'

import { useState } from 'react'

export default function CAReportsPage() {
  const [financialYear, setFinancialYear] = useState('2025-26')
  const [month, setMonth] = useState('all')
  const [loading, setLoading] = useState<string | null>(null) // 'kacchi', 'pakki', or 'both'

  const handleGenerateReport = async (billType: 'kacchi' | 'pakki' | 'both') => {
    setLoading(billType)
    try {
      const response = await fetch('/api/ca-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billType,
          financialYear,
          month,
          reportType: 'comprehensive'
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `CA_Report_${billType.toUpperCase()}_${financialYear}${month !== 'all' ? `_${month}` : ''}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to generate report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error generating report')
    } finally {
      setLoading(null)
    }
  }

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ]

  const financialYears = [
    '2024-25',
    '2025-26',
    '2026-27',
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Chartered Accountant Reports
            </h1>
            <p className="text-gray-600">
              Generate comprehensive financial reports for Kacchi and Pakki bills
            </p>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Financial Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Financial Year
              </label>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                suppressHydrationWarning
              >
                {financialYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month (Optional)
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                suppressHydrationWarning
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Report Type Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Report Type:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Kacchi Bills Button */}
              <button
                onClick={() => handleGenerateReport('kacchi')}
                disabled={loading !== null}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 flex flex-col items-center justify-center"
              >
                {loading === 'kacchi' ? (
                  <>
                    <svg className="animate-spin h-6 w-6 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    KACCHI Bills Report
                  </>
                )}
              </button>

              {/* Pakki Bills Button */}
              <button
                onClick={() => handleGenerateReport('pakki')}
                disabled={loading !== null}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 flex flex-col items-center justify-center"
              >
                {loading === 'pakki' ? (
                  <>
                    <svg className="animate-spin h-6 w-6 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                    </svg>
                    PAKKI Bills Report
                  </>
                )}
              </button>

              {/* Both Bills Button */}
              <button
                onClick={() => handleGenerateReport('both')}
                disabled={loading !== null}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 flex flex-col items-center justify-center"
              >
                {loading === 'both' ? (
                  <>
                    <svg className="animate-spin h-6 w-6 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                    Combined Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Report Features */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Report Includes:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-700">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  Party-wise bill summaries
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  GST breakdown (CGST/SGST/IGST)
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  Detailed bill register
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-700">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  Financial year summaries
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  Outstanding balance reports
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  Professional CA formatting
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Instructions:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Choose financial year and optionally a specific month</li>
              <li>• Click on KACCHI Bills, PAKKI Bills, or Combined Report button</li>
              <li>• PDF will be downloaded automatically with comprehensive analysis</li>
              <li>• Each report type provides separate financial insights</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
