export default function Testimonial() {
  return (
    <div className="mt-12">
      <div className="bg-gray-800/50 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-semibold">SJ</span>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-300">
              "Podstore has completely transformed how we record our weekly podcast. The quality is incredible and
              the collaborative features make remote recording seamless."
            </p>
            <p className="mt-2 text-sm font-medium text-white">Sarah Johnson</p>
            <p className="text-xs text-gray-400">Host of Tech Talk Weekly</p>
          </div>
        </div>
      </div>
    </div>
  )
} 