'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  PlusCircle, 
  Play, 
  User, 
  Menu, 
  X, 
  Video,
  Folder,
  Settings
} from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const pathname = usePathname()

  const navigationItems = [
    {
      icon: Video,
      label: 'Create Session',
      href: '/dashboard/create-session',
      active: pathname === '/dashboard/create-session'
    },
    {
      icon: Folder,
      label: 'Recordings',
      href: '/dashboard/recordings',
      active: pathname === '/dashboard/recordings'
    },
    {
      icon: Settings,
      label: 'Profile',
      href: '/dashboard/profile',
      active: pathname === '/dashboard/profile'
    }
  ]

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out ${
        sidebarExpanded ? 'w-64' : 'w-16'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            {sidebarExpanded && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                  <Video className="w-5 h-5 text-sidebar-primary-foreground" />
                </div>
                <span className="text-lg font-semibold text-sidebar-foreground">PodStore</span>
              </div>
            )}
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="p-2 rounded-lg hover:bg-sidebar-accent text-white transition-colors"
            >
              {sidebarExpanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4">
            <nav className="space-y-2">
              {navigationItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <Link
                    key={index}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors group ${
                      item.active 
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarExpanded && (
                      <span className="font-medium">{item.label}</span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-sidebar-primary rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              {sidebarExpanded && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    John Doe
                  </p>
                  <p className="text-xs text-sidebar-foreground/70 truncate">
                    john@example.com
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <main className="flex-1 p-6 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}