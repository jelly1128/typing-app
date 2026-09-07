import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, get, post } from './client'

describe('client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GETが成功時にJSONをパースして返す', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: 'kazuki' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await get<{ id: number; name: string }>('/users/1')

    expect(result).toEqual({ id: 1, name: 'kazuki' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/1',
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) }),
    )
  })

  it('POSTがbodyをJSON文字列化して送信する', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: 'kazuki' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await post('/users', { name: 'kazuki' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'kazuki' }) }),
    )
  })

  it('レスポンスが4xx/5xxの場合ErrorResponseを乗せたApiErrorを投げる', async () => {
    const errorBody = {
      timestamp: '2026-09-07T00:00:00Z',
      status: 404,
      code: 'USER_NOT_FOUND',
      message: 'userId が存在しません',
      traceId: 'trace-1',
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(errorBody),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(get('/users/999')).rejects.toThrow(ApiError)
    await expect(get('/users/999')).rejects.toMatchObject({ response: errorBody })
  })
})
