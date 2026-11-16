import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThreadSidebar } from '@/components/chat/thread-sidebar'

export interface ChatLayoutContext {
  triggerRefresh: () => void
}

export function ChatLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  function triggerRefresh() {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <ThreadSidebar refreshTrigger={refreshTrigger} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 flex w-72 max-w-[80vw] flex-col bg-background shadow-xl">
            <div className="absolute top-3 right-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ThreadSidebar
              onThreadSelect={() => setMobileOpen(false)}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header Bar */}
        <div className="flex h-12 items-center border-b px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="mr-2 h-8 w-8"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">Document Copilot</span>
        </div>

        {/* Dynamic Route Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Outlet context={{ triggerRefresh } satisfies ChatLayoutContext} />
        </div>
      </div>
    </div>
  )
}

