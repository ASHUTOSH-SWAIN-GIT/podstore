import React from 'react'
import { Button } from "@/components/ui/button"
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Settings, 
  PhoneOff 
} from 'lucide-react'

interface SessionControlsProps {
  isMuted: boolean
  isVideoOff: boolean
  toggleMute: () => void
  toggleVideo: () => void
  handleEndSession: () => void
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  isMuted,
  isVideoOff,
  toggleMute,
  toggleVideo,
  handleEndSession
}) => {
  return (
    <div className="border-t border-gray-800 p-6">
      <div className="flex items-center justify-center space-x-4">
        <Button
          onClick={toggleMute}
          variant={isMuted ? "destructive" : "outline"}
          size="lg"
          className={`${
            isMuted 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        
        <Button
          onClick={toggleVideo}
          variant={isVideoOff ? "destructive" : "outline"}
          size="lg"
          className={`${
            isVideoOff 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
          }`}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="bg-gray-800 hover:bg-gray-700 border-gray-700"
        >
          <Settings className="w-5 h-5" />
        </Button>

        <Button
          onClick={handleEndSession}
          variant="destructive"
          size="lg"
          className="bg-red-500 hover:bg-red-600"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
} 