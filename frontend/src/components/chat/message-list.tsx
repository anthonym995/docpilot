import { useEffect, useRef } from 'react'
import type { UIMessage } from 'ai'
import { ChatMessageItem } from '@/components/chat/chat-message-item'
import { StreamingIndicator } from '@/components/chat/streaming-indicator'

interface MessageListProps {
  messages: UIMessage[]
  isStreaming?: boolean
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
        <p className="text-sm">No messages yet. Ask a question below to start the conversation.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-2">
        {messages.map((message) => (
          <ChatMessageItem key={message.id} message={message} />
        ))}
        {isStreaming && (
          <div className="py-2">
            <StreamingIndicator />
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  )
}

