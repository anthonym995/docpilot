export class ApiError extends Error {
  readonly status: number
  readonly statusText: string
  readonly data: unknown
  readonly isNetworkError: boolean

  constructor(options: {
    message: string
    status?: number
    statusText?: string
    data?: unknown
    isNetworkError?: boolean
  }) {
    super(options.message)
    this.name = 'ApiError'
    this.status = options.status ?? 0
    this.statusText = options.statusText ?? ''
    this.data = options.data
    this.isNetworkError = options.isNetworkError ?? false
  }
}

export interface HttpRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  timeoutMs?: number
  headers?: Record<string, string>
}

const DEFAULT_TIMEOUT_MS = 30000

export async function httpRequest<T = unknown>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<T> {
  const { body, timeoutMs = DEFAULT_TIMEOUT_MS, headers = {}, signal, ...rest } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs)

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(signal.reason))
  }

  const finalHeaders: Record<string, string> = { ...headers }
  let finalBody: BodyInit | null | undefined = undefined

  if (body !== undefined && body !== null) {
    if (
      typeof body === 'string' ||
      body instanceof FormData ||
      body instanceof Blob ||
      body instanceof URLSearchParams
    ) {
      finalBody = body as BodyInit
    } else {
      finalHeaders['Content-Type'] = 'application/json'
      finalBody = JSON.stringify(body)
    }
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      body: finalBody,
      signal: controller.signal,
    })
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    const isAbort =
      err instanceof DOMException && err.name === 'AbortError'
    const message = err instanceof Error ? err.message : 'Network request failed'

    throw new ApiError({
      message: isAbort ? 'Request timed out' : `Network error: ${message}`,
      isNetworkError: true,
      data: err,
    })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    let errorData: unknown = undefined
    let errorMessage = `HTTP error ${response.status}: ${response.statusText}`

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        errorData = await response.json()
        if (
          errorData &&
          typeof errorData === 'object' &&
          'detail' in errorData &&
          typeof (errorData as { detail: unknown }).detail === 'string'
        ) {
          errorMessage = (errorData as { detail: string }).detail
        } else if (
          errorData &&
          typeof errorData === 'object' &&
          'message' in errorData &&
          typeof (errorData as { message: unknown }).message === 'string'
        ) {
          errorMessage = (errorData as { message: string }).message
        }
      } catch {
        // Fall back to default status text message
      }
    } else {
      try {
        const text = await response.text()
        if (text) {
          errorMessage = text
        }
      } catch {
        // Fall back to default status text message
      }
    }

    throw new ApiError({
      message: errorMessage,
      status: response.status,
      statusText: response.statusText,
      data: errorData,
      isNetworkError: false,
    })
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.text()) as unknown as T
}

