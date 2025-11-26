import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GoogleDrivePicker } from '../components/GoogleDrivePicker'
import * as api from '../lib/api'

// Mock the API module
vi.mock('../lib/api', async () => {
  const actual = await vi.importActual('../lib/api')
  return {
    ...actual,
    filesApi: {
      listDrive: vi.fn(),
    }
  }
})

describe('GoogleDrivePicker', () => {
  const mockOnSelect = vi.fn()
  const mockOnClose = vi.fn()

  const mockDriveFiles = [
    {
      id: 'folder-1',
      name: 'Documents',
      mimeType: 'application/vnd.google-apps.folder',
      size: 0,
      modifiedTime: '2025-01-15T10:00:00Z',
      iconLink: 'https://example.com/folder-icon.png',
      thumbnailLink: null
    },
    {
      id: 'file-1',
      name: 'report.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      modifiedTime: '2025-01-16T11:00:00Z',
      iconLink: 'https://example.com/pdf-icon.png',
      thumbnailLink: null
    },
    {
      id: 'file-2',
      name: 'spreadsheet.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 2048000,
      modifiedTime: '2025-01-17T12:00:00Z',
      iconLink: 'https://example.com/xlsx-icon.png',
      thumbnailLink: null
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.filesApi.listDrive).mockResolvedValue({
      data: {
        files: mockDriveFiles,
        nextPageToken: null
      },
      error: null
    })
  })

  it('renders picker with title', async () => {
    render(
      <GoogleDrivePicker
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        importing={false}
      />
    )

    expect(screen.getByText('Import from Google Drive')).toBeInTheDocument()
  })

  it('loads and displays Drive files', async () => {
    render(
      <GoogleDrivePicker
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        importing={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument()
      expect(screen.getByText('report.pdf')).toBeInTheDocument()
      expect(screen.getByText('spreadsheet.xlsx')).toBeInTheDocument()
    })
  })

  it('calls onClose when close button is clicked', async () => {
    render(
      <GoogleDrivePicker
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        importing={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument()
    })

    const closeButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg') && btn.getAttribute('class')?.includes('ghost')
    )
    if (closeButton) {
      fireEvent.click(closeButton)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })

  it('calls onClose when cancel button is clicked', async () => {
    render(
      <GoogleDrivePicker
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        importing={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onSelect when a file is clicked', async () => {
    render(
      <GoogleDrivePicker
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        importing={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('report.pdf')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('report.pdf'))
    expect(mockOnSelect).toHaveBeenCalledWith('file-1', 'report.pdf')
  })

  it('navigates into folder when folder is clicked', async () => {
    const mockListDrive = vi.mocked(api.filesApi.listDrive)

    // First call for root folder
    mockListDrive.mockResolvedValueOnce({
      data: {
        files: mockDriveFiles,
        nextPageToken: null
      },
      error: null
    })

    // Second call for Documents folder
    mockListDrive.mockResolvedValueOnce({
      data: {
        files: [
          {
            id: 'file-3',
            name: 'nested-file.txt',
            mimeType: 'text/plain',
            size: 512,
            modifiedTime: '2025-01-18T13:00:00Z',
            iconLink: 'https://example.com/txt-icon.png',
            thumbnailLink: null
          }
        ],
        nextPageToken: null
      },
      error: null
    })

    render(
      <GoogleDrivePicker
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        importing={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument()
    })

    // Click on folder
    fireEvent.click(screen.getByText('Documents'))

    // Should load files in the Documents folder
    await waitFor(() => {
      expect(mockListDrive).toHaveBeenCalledWith('folder-1', undefined)
      expect(screen.getByText('nested-file.txt')).toBeInTheDocument()
    })
  })

  it('shows breadcrumb navigation', async () => {
    render(
      <GoogleDrivePicker
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        importing={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('My Drive')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    vi.mocked(api.filesApi.listDrive).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(
      <GoogleDrivePicker
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        importing={false}
      />
    )

    // Loading spinner should be visible
    const loadingElement = document.querySelector('.animate-spin')
    expect(loadingElement).toBeInTheDocument()
  })

  it('shows error message when API fails', async () => {
    vi.mocked(api.filesApi.listDrive).mockResolvedValue({
      data: null,
      error: 'Failed to load files'
    })

    render(
      <GoogleDrivePicker
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        importing={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to load files')).toBeInTheDocument()
    })
  })

  it('shows empty state when folder has no files', async () => {
    vi.mocked(api.filesApi.listDrive).mockResolvedValue({
      data: {
        files: [],
        nextPageToken: null
      },
      error: null
    })

    render(
      <GoogleDrivePicker
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        importing={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('This folder is empty')).toBeInTheDocument()
    })
  })

  it('disables file selection when importing', async () => {
    render(
      <GoogleDrivePicker
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        importing={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('report.pdf')).toBeInTheDocument()
    })

    const fileButton = screen.getByText('report.pdf').closest('button')
    expect(fileButton).toBeDisabled()
  })

  it('sorts folders before files alphabetically', async () => {
    const unsortedFiles = [
      {
        id: 'file-z',
        name: 'zebra.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        modifiedTime: '2025-01-15T10:00:00Z',
        iconLink: null,
        thumbnailLink: null
      },
      {
        id: 'folder-a',
        name: 'Alpha Folder',
        mimeType: 'application/vnd.google-apps.folder',
        size: 0,
        modifiedTime: '2025-01-15T10:00:00Z',
        iconLink: null,
        thumbnailLink: null
      },
      {
        id: 'file-a',
        name: 'apple.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        modifiedTime: '2025-01-15T10:00:00Z',
        iconLink: null,
        thumbnailLink: null
      }
    ]

    vi.mocked(api.filesApi.listDrive).mockResolvedValue({
      data: {
        files: unsortedFiles,
        nextPageToken: null
      },
      error: null
    })

    render(
      <GoogleDrivePicker
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        importing={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Alpha Folder')).toBeInTheDocument()
    })

    // Get all file/folder buttons
    const items = screen.getAllByRole('button').filter(btn =>
      btn.textContent?.includes('Alpha Folder') ||
      btn.textContent?.includes('apple.pdf') ||
      btn.textContent?.includes('zebra.pdf')
    )

    // Folder should be first, then files alphabetically
    expect(items[0]).toHaveTextContent('Alpha Folder')
    expect(items[1]).toHaveTextContent('apple.pdf')
    expect(items[2]).toHaveTextContent('zebra.pdf')
  })
})
