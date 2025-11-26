import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import * as api from '../lib/api'

// Mock the API module
vi.mock('../lib/api', async () => {
  const actual = await vi.importActual('../lib/api')
  return {
    ...actual,
    authApi: {
      status: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      exchange: vi.fn(),
      deleteAccount: vi.fn(),
    },
    filesApi: {
      list: vi.fn(),
      import: vi.fn(),
      delete: vi.fn(),
      viewFile: vi.fn(),
      downloadFile: vi.fn(),
    }
  }
})

describe('App', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    created_at: '2025-01-15T10:00:00Z'
  }

  const mockFiles = [
    {
      id: 1,
      name: 'test.pdf',
      mime_type: 'application/pdf',
      size: 1024000,
      google_drive_id: 'drive-id-1',
      created_at: '2025-01-15T10:00:00Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window location
    delete (window as any).location
    window.location = { ...window.location, search: '', pathname: '/' } as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading state initially', () => {
    vi.mocked(api.authApi.status).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<App />)

    // Check for loading spinner
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('shows login screen when not authenticated', async () => {
    vi.mocked(api.authApi.status).mockResolvedValue({
      data: { authenticated: false, user: null },
      error: null
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Data Room')).toBeInTheDocument()
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
    })
  })

  it('shows authenticated app with user info', async () => {
    vi.mocked(api.authApi.status).mockResolvedValue({
      data: { authenticated: true, user: mockUser },
      error: null
    })
    vi.mocked(api.filesApi.list).mockResolvedValue({
      data: mockFiles,
      error: null
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('Your Files')).toBeInTheDocument()
      expect(screen.getByText('Import from Drive')).toBeInTheDocument()
    })
  })

  it('handles login button click', async () => {
    vi.mocked(api.authApi.status).mockResolvedValue({
      data: { authenticated: false, user: null },
      error: null
    })
    vi.mocked(api.authApi.login).mockResolvedValue({
      data: { auth_url: 'https://accounts.google.com/oauth' },
      error: null
    })

    delete (window as any).location
    window.location = { href: '' } as any

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Sign in with Google'))

    await waitFor(() => {
      expect(api.authApi.login).toHaveBeenCalled()
      expect(window.location.href).toBe('https://accounts.google.com/oauth')
    })
  })

  it('handles logout', async () => {
    vi.mocked(api.authApi.status).mockResolvedValue({
      data: { authenticated: true, user: mockUser },
      error: null
    })
    vi.mocked(api.filesApi.list).mockResolvedValue({
      data: mockFiles,
      error: null
    })
    vi.mocked(api.authApi.logout).mockResolvedValue({
      data: { message: 'Logged out' },
      error: null
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    // Find logout button (button with logout icon)
    const logoutButton = screen.getAllByRole('button').find(btn =>
      btn.getAttribute('title') === 'Logout'
    )
    expect(logoutButton).toBeDefined()
    fireEvent.click(logoutButton!)

    await waitFor(() => {
      expect(api.authApi.logout).toHaveBeenCalled()
    })
  })

  it('handles OAuth callback with success', async () => {
    delete (window as any).location
    window.location = {
      search: '?auth=success&token=test-token-123',
      pathname: '/'
    } as any

    vi.mocked(api.authApi.exchange).mockResolvedValue({
      data: { authenticated: true, user: mockUser },
      error: null
    })
    vi.mocked(api.filesApi.list).mockResolvedValue({
      data: mockFiles,
      error: null
    })

    render(<App />)

    await waitFor(() => {
      expect(api.authApi.exchange).toHaveBeenCalledWith('test-token-123')
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  it('handles OAuth callback with error', async () => {
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})

    delete (window as any).location
    window.location = {
      search: '?auth=error&message=Access+denied',
      pathname: '/'
    } as any

    render(<App />)

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Access denied')
      )
    })

    mockAlert.mockRestore()
  })

  it('loads and displays files', async () => {
    vi.mocked(api.authApi.status).mockResolvedValue({
      data: { authenticated: true, user: mockUser },
      error: null
    })
    vi.mocked(api.filesApi.list).mockResolvedValue({
      data: mockFiles,
      error: null
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })
  })

  it('shows import from drive button', async () => {
    vi.mocked(api.authApi.status).mockResolvedValue({
      data: { authenticated: true, user: mockUser },
      error: null
    })
    vi.mocked(api.filesApi.list).mockResolvedValue({
      data: [],
      error: null
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Import from Drive')).toBeInTheDocument()
    })
  })

  it('handles file deletion confirmation', async () => {
    vi.mocked(api.authApi.status).mockResolvedValue({
      data: { authenticated: true, user: mockUser },
      error: null
    })
    vi.mocked(api.filesApi.list).mockResolvedValue({
      data: mockFiles,
      error: null
    })
    vi.mocked(api.filesApi.delete).mockResolvedValue({
      data: { message: 'Deleted' },
      error: null
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    // Click delete button on file
    const deleteButton = screen.getByTitle('Delete file')
    fireEvent.click(deleteButton)

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Delete File')).toBeInTheDocument()
    })

    // Confirm deletion
    const confirmButton = screen.getByText('Delete')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(api.filesApi.delete).toHaveBeenCalledWith(1)
    })
  })

  it('shows delete account confirmation', async () => {
    vi.mocked(api.authApi.status).mockResolvedValue({
      data: { authenticated: true, user: mockUser },
      error: null
    })
    vi.mocked(api.filesApi.list).mockResolvedValue({
      data: [],
      error: null
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    // Find delete account button
    const deleteAccountButton = screen.getAllByRole('button').find(btn =>
      btn.getAttribute('title') === 'Delete Account'
    )
    expect(deleteAccountButton).toBeDefined()
    fireEvent.click(deleteAccountButton!)

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/permanently delete your account/)).toBeInTheDocument()
    })
  })

  it('handles account deletion', async () => {
    vi.mocked(api.authApi.status).mockResolvedValue({
      data: { authenticated: true, user: mockUser },
      error: null
    })
    vi.mocked(api.filesApi.list).mockResolvedValue({
      data: [],
      error: null
    })
    vi.mocked(api.authApi.deleteAccount).mockResolvedValue({
      data: { message: 'Account deleted' },
      error: null
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    // Open delete account dialog
    const deleteAccountButton = screen.getAllByRole('button').find(btn =>
      btn.getAttribute('title') === 'Delete Account'
    )
    fireEvent.click(deleteAccountButton!)

    await waitFor(() => {
      expect(screen.getByText(/permanently delete your account/)).toBeInTheDocument()
    })

    // Confirm deletion
    const confirmButtons = screen.getAllByText('Delete Account')
    const confirmButton = confirmButtons.find(btn => btn.tagName === 'BUTTON')
    fireEvent.click(confirmButton!)

    await waitFor(() => {
      expect(api.authApi.deleteAccount).toHaveBeenCalled()
    })
  })

  it('shows privacy policy link', async () => {
    vi.mocked(api.authApi.status).mockResolvedValue({
      data: { authenticated: false, user: null },
      error: null
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
    })

    const privacyLink = screen.getByText('Privacy Policy')
    expect(privacyLink).toHaveAttribute('href', '/privacy')
  })

  it('shows terms of service link', async () => {
    vi.mocked(api.authApi.status).mockResolvedValue({
      data: { authenticated: false, user: null },
      error: null
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Terms of Service')).toBeInTheDocument()
    })

    const termsLink = screen.getByText('Terms of Service')
    expect(termsLink).toHaveAttribute('href', '/terms')
  })

  it('handles login API error', async () => {
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})

    vi.mocked(api.authApi.status).mockResolvedValue({
      data: { authenticated: false, user: null },
      error: null
    })
    vi.mocked(api.authApi.login).mockResolvedValue({
      data: null,
      error: 'Server error'
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Sign in with Google'))

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Login failed: Server error')
    })

    mockAlert.mockRestore()
  })

  it('handles token exchange error', async () => {
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})

    delete (window as any).location
    window.location = {
      search: '?auth=success&token=invalid-token',
      pathname: '/'
    } as any

    vi.mocked(api.authApi.exchange).mockResolvedValue({
      data: null,
      error: 'Invalid token'
    })

    render(<App />)

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Invalid token')
      )
    })

    mockAlert.mockRestore()
  })
})
