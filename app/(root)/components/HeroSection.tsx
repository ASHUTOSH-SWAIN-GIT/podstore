import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Star, CheckCircle } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-black" />
      
      <div className="container mx-auto px-4 lg:px-6 relative h-full min-h-screen">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen py-20">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Create your
                <br />
                <span style={{ color: '#9671ff' }}>
                  best content yet.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-lg">
                Your online studio to record in high quality, edit in a flash, and go live with a bang. Not necessarily in that order.
              </p>
            </div>

            {/* Content Type Selection */}
            <div className="space-y-4">
              <p className="text-white font-medium">What would you like to start creating?</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 border-gray-600 rounded focus:ring-2" style={{ accentColor: '#9671ff' }} />
                  <span className="text-gray-300">Podcasts</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 border-gray-600 rounded focus:ring-2" style={{ accentColor: '#9671ff' }} />
                  <span className="text-gray-300">Video interviews</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 border-gray-600 rounded focus:ring-2" style={{ accentColor: '#9671ff' }} />
                  <span className="text-gray-300">Social media clips</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 border-gray-600 rounded focus:ring-2" style={{ accentColor: '#9671ff' }} />
                  <span className="text-gray-300">Transcriptions</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 border-gray-600 rounded focus:ring-2" style={{ accentColor: '#9671ff' }} />
                  <span className="text-gray-300">Webinars</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 border-gray-600 rounded focus:ring-2" style={{ accentColor: '#9671ff' }} />
                  <span className="text-gray-300">Video marketing</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 border-gray-600 rounded focus:ring-2" style={{ accentColor: '#9671ff' }} />
                  <span className="text-gray-300">AI show notes</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 border-gray-600 rounded focus:ring-2" style={{ accentColor: '#9671ff' }} />
                  <span className="text-gray-300">Captions</span>
                </label>
              </div>
            </div>

            {/* CTA Button */}
            <div className="space-y-4">
              <Button
                size="lg"
                className="text-white text-lg px-8 py-6 h-auto rounded-lg font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#9671ff' }}
              >
                Start for Free
              </Button>
              <p className="text-sm text-gray-400">
                * No credit card needed. Free plan available.
              </p>
            </div>
          </div>

          {/* Right Column - Black Background Area */}
          <div className="hidden lg:block">
            <div className="w-full h-[600px] bg-black rounded-2xl border border-gray-800 relative overflow-hidden">
              {/* Optional: Add some subtle pattern or gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/30 to-transparent" />
              
              {/* Optional: Add some decorative elements */}
              <div className="absolute top-8 right-8 w-2 h-2 rounded-full opacity-60" style={{ backgroundColor: '#9671ff' }} />
              <div className="absolute bottom-12 left-12 w-3 h-3 rounded-full opacity-40" style={{ backgroundColor: '#9671ff' }} />
              <div className="absolute top-1/3 left-8 w-1 h-1 bg-white rounded-full opacity-30" />
            </div>
          </div>
        </div>

        {/* Trust Section */}
        <div className="border-t border-gray-800 py-12">
          <div className="text-center space-y-8">
            <p className="text-gray-400">Trusted by individuals & businesses</p>
            
            {/* Rating */}
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="bg-orange-500 rounded-lg p-2">
                  <span className="text-white font-bold text-sm">G2</span>
                </div>
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-white font-semibold">4.8</span>
                <span className="text-gray-400">On G2 with 881 reviews</span>
              </div>
            </div>

            {/* Company Logos */}
            <div className="flex items-center justify-center space-x-8 md:space-x-12 opacity-60">
              <div className="text-gray-400 font-bold text-lg">New York Times</div>
              <div className="text-gray-400 font-bold text-lg">BUSINESS INSIDER</div>
              <div className="text-gray-400 font-bold text-lg">TED</div>
              <div className="text-gray-400 font-bold text-lg">The Economist</div>
              <div className="text-gray-400 font-bold text-lg">npr</div>
              <div className="text-gray-400 font-bold text-lg">Spotify</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
