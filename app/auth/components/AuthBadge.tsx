import { Check } from "lucide-react"

export default function AuthBadge() {
  return (
    <div className="mb-8">
      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
        <Check className="w-4 h-4 mr-2" /> No credit card required
      </div>
    </div>
  )
} 