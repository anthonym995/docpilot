interface Env {
  readonly VITE_API_BASE_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

function validateEnv(): Env {
  const missing: string[] = []
  const requiredKeys = [
    'VITE_API_BASE_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ] as const

  for (const key of requiredKeys) {
    const val = import.meta.env[key]
    if (!val || typeof val !== 'string' || val.trim() === '') {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variable(s): ${missing.join(', ')}. Check frontend/.env`
    )
  }

  return {
    VITE_API_BASE_URL: (import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, ''),
    VITE_SUPABASE_URL: (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/+$/, ''),
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  }
}

export const env = validateEnv()

