import { env } from '@/lib/env'
import { ApiError, httpRequest, type HttpRequestOptions } from '@/lib/http'
import { supabase } from '@/lib/supabase'

export { ApiError, type HttpRequestOptions }

export interface ChatThread {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  thread_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  parts?: Array<{ type: string; text?: string }>
  created_at: string
}

export interface ThreadDetail extends ChatThread {
  messages: ChatMessage[]
}

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${env.VITE_API_BASE_URL}${cleanPath}`
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

export const api = {
  async get<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    const authHeaders = await getAuthHeaders()
    return httpRequest<T>(resolveUrl(path), {
      ...options,
      method: 'GET',
      headers: { ...authHeaders, ...options?.headers },
    })
  },

  async post<T>(path: string, body?: unknown, options?: HttpRequestOptions): Promise<T> {
    const authHeaders = await getAuthHeaders()
    return httpRequest<T>(resolveUrl(path), {
      ...options,
      method: 'POST',
      body,
      headers: { ...authHeaders, ...options?.headers },
    })
  },

  async put<T>(path: string, body?: unknown, options?: HttpRequestOptions): Promise<T> {
    const authHeaders = await getAuthHeaders()
    return httpRequest<T>(resolveUrl(path), {
      ...options,
      method: 'PUT',
      body,
      headers: { ...authHeaders, ...options?.headers },
    })
  },

  async patch<T>(path: string, body?: unknown, options?: HttpRequestOptions): Promise<T> {
    const authHeaders = await getAuthHeaders()
    return httpRequest<T>(resolveUrl(path), {
      ...options,
      method: 'PATCH',
      body,
      headers: { ...authHeaders, ...options?.headers },
    })
  },

  async delete<T>(path: string, options?: HttpRequestOptions): Promise<T> {
    const authHeaders = await getAuthHeaders()
    return httpRequest<T>(resolveUrl(path), {
      ...options,
      method: 'DELETE',
      headers: { ...authHeaders, ...options?.headers },
    })
  },

  chats: {
    list(): Promise<ChatThread[]> {
      return api.get<ChatThread[]>('/chat/threads')
    },
    create(title?: string): Promise<ChatThread> {
      return api.post<ChatThread>('/chat/threads', { title: title || 'New Chat' })
    },
    get(threadId: string): Promise<ThreadDetail> {
      return api.get<ThreadDetail>(`/chat/threads/${threadId}`)
    },
    getMessages(threadId: string): Promise<ChatMessage[]> {
      return api.get<ChatMessage[]>(`/chat/threads/${threadId}/messages`)
    },
  },
}
