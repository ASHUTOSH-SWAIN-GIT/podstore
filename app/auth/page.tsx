'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import GoogleSignIn from './GoogleSignIn'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  
  const [guestId, setGuestId] = useState('')
  const [error, setError] = useState('')

  // Get return URL from query params
  const returnTo = searchParams.get('returnTo') || '/'
  const sessionId = searchParams.get('sessionId')
  const userId = searchParams.get('userId')
  const urlError = searchParams.get('error')

  // Handle URL error messages
  useEffect(() => {
    if (urlError) {
      switch (urlError) {
        case 'auth_failed':
          setError('Authentication failed. Please try again.')
          break
        case 'no_session':
          setError('No session found. Please sign in again.')
          break
        case 'unexpected_error':
          setError('An unexpected error occurred. Please try again.')
          break
        default:
          setError('An error occurred during authentication.')
      }
    }
  }, [urlError])

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push(returnTo)
    }
  }, [user, loading, router, returnTo])

  // Auto-populate guest ID from URL
  useEffect(() => {
    if (userId) {
      setGuestId(userId)
    }
  }, [userId])

  const handleGoogleSuccess = () => {
    console.log('Google sign-in successful')
    // Redirect will be handled by auth context
  }

  const handleGoogleError = (error: string) => {
    setError(`Google sign-in failed: ${error}`)
  }

  const handleGuestContinue = () => {
    if (!guestId.trim()) {
      setError('Please enter a guest ID')
      return
    }

    // Build return URL with guest credentials
    const url = new URL(returnTo, window.location.origin)
    url.searchParams.set('userId', guestId)
    if (sessionId) {
      url.searchParams.set('sessionId', sessionId)
    }
    
    router.push(url.toString())
  }

  // Clear URL error when user starts interacting
  const clearError = () => {
    setError('')
    // Clear URL params without reload
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('error')
    window.history.replaceState({}, '', newUrl.toString())
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white font-light tracking-wide">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-none shadow-2xl border border-gray-200">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light text-black tracking-wide mb-2">
              Welcome to Podstore
            </h1>
            <p className="text-gray-600 text-sm">
              Sign in to continue or join as a guest
            </p>
          </div>

          {/* Show session info if joining via invite */}
          {sessionId && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200">
              <p className="text-blue-800 text-sm text-center">
                📋 You're joining session: <strong>{sessionId}</strong>
              </p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200">
              <div className="flex justify-between items-start">
                <p className="text-red-800 text-sm flex-1">
                  {error}
                </p>
                <button
                  onClick={clearError}
                  className="text-red-600 hover:text-red-800 ml-2 text-lg leading-none"
                  title="Dismiss error"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Google Sign-In */}
            <div>
              <GoogleSignIn
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                redirectTo={`${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center">
              <hr className="flex-1 border-gray-300" />
              <span className="px-4 text-xs text-gray-500 uppercase tracking-wider">
                Or continue as guest
              </span>
              <hr className="flex-1 border-gray-300" />
            </div>

            {/* Guest ID Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                Guest Identifier
              </label>
              <input
                type="text"
                placeholder="Enter your guest ID"
                value={guestId}
                onChange={(e) => {
                  setGuestId(e.target.value)
                  clearError()
                }}
                className="w-full px-4 py-3 bg-white border border-gray-300 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors duration-200"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleGuestContinue()
                  }
                }}
              />
            </div>

            {/* Continue as Guest Button */}
            <button
              onClick={handleGuestContinue}
              disabled={!guestId.trim()}
              className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 text-white font-light py-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 tracking-wide uppercase text-sm"
            >
              Continue as Guest
            </button>

            {/* Additional Links */}
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500">
                By continuing, you agree to our terms of service
              </p>
              <div className="flex justify-center space-x-4 text-xs">
                <Link href="/privacy" className="text-gray-600 hover:text-black">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-gray-600 hover:text-black">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 