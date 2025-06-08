"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/hooks/useAuth"
import { Headphones, User, LogOut, Settings, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function Header() {
  const router = useRouter()
  const { user, signOut, loading } = useAuth()

  const handleRedirect = () => {
    router.push('/auth')
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const getUserInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    if (user?.user_metadata?.name) {
      return user.user_metadata.name
    }
    return user?.email?.split('@')[0] || 'User'
  }

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
          {loading ? (
            <div className="flex items-center space-x-3 animate-pulse">
              <div className="w-9 h-9 bg-gray-700 rounded-full"></div>
              <div className="hidden sm:block space-y-1.5">
                <div className="w-16 h-3 bg-gray-700 rounded"></div>
                <div className="w-20 h-2 bg-gray-600 rounded"></div>
              </div>
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="h-auto p-2 space-x-3 hover:bg-gray-800/50 transition-colors duration-200 rounded-lg"
                >
                  <Avatar className="w-9 h-9 border border-gray-600">
                    <AvatarImage 
                      src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                      alt={getUserDisplayName()}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-medium">
                      {getUserInitials(user.user_metadata?.full_name || user.user_metadata?.name, user.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-white">
                      {getUserDisplayName()}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-32">
                      {user.email}
                    </div>
                  </div>

                  <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent className="w-56 bg-gray-900 border-gray-700 shadow-xl" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage 
                          src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                          alt={getUserDisplayName()}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium">
                          {getUserInitials(user.user_metadata?.full_name || user.user_metadata?.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{getUserDisplayName()}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator className="bg-gray-700" />
                
                <DropdownMenuItem 
                  className="text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer focus:bg-gray-800 focus:text-white"
                  onClick={() => router.push('/dashboard')}
                >
                  <User className="mr-3 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  className="text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer focus:bg-gray-800 focus:text-white"
                  onClick={() => router.push('/settings')}
                >
                  <Settings className="mr-3 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-gray-700" />
                
                <DropdownMenuItem 
                  className="text-red-400 hover:bg-red-900/20 hover:text-red-300 cursor-pointer focus:bg-red-900/20 focus:text-red-300"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button 
                variant="ghost" 
                className="text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors"
                onClick={handleRedirect}
              >
                Sign In
              </Button>
              <Button 
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all"
                onClick={handleRedirect}
              >
                Try Free
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
} 