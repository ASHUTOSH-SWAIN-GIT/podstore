import { useState, useEffect } from 'react'

interface Session {
  id: string
  title: string
  hostId: string
  status: string
  createdAt: string
  joinToken: string
  host: {
    name: string
    email: string
  }
}

interface Participant {
  id: string
  role: string
  joinedAt: string
  leftAt: string | null
  user: {
    name: string
    email: string
  }
}

export const useSessionData = (sessionId: string) => {
  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const fetchSessionData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch session data')
      }
      const data = await response.json()
      setSession(data)
      setParticipants(data.participants || [])
    } catch (err) {
      setError('Failed to load session')
      console.error('Error fetching session:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (sessionId) {
      fetchSessionData()
    }
  }, [sessionId])

  return {
    session,
    participants,
    isLoading,
    error,
    refetchSession: fetchSessionData
  }
} 