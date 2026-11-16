export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary/70" />
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary/70 [animation-delay:150ms]" />
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary/70 [animation-delay:300ms]" />
      <span className="ml-1 text-[11px] font-medium tracking-wide">Driftwood Copilot streaming...</span>
    </div>
  )
}

