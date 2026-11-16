import type { UIMessage } from 'ai'
import { Bot, User } from 'lucide-react'

interface ChatMessageItemProps {
  message: UIMessage
}

function getMessageText(message: UIMessage): string {
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('')
  }
  // Fallback if content property is present
  const anyMsg = message as unknown as { content?: string }
  return anyMsg.content || ''
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === 'user'
  const text = getMessageText(message)

  return (
    <div
      className={`group flex w-full gap-3 py-4 transition-colors ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg border bg-card text-primary shadow-xs">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
          isUser
            ? 'bg-primary text-primary-foreground shadow-xs'
            : 'border bg-card/60 text-foreground shadow-xs'
        }`}
      >
        <div className="mb-1 flex items-center gap-2 text-[11px] font-medium opacity-70">
          <span>{isUser ? 'You' : 'Driftwood Copilot'}</span>
        </div>
        <div className="whitespace-pre-wrap break-words font-sans">
          {text}
        </div>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg border bg-muted text-muted-foreground shadow-xs">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}

