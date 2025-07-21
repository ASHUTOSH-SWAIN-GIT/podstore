'use client'

import { 
  PlusCircle, 
  Play, 
  Video
} from 'lucide-react'
import DashboardLayout from '@/app/dashboard/components/dashboard-layout'

export default function Dashboard() {
  return (
    <DashboardLayout>
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 mb-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's what's happening with your recordings.</p>
          </div>
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg">
            <PlusCircle className="w-4 h-4" />
            <span>New Session</span>
          </button>
        </div>
      </header>

      {/* Welcome Section */}
      <div className="mb-8">
        <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
          <h2 className="text-xl font-semibold text-card-foreground mb-2">
            Welcome to PodStore
          </h2>
          <p className="text-muted-foreground mb-4">
            Start recording professional-quality podcasts and meetings with ease. 
            Your content is automatically saved and ready to share.
          </p>
          <div className="flex space-x-4">
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-lg">
              <Video className="w-5 h-5" />
              <span>Start Recording</span>
            </button>
            <button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-lg">
              <Play className="w-5 h-5" />
              <span>View Recordings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Recordings Grid */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Recordings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Recording Card 1 */}
          <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-colors shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">2 hours ago</span>
            </div>
            <h4 className="font-semibold text-card-foreground mb-2">Weekly Team Standup</h4>
            <p className="text-sm text-muted-foreground mb-4">45 minutes • 3 participants</p>
            <button className="w-full bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg transition-colors">
              View Recording
            </button>
          </div>

          {/* Recording Card 2 */}
          <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-colors shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground">1 day ago</span>
            </div>
            <h4 className="font-semibold text-card-foreground mb-2">Podcast Episode #24</h4>
            <p className="text-sm text-muted-foreground mb-4">1h 20m • 2 participants</p>
            <button className="w-full bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg transition-colors">
              View Recording
            </button>
          </div>

          {/* Recording Card 3 */}
          <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-colors shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-secondary-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">3 days ago</span>
            </div>
            <h4 className="font-semibold text-card-foreground mb-2">Client Interview</h4>
            <p className="text-sm text-muted-foreground mb-4">30 minutes • 2 participants</p>
            <button className="w-full bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg transition-colors">
              View Recording
            </button>
            </div>
          </div>
        </div>
    </DashboardLayout>
  )
}