import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/context/use-auth'

interface BackendMeResponse {
  status: string
  user_id: string
  email: string
}

export function ChatPage() {
  const { user, signOut } = useAuth()
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [backendData, setBackendData] = useState<BackendMeResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function checkBackend() {
      try {
        const data = await api.get<BackendMeResponse>('/auth/me')
        if (!cancelled) {
          setBackendData(data)
          setBackendStatus('connected')
        }
      } catch (err) {
        if (!cancelled) {
          setBackendStatus('error')
          if (err instanceof ApiError && err.isNetworkError) {
            setErrorMessage('Could not connect to FastAPI server at localhost:8000. Is it running?')
          } else if (err instanceof ApiError) {
            setErrorMessage(`Backend returned HTTP ${err.status}: ${err.message}`)
          } else {
            setErrorMessage(err instanceof Error ? err.message : 'Unknown error')
          }
        }
      }
    }

    void checkBackend()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight">
            Document Copilot
          </span>
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Driftwood Capital
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">
              Authentication Verified
            </h2>
            <p className="text-sm text-muted-foreground">
              Supabase session active for{' '}
              <span className="font-medium text-foreground">{user?.email}</span>
            </p>
          </div>

          <div className="rounded-lg border p-4 text-left text-xs space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">Backend Verification:</span>
              {backendStatus === 'checking' && (
                <span className="text-amber-500 font-medium">Checking GET /auth/me...</span>
              )}
              {backendStatus === 'connected' && (
                <span className="text-emerald-500 font-medium">● Connected (HTTP 200)</span>
              )}
              {backendStatus === 'error' && (
                <span className="text-destructive font-medium">✕ Connection failed</span>
              )}
            </div>

            {backendData && (
              <div className="space-y-1 pt-1 font-mono text-[11px] text-muted-foreground">
                <p>Status: <span className="text-foreground">{backendData.status}</span></p>
                <p>User ID: <span className="text-foreground">{backendData.user_id}</span></p>
                <p>Token email: <span className="text-foreground">{backendData.email}</span></p>
              </div>
            )}

            {errorMessage && (
              <p className="text-destructive pt-1">{errorMessage}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Ready to wire up thread creation and streaming chat orchestrator.
          </p>
        </div>
      </main>
    </div>
  )
}
