import type { ErrorResponse } from '../types/api'

const BASE_URL = '/api'
const TIMEOUT_MS = 90_000

export class ApiError extends Error {
  readonly response: ErrorResponse

  constructor(response: ErrorResponse) {
    super(response.message)
    this.name = 'ApiError'
    this.response = response
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const errorBody: ErrorResponse = await response.json()
    throw new ApiError(errorBody)
  }
  return (await response.json()) as T
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}
