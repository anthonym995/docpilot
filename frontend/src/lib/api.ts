import { env } from '@/lib/env'
import { ApiError, httpRequest, type HttpRequestOptions } from '@/lib/http'
import { supabase } from '@/lib/supabase'

export { ApiError, type HttpRequestOptions }

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${env.VITE_API_BASE_URL}${cleanPath}`
}

async function getAuthHeaders(): Promise<Record<string, string>> {
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
}

