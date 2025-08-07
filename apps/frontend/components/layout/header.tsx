"use client"

import { useEffect, useRef, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, LogOut, Search, Settings, User } from 'lucide-react'
import { ThemeToggle } from "@/components/theme-toggle"

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const [user, setUser] = useState<any>(null)
  const [notifications] = useState([
    { id: '1', message: 'New user registered', time: '5 min ago', unread: true },
    { id: '2', message: 'Face recognition event', time: '10 min ago', unread: true },
    { id: '3', message: 'System backup completed', time: '1 hour ago', unread: false }
  ])
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const unreadCount = notifications.filter(n => n.unread).length

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  return (
    <header 
      className="h-16 bg-background border-b border-border flex items-center justify-between px-4 lg:px-6 fixed top-0 left-0 right-0 z-40"
      role="banner"
      aria-label="Main header"
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        {title && (
          <div className="hidden sm:block">
            <h1 className="text-lg lg:text-xl font-semibold text-gray-900">{title}</h1>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 lg:gap-4" role="navigation" aria-label="Header navigation">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" aria-hidden="true" />
          <Input
            ref={searchInputRef}
            placeholder="Search..."
            className="pl-10 w-40 lg:w-64"
            aria-label="Search"
            type="search"
          />
        </div>

        {/* Mobile Search */}
        <div className="md:hidden">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            aria-label="Open search"
            onClick={() => searchInputRef.current?.focus()}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative h-8 w-8 p-0"
              aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  aria-label={`${unreadCount} unread notifications`}
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-w-[90vw]">
            <div className="p-3 border-b">
              <h3 className="font-medium">Notifications</h3>
            </div>
            <div className="max-h-64 overflow-y-auto" role="region" aria-label="Notifications list">
              {notifications.map((notification) => (
                <DropdownMenuItem 
                  key={notification.id} 
                  className="p-3 cursor-pointer"
                  role="option"
                  aria-selected={notification.unread}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div 
                      className={`w-2 h-2 rounded-full mt-2 ${notification.unread ? 'bg-blue-600' : 'bg-gray-300'}`}
                      aria-hidden="true"
                    />
                    <div className="flex-1">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{notification.time}</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="relative h-8 w-8 rounded-full"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User avatar" />
                <AvatarFallback className="text-xs">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" aria-hidden="true" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout} 
              className="text-red-600"
              onKeyDown={(e) => handleKeyDown(e, handleLogout)}
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
