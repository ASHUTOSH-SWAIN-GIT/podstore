import { Headphones } from "lucide-react"

export default function AuthHeader() {
  return (
    <div className="flex items-center space-x-2 mb-8">
      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
        <Headphones className="w-5 h-5 text-white" />
      </div>
      <span className="text-xl font-bold text-white">Podstore</span>
    </div>
  )
} 