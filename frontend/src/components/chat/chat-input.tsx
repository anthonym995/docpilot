import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  onSubmit: (prompt: string) => void | Promise<void>
  isStreaming?: boolean
  onStop?: () => void
  placeholder?: string
  disabled?: boolean
}

export function ChatInput({
  onSubmit,
  isStreaming = false,
  onStop,
  placeholder = 'Ask a question about SEC filings (e.g., Apple 2023 revenue drivers)...',
  disabled = false,
}: ChatInputProps) {
  const [value, setValue] = useState('')

  function handleSubmit(e?: FormEvent) {
    if (e) e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || isStreaming || disabled) return
    setValue('')
    void onSubmit(trimmed)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t bg-background/80 p-4 backdrop-blur-sm md:px-8">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm transition-focus-within focus-within:ring-2 focus-within:ring-ring"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />

        {isStreaming ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="h-9 w-9 shrink-0 rounded-xl"
            onClick={onStop}
            title="Stop generation"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!value.trim() || disabled}
            className="h-9 w-9 shrink-0 rounded-xl"
            title="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </form>
      <div className="mx-auto mt-2 max-w-3xl text-center">
        <p className="text-[11px] text-muted-foreground">
          Driftwood Copilot synthesizes financial facts strictly from 10-K filings.
        </p>
      </div>
    </div>
  )
}

