import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LogOut, MessageSquare, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/use-auth'
import { api, type ChatThread } from '@/lib/api'

interface ThreadSidebarProps {
  onThreadSelect?: () => void
  refreshTrigger?: number
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 24 && now.getDate() === date.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export function ThreadSidebar({ onThreadSelect, refreshTrigger }: ThreadSidebarProps) {
  const { user, signOut } = useAuth()
  const { threadId } = useParams<{ threadId?: string }>()
  const navigate = useNavigate()
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadThreads() {
      try {
        const data = await api.chats.list()
        if (!cancelled) {
          setThreads(data)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load threads:', err)
          setIsLoading(false)
        }
      }
    }

    void loadThreads()

    return () => {
      cancelled = true
    }
  }, [refreshTrigger, threadId])

  function handleNewChat() {
    onThreadSelect?.()
    navigate('/')
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-muted/20">
      {/* Brand & New Chat */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-semibold tracking-tight text-foreground">Document Copilot</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Driftwood
          </span>
        </Link>
      </div>

      <div className="p-3">
        <Button
          onClick={handleNewChat}
          variant="outline"
          className="w-full justify-start gap-2 shadow-2xs"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </Button>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        <div className="mb-2 px-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          Past Conversations
        </div>

        {isLoading ? (
          <div className="space-y-1.5 px-2 py-4 text-xs text-muted-foreground">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ) : threads.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            No past conversations yet.
          </div>
        ) : (
          <div className="space-y-0.5">
            {threads.map((t) => {
              const isActive = t.id === threadId
              return (
                <Link
                  key={t.id}
                  to={`/c/${t.id}`}
                  onClick={onThreadSelect}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                    isActive
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{t.title}</span>
                  </div>
                  <span className="shrink-0 text-[10px] opacity-60">
                    {formatDate(t.updated_at)}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer / User Profile */}
      <div className="border-t p-3">
        <div className="flex items-center justify-between gap-2 rounded-lg bg-card/50 p-2 text-xs">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground">Analyst Session</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void signOut()}
            title="Sign out"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  )
}

