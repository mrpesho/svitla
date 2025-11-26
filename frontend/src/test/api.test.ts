import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authApi, filesApi } from '../lib/api'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authApi', () => {
    it('calls login endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ auth_url: 'https://accounts.google.com/...' }),
      })

      const result = await authApi.login()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          credentials: 'include',
        })
      )
      expect(result.data).toEqual({ auth_url: 'https://accounts.google.com/...' })
    })

    it('calls logout endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Logged out successfully' }),
      })

      const result = await authApi.logout()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      )
      expect(result.data).toEqual({ message: 'Logged out successfully' })
    })

    it('handles API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Not authenticated' }),
      })

      const result = await authApi.status()

      expect(result.error).toBe('Not authenticated')
      expect(result.data).toBeUndefined()
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await authApi.status()

      expect(result.error).toBe('Network error')
      expect(result.data).toBeUndefined()
    })
  })

  describe('filesApi', () => {
    it('calls list files endpoint', async () => {
      const mockFiles = [
        { id: 1, name: 'test.pdf', mime_type: 'application/pdf', size: 1024 },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFiles,
      })

      const result = await filesApi.list()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/files'),
        expect.objectContaining({
          credentials: 'include',
        })
      )
      expect(result.data).toEqual(mockFiles)
    })

    it('calls import file endpoint with overwrite parameter', async () => {
      const mockFile = { id: 1, name: 'test.pdf', mime_type: 'application/pdf' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFile,
      })

      await filesApi.import('file123', true)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body as string)

      expect(body).toEqual({ fileId: 'file123', overwrite: true })
    })

    it('calls delete file endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'File deleted' }),
      })

      const result = await filesApi.delete(1)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/files/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(result.data).toEqual({ message: 'File deleted' })
    })

    it('generates correct view and download URLs', () => {
      const viewUrl = filesApi.getViewUrl(123)
      const downloadUrl = filesApi.getDownloadUrl(123)

      expect(viewUrl).toContain('/api/files/123/view')
      expect(downloadUrl).toContain('/api/files/123/download')
    })
  })
})
