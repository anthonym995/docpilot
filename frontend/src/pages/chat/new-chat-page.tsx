import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Building2, FileText, Sparkles, TrendingUp } from 'lucide-react'
import { ChatInput } from '@/components/chat/chat-input'
import type { ChatLayoutContext } from '@/components/chat/chat-layout'
import { api } from '@/lib/api'

const STARTER_PROMPTS = [
  {
    icon: TrendingUp,
    title: "Apple FY2023 Revenue",
    prompt: "What were Apple's primary revenue drivers and segment performance in fiscal 2023?",
  },
  {
    icon: Sparkles,
    title: "Nvidia Data Center Growth",
    prompt: "Summarize Nvidia's data center revenue trajectory and key supply chain risks.",
  },
  {
    icon: Building2,
    title: "Microsoft Cloud Margins",
    prompt: "How did Microsoft's Intelligent Cloud revenue and operating margins change in 2023?",
  },
  {
    icon: FileText,
    title: "Amazon Risk Factors",
    prompt: "What were the primary risk factors disclosed in Amazon's Item 1A filing?",
  },
]

export function NewChatPage() {
  const navigate = useNavigate()
  const { triggerRefresh } = useOutletContext<ChatLayoutContext>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleStartChat(promptText: string) {
    if (isSubmitting || !promptText.trim()) return
    setIsSubmitting(true)

    try {
      // Derive short title from prompt
      const title = promptText.length > 35 ? `${promptText.slice(0, 35)}...` : promptText
      const thread = await api.chats.create(title)
      triggerRefresh()
      // Navigate to active thread passing initial query in state so ThreadPage can send immediately
      navigate(`/c/${thread.id}`, { state: { initialPrompt: promptText } })
    } catch (err) {
      console.error('Failed to create thread:', err)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden">
      {/* Center Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            SEC 10-K Filing Intelligence
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Document Copilot
          </h1>

          <p className="text-sm text-muted-foreground">
            Built for Driftwood Capital analysts. Query SEC EDGAR 10-K filings for verified,
            source-grounded financial figures and risk disclosures.
          </p>
        </div>

        {/* Starter Prompt Chips */}
        <div className="mx-auto mt-8 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
          {STARTER_PROMPTS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => void handleStartChat(item.prompt)}
                disabled={isSubmitting}
                className="flex items-start gap-3 rounded-xl border bg-card p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/40 hover:shadow-2xs disabled:opacity-50"
              >
                <div className="mt-0.5 rounded-lg border bg-muted p-1.5 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{item.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{item.prompt}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Input Form */}
      <ChatInput
        onSubmit={handleStartChat}
        disabled={isSubmitting}
        placeholder="Ask any question about SEC 10-K filings..."
      />
    </div>
  )
}

