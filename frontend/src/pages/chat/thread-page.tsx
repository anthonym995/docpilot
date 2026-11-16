import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'
import { AlertCircle } from 'lucide-react'
import { ChatInput } from '@/components/chat/chat-input'
import { MessageList } from '@/components/chat/message-list'
import { api, type ChatMessage } from '@/lib/api'
import { createChatTransport } from '@/lib/chat-transport'

interface LocationState {
  initialPrompt?: string
}

function toUIMessage(msg: ChatMessage): UIMessage {
  return {
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts:
      msg.parts && msg.parts.length > 0
        ? (msg.parts as UIMessage['parts'])
        : [{ type: 'text', text: msg.content }],
  }
}

interface ThreadChatViewProps {
  threadId: string
  initialMessages: UIMessage[]
  initialPrompt?: string
}

function ThreadChatView({ threadId, initialMessages, initialPrompt }: ThreadChatViewProps) {
  const transport = useMemo(() => createChatTransport(threadId), [threadId])
  const initialPromptSent = useRef(false)

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  })

  const isStreaming = status === 'submitted' || status === 'streaming'

  // If a prompt was handed over from NewChatPage, send it once
  useEffect(() => {
    if (initialPrompt && !initialPromptSent.current) {
      initialPromptSent.current = true
      // Clear location state so refresh doesn't resend
      window.history.replaceState({}, '')
      void sendMessage({ text: initialPrompt })
    }
  }, [initialPrompt, sendMessage])

  async function handleSend(prompt: string) {
    await sendMessage({ text: prompt })
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {error && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Error streaming assistant response: {error.message}</span>
        </div>
      )}

      <MessageList messages={messages} isStreaming={isStreaming} />

      <ChatInput
        onSubmit={handleSend}
        isStreaming={isStreaming}
        onStop={stop}
      />
    </div>
  )
}

export function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>()
  const location = useLocation()
  const state = location.state as LocationState | null
  const initialPrompt = state?.initialPrompt

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])

  useEffect(() => {
    let cancelled = false
    if (!threadId) return

    async function loadThread() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const msgs = await api.chats.getMessages(threadId!)
        if (!cancelled) {
          setInitialMessages(msgs.map(toUIMessage))
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load thread messages:', err)
          setLoadError(err instanceof Error ? err.message : 'Failed to load conversation')
          setIsLoading(false)
        }
      }
    }

    void loadThread()

    return () => {
      cancelled = true
    }
  }, [threadId])

  if (!threadId) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-muted-foreground">
        <div className="space-y-2">
          <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p>Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-sm font-medium text-destructive">Failed to load thread</p>
          <p className="text-xs text-muted-foreground">{loadError}</p>
        </div>
      </div>
    )
  }

  return (
    <ThreadChatView
      key={threadId}
      threadId={threadId}
      initialMessages={initialMessages}
      initialPrompt={initialPrompt}
    />
  )
}

