'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, type User } from '@/lib/api'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    checkAuthAndRedirect()
  }, [])

  const checkAuthAndRedirect = async () => {
    try {
      const result = await apiClient.getMe()
      if (result.data?.user) {
        // User is authenticated, redirect to dashboard
        router.push('/dashboard')
      } else {
        // User not authenticated, redirect to login
        router.push('/login')
      }
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <h1 className="text-headline mb-4" style={{ color: 'var(--text-primary)' }}>Supply Chain Metric Tree</h1>
        <p className="text-body mb-8" style={{ color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  )
}
