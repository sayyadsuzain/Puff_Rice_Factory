'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

// List of allowed users (removed validation - any Supabase user can now login)
// const ALLOWED_USERS = [
//   'mstc9001@gmail.com'
// ]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Please enter both email and password')
      return
    }

    setLoading(true)
    try {
      await signIn(email, password)
      toast.success('Signed in successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-red-600">MS TRADING COMPANY</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Bill Management System</p>
          <p className="mt-1 text-xs text-gray-500">Authorized Personnel Only</p>
        </div>

        <Card>
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-xl sm:text-2xl">Sign In</CardTitle>
            <CardDescription className="text-sm">
              Enter your credentials to access the bill management system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <div className="text-sm text-gray-600">
                <p className="font-medium">Authorized User:</p>
                <p className="mt-2 text-sm font-semibold text-red-600">MS TRADING COMPANY</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Secure bill management system for MS Trading Company
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Contact administrator for access credentials
          </p>
        </div>
      </div>
    </div>
  )
}
