'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the auth code from URL and exchange for session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/auth?error=auth_failed')
          return
        }

        if (data.session) {
          console.log('Authentication successful:', data.session.user)
          
          // Get return URL from query params
          const returnTo = searchParams.get('returnTo') || '/'
          
          // Decode the return URL if it's encoded
          const decodedReturnTo = decodeURIComponent(returnTo)
          
          console.log('Redirecting to:', decodedReturnTo)
          router.push(decodedReturnTo)
        } else {
          // No session found, redirect to auth page
          console.log('No session found, redirecting to auth')
          router.push('/auth?error=no_session')
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error)
        router.push('/auth?error=unexpected_error')
      }
    }

    // Small delay to ensure URL params are loaded
    const timeoutId = setTimeout(handleAuthCallback, 100)
    
    return () => clearTimeout(timeoutId)
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <p className="text-white font-light tracking-wide">Completing sign-in...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait while we redirect you</p>
      </div>
    </div>
  )
} 