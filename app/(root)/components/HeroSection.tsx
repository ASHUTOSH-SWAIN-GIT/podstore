import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Zap } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-gray-950 to-pink-900/20" />
      <div className="container mx-auto px-4 lg:px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-6 bg-purple-500/10 text-purple-300 border-purple-500/20">
            <Zap className="w-3 h-3 mr-1" />
            Now in Beta
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            Studio-Quality Recording,
            <br />
            In Your Browser
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            The collaborative audio and video recording platform built for podcasters, creators, and remote teams.
            Record locally, upload automatically, download securely.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-8 py-6 h-auto"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Recording
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-600 text-white cursor-pointer text-lg px-8 py-6 h-auto"
            >
              Watch Demo
            </Button>
          </div>
          <p className="text-sm text-gray-400 mt-4">No downloads required • Free to start • Cancel anytime</p>
        </div>
      </div>
    </section>
  )
} 