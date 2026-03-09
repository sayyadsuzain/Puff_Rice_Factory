'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { LogOut, Menu, X, FileText, Plus, List } from 'lucide-react'

export default function BillsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section */}
            <Link href="/bills" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <Logo />
              <div className="hidden xs:block">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">MS Trading Co.</h1>
                <p className="text-[10px] md:text-xs text-gray-500 font-medium">Bill Management System</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-4 border-r pr-6 mr-2">
                <Link href="/bills" className="text-sm font-medium text-gray-600 hover:text-red-600 flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Bills
                </Link>
                <Link href="/bills/create" className="text-sm font-medium text-gray-600 hover:text-red-600 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Bill
                </Link>
                <Link href="/reports/ca" className="text-sm font-medium text-gray-600 hover:text-red-600 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Reports
                </Link>
              </div>

              {user && (
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded hidden lg:block">
                    {user.email}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => signOut()}
                    className="gap-2 h-9 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white animate-in slide-in-from-top duration-200">
            <div className="px-4 py-4 space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Link
                  href="/bills"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md"
                >
                  <List className="h-5 w-5" />
                  All Bills
                </Link>
                <Link
                  href="/bills/create"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md"
                >
                  <Plus className="h-5 w-5" />
                  Create New Bill
                </Link>
                <Link
                  href="/reports/ca"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md"
                >
                  <FileText className="h-5 w-5" />
                  CA Reports
                </Link>
              </div>

              {user && (
                <div className="pt-4 border-t space-y-3">
                  <div className="px-3 text-xs text-gray-500 truncate">
                    Logged in as: <span className="font-semibold text-gray-700">{user.email}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      signOut()
                      setIsMenuOpen(false)
                    }}
                    className="w-full gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>&copy; 2026 MS Trading Company. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
