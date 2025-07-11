import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{ backgroundColor: '#9671ff' }} />
      <div className="container mx-auto px-4 lg:px-6 relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to create your best content yet?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of creators who trust Podstore for their recording
            needs. Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-white text-lg px-8 py-6 h-auto hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#9671ff' }}
            >
              <Play className="w-5 h-5 mr-2" />
              Try Podstore for Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 text-lg px-8 py-6 h-auto"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
