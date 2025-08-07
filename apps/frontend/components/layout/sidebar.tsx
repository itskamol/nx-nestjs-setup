"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Activity, BarChart3, Camera, ChevronLeft, ChevronRight, LayoutDashboard, LogOut, Menu, Settings, UserCheck, Users, X } from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users
  },
  {
    name: 'Face Recognition',
    href: '/face-recognition',
    icon: Camera,
    children: [
      {
        name: 'Overview',
        href: '/face-recognition'
      },
      {
        name: 'Enroll Face',
        href: '/face-recognition/enroll'
      },
      {
        name: 'Events',
        href: '/face-recognition/events'
      },
      {
        name: 'Statistics',
        href: '/face-recognition/stats'
      }
    ]
  },
  {
    name: 'Activity',
    href: '/activity',
    icon: Activity
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings
  }
]

interface SidebarContentProps {
  collapsed: boolean
  expandedItems: string[]
  onToggleExpanded: (href: string) => void
  onToggleCollapse: () => void
  onLogout: () => void
  pathname: string
  isMobile?: boolean
  onCloseMobile?: () => void
}

function SidebarContent({ 
  collapsed, 
  expandedItems, 
  onToggleExpanded, 
  onToggleCollapse, 
  onLogout, 
  pathname, 
  isMobile,
  onCloseMobile 
}: SidebarContentProps) {

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      isMobile && "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-lg">StaffMS</span>
          </div>
        )}
        {isMobile ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseMobile}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href  }/`)
            const isExpanded = expandedItems.includes(item.href)
            const hasChildren = item.children && item.children.length > 0

            return (
              <div key={item.name}>
                <Link href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-10",
                      collapsed && "justify-center px-2",
                      isMobile && "justify-start px-2"
                    )}
                    onClick={() => {
                      if (hasChildren && !collapsed && !isMobile) {
                        onToggleExpanded(item.href)
                      }
                      if (isMobile && onCloseMobile) {
                        onCloseMobile()
                      }
                    }}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.name}</span>
                        {hasChildren && (
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-90"
                          )} />
                        )}
                      </>
                    )}
                  </Button>
                </Link>

                {/* Sub-navigation */}
                {hasChildren && !collapsed && isExpanded && (
                  <div className="ml-6 mt-2 space-y-1">
                    {item.children.map((child) => (
                      <Link key={child.name} href={child.href}>
                        <Button
                          variant={pathname === child.href ? "secondary" : "ghost"}
                          className="w-full justify-start h-8 text-sm"
                          onClick={() => isMobile && onCloseMobile?.()}
                        >
                          {child.name}
                        </Button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-10 text-red-600 hover:text-red-700 hover:bg-red-50",
            collapsed && "justify-center px-2",
            isMobile && "justify-start px-2"
          )}
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {(!collapsed || isMobile) && <span>Logout</span>}
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['/face-recognition'])
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent
              collapsed={false}
              expandedItems={expandedItems}
              onToggleExpanded={toggleExpanded}
              onToggleCollapse={() => setCollapsed(!collapsed)}
              onLogout={handleLogout}
              pathname={pathname}
              isMobile={true}
              onCloseMobile={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SidebarContent
          collapsed={collapsed}
          expandedItems={expandedItems}
          onToggleExpanded={toggleExpanded}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          onLogout={handleLogout}
          pathname={pathname}
        />
      </div>
    </>
  )
}
