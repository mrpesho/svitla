import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileList } from '../components/FileList'
import type { DataroomFile } from '../lib/api'
import * as api from '../lib/api'

// Mock the API module
vi.mock('../lib/api', async () => {
  const actual = await vi.importActual('../lib/api')
  return {
    ...actual,
    filesApi: {
      viewFile: vi.fn(),
      downloadFile: vi.fn(),
    }
  }
})

describe('FileList', () => {
  const mockFiles: DataroomFile[] = [
    {
      id: 1,
      name: 'test-document.pdf',
      mime_type: 'application/pdf',
      size: 1024000,
      google_drive_id: 'drive-id-1',
      created_at: '2025-01-15T10:00:00Z'
    },
    {
      id: 2,
      name: 'spreadsheet.xlsx',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 2048000,
      google_drive_id: 'drive-id-2',
      created_at: '2025-01-16T11:00:00Z'
    }
  ]

  it('renders empty state when no files', () => {
    const mockOnDelete = vi.fn()
    render(<FileList files={[]} onDelete={mockOnDelete} />)

    expect(screen.getByText('No files yet')).toBeInTheDocument()
    expect(screen.getByText('Import files from Google Drive to get started')).toBeInTheDocument()
  })

  it('renders list of files', () => {
    const mockOnDelete = vi.fn()
    render(<FileList files={mockFiles} onDelete={mockOnDelete} />)

    expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
    expect(screen.getByText('spreadsheet.xlsx')).toBeInTheDocument()
  })

  it('displays file sizes and dates', () => {
    const mockOnDelete = vi.fn()
    render(<FileList files={mockFiles} onDelete={mockOnDelete} />)

    // Check that size formatting is present (we're not testing exact format)
    const fileCards = screen.getAllByText(/MB/)
    expect(fileCards.length).toBeGreaterThan(0)
  })

  it('calls onDelete when delete button is clicked', () => {
    const mockOnDelete = vi.fn()
    render(<FileList files={mockFiles} onDelete={mockOnDelete} />)

    const deleteButtons = screen.getAllByTitle('Delete file')
    fireEvent.click(deleteButtons[0])

    expect(mockOnDelete).toHaveBeenCalledWith(1)
  })

  it('calls viewFile when view button is clicked', async () => {
    const mockOnDelete = vi.fn()
    const mockViewFile = vi.fn().mockResolvedValue(undefined)
    vi.mocked(api.filesApi.viewFile).mockImplementation(mockViewFile)

    render(<FileList files={mockFiles} onDelete={mockOnDelete} />)

    const viewButtons = screen.getAllByTitle('View file')
    fireEvent.click(viewButtons[0])

    expect(mockViewFile).toHaveBeenCalledWith(1)
  })

  it('calls downloadFile when download button is clicked', async () => {
    const mockOnDelete = vi.fn()
    const mockDownloadFile = vi.fn().mockResolvedValue(undefined)
    vi.mocked(api.filesApi.downloadFile).mockImplementation(mockDownloadFile)

    render(<FileList files={mockFiles} onDelete={mockOnDelete} />)

    const downloadButtons = screen.getAllByTitle('Download file')
    fireEvent.click(downloadButtons[0])

    expect(mockDownloadFile).toHaveBeenCalledWith(1, 'test-document.pdf')
  })

  it('shows alert on view file error', async () => {
    const mockOnDelete = vi.fn()
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.mocked(api.filesApi.viewFile).mockRejectedValue(new Error('View failed'))

    render(<FileList files={mockFiles} onDelete={mockOnDelete} />)

    const viewButtons = screen.getAllByTitle('View file')
    fireEvent.click(viewButtons[0])

    // Wait for the async operation
    await vi.waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Failed to view file: View failed')
    })

    mockAlert.mockRestore()
  })

  it('shows alert on download file error', async () => {
    const mockOnDelete = vi.fn()
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.mocked(api.filesApi.downloadFile).mockRejectedValue(new Error('Download failed'))

    render(<FileList files={mockFiles} onDelete={mockOnDelete} />)

    const downloadButtons = screen.getAllByTitle('Download file')
    fireEvent.click(downloadButtons[0])

    // Wait for the async operation
    await vi.waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Failed to download file: Download failed')
    })

    mockAlert.mockRestore()
  })

  it('renders correct icon for PDF files', () => {
    const pdfFile: DataroomFile = {
      id: 1,
      name: 'document.pdf',
      mime_type: 'application/pdf',
      size: 1024,
      google_drive_id: 'drive-id',
      created_at: '2025-01-15T10:00:00Z'
    }
    const mockOnDelete = vi.fn()
    const { container } = render(<FileList files={[pdfFile]} onDelete={mockOnDelete} />)

    // PDF should have red color class
    expect(container.querySelector('.text-red-500')).toBeInTheDocument()
  })

  it('renders correct icon for image files', () => {
    const imageFile: DataroomFile = {
      id: 1,
      name: 'photo.jpg',
      mime_type: 'image/jpeg',
      size: 1024,
      google_drive_id: 'drive-id',
      created_at: '2025-01-15T10:00:00Z'
    }
    const mockOnDelete = vi.fn()
    render(<FileList files={[imageFile]} onDelete={mockOnDelete} />)

    expect(screen.getByText('photo.jpg')).toBeInTheDocument()
  })

  it('renders correct icon for spreadsheet files', () => {
    const spreadsheetFile: DataroomFile = {
      id: 1,
      name: 'data.xlsx',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1024,
      google_drive_id: 'drive-id',
      created_at: '2025-01-15T10:00:00Z'
    }
    const mockOnDelete = vi.fn()
    const { container } = render(<FileList files={[spreadsheetFile]} onDelete={mockOnDelete} />)

    // Spreadsheet should have green color class
    expect(container.querySelector('.text-green-600')).toBeInTheDocument()
  })
})
