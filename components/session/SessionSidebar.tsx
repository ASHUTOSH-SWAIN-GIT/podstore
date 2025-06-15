import React from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Copy, 
  Settings, 
  Clock,
  Share2
} from 'lucide-react'
import { format } from 'date-fns'

interface SessionSidebarProps {
  session: {
    id: string
    title: string
    createdAt: string
    status: string
    joinToken: string
    host: {
      name: string
      email: string
    }
  }
  copyInviteLink: () => void
  toggleRecording: () => void
  isRecording: boolean
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  session,
  copyInviteLink,
  toggleRecording,
  isRecording
}) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'live': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'ended': return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'scheduled': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  return (
    <div className="w-80 border-l border-gray-800 p-6 space-y-6">
      {/* Session Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Session Info</h3>
        <div className="space-y-3">
          <div className="p-3 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Host</div>
            <div className="text-white">{session.host.name}</div>
          </div>
          
          <div className="p-3 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created</div>
            <div className="text-white flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {format(new Date(session.createdAt), 'MMM d, yyyy h:mm a')}
            </div>
          </div>
        </div>
      </div>

      {/* Invite */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Invite Others</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Invite Link</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={`${window.location.origin}/join/${session.joinToken}`}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Button
                size="sm"
                onClick={copyInviteLink}
                className="bg-gray-800 hover:bg-gray-700 text-white"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <Button
            onClick={copyInviteLink}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Invite Link
          </Button>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Recording</h3>
        <Button
          onClick={toggleRecording}
          className={`w-full ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
          }`}
        >
          {isRecording ? (
            <>
              <div className="w-4 h-4 bg-white rounded-sm mr-2"></div>
              Stop Recording
            </>
          ) : (
            <>
              <div className="w-4 h-4 bg-white rounded-full mr-2"></div>
              Start Recording
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 