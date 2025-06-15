import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, ArrowLeft } from 'lucide-react'

interface SessionHeaderProps {
  session: {
    id: string
    title: string
  }
  isRecording: boolean
  recordingDuration: number
  isConnected: boolean
  participantCount: number
  formatDuration: (seconds: number) => string
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  session,
  isRecording,
  recordingDuration,
  isConnected,
  participantCount,
  formatDuration
}) => {
  const router = useRouter()

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white hover:bg-gray-800/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{session.title}</h1>
              <p className="text-sm text-gray-400">Session ID: {session.id}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {isRecording && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-mono">{formatDuration(recordingDuration)}</span>
              </div>
            )}
            
            <Badge variant={isConnected ? "default" : "secondary"} className="bg-green-500/10 text-green-400 border-green-500/20">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              {isConnected ? 'Connected' : 'Connecting...'}
            </Badge>
            
            <div className="flex items-center space-x-2 text-gray-400">
              <Users className="w-4 h-4" />
              <span>{participantCount + 1}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
} 