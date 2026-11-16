import { DefaultChatTransport } from 'ai'
import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'

export function createChatTransport(threadId: string) {
  return new DefaultChatTransport({
    api: `${env.VITE_API_BASE_URL}/chat/stream`,
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      return token ? { Authorization: `Bearer ${token}` } : {}
    },
    body: {
      threadId,
    },
  })
}
