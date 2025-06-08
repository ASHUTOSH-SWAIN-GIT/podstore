import { Button } from "@/components/ui/button"
import { Headphones } from "lucide-react"
import Link from "next/link"

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">Podstore</span>
        </div>
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="#features" className="text-gray-300 hover:text-white transition-colors">
            Features
          </Link>
          <Link href="#testimonials" className="text-gray-300 hover:text-white transition-colors">
            Testimonials
          </Link>
          <Link href="#faq" className="text-gray-300 hover:text-white transition-colors">
            FAQ
          </Link>
          <Link href="#" className="text-gray-300 hover:text-white transition-colors">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" className="text-gray-300 hover:text-white">
            Sign In
          </Button>
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            Try Free
          </Button>
        </div>
      </div>
    </header>
  )
} 