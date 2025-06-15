import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mic, Cloud, Shield, Users, Download, Globe } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-gray-900/50">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need for professional recording
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Built from the ground up for creators who demand quality and
            reliability
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <Mic className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">
                High-Quality Local Recording
              </CardTitle>
              <CardDescription className="text-gray-300">
                Record crystal-clear audio and video directly in your browser
                with studio-grade quality
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <Cloud className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-white">
                Real-Time Cloud Upload
              </CardTitle>
              <CardDescription className="text-gray-300">
                Your recordings are automatically uploaded in chunks as you
                record, ensuring nothing is lost
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <CardTitle className="text-white">
                Collaborative Sessions
              </CardTitle>
              <CardDescription className="text-gray-300">
                Record with multiple participants from anywhere in the world
                with perfect synchronization
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-orange-400" />
              </div>
              <CardTitle className="text-white">
                Reliable Session Management
              </CardTitle>
              <CardDescription className="text-gray-300">
                Advanced session management with automatic cloud backup ensures
                your content is always safe
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-pink-400" />
              </div>
              <CardTitle className="text-white">
                Secure Download Access
              </CardTitle>
              <CardDescription className="text-gray-300">
                Once your session ends, securely download your high-quality
                recordings instantly
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-cyan-400" />
              </div>
              <CardTitle className="text-white">Browser-Based</CardTitle>
              <CardDescription className="text-gray-300">
                No downloads or installations required. Works perfectly in any
                modern web browser
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  );
}
