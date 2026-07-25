import { describe, it, expect, vi, afterEach } from 'vitest'
import { ApiError, createLobby, getGameTypes, listLobbies } from './api'

function mockFetch(impl: () => Promise<Response> | Response): void {
  vi.stubGlobal('fetch', vi.fn(impl))
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api error handling', () => {
  it('returns the parsed body on success', async () => {
    mockFetch(() => jsonResponse({ lobby: 'bold-otter' }))

    await expect(createLobby()).resolves.toBe('bold-otter')
  })

  it('throws instead of yielding the string "undefined" on a failed create', async () => {
    // The regression this guards: an unchecked fetch turned a 500 into
    // String(undefined) === "undefined", which then routed to /lobby/undefined.
    mockFetch(() => jsonResponse({ detail: 'boom' }, 500))

    await expect(createLobby()).rejects.toBeInstanceOf(ApiError)
  })

  it('reports the status of a failed response', async () => {
    mockFetch(() => jsonResponse({}, 404))

    await expect(listLobbies()).rejects.toMatchObject({ status: 404 })
  })

  it('reports a status of 0 when the server cannot be reached', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')))

    await expect(getGameTypes()).rejects.toMatchObject({ status: 0 })
  })

  it('throws when a successful response carries a malformed body', async () => {
    mockFetch(() => new Response('not json', { status: 200 }))

    await expect(getGameTypes()).rejects.toBeInstanceOf(ApiError)
  })

  it('records the method and url that failed', async () => {
    mockFetch(() => jsonResponse({}, 503))

    await expect(createLobby('my-lobby')).rejects.toMatchObject({
      method: 'POST',
      url: '/api/lobby?name=my-lobby',
    })
  })
})

describe('ApiError.userMessage', () => {
  it.each([
    [0, 'Cannot reach the server.'],
    [500, 'The server ran into a problem. Please try again.'],
    [503, 'The server ran into a problem. Please try again.'],
    [404, 'That no longer exists on the server.'],
    [400, 'The server rejected the request.'],
  ])('phrases status %i for a player', (status, expected) => {
    expect(new ApiError(status, 'GET', '/api/x', 'raw detail').userMessage).toBe(expected)
  })

  it('keeps the raw detail in the Error message', () => {
    expect(new ApiError(500, 'GET', '/api/x', 'raw detail').message).toBe('raw detail')
  })
})
