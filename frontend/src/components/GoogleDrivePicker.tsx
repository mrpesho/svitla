import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { X, Loader2, FolderOpen, File as FileIcon, ChevronRight } from 'lucide-react'
import { filesApi, type DriveFile } from '@/lib/api'

interface GoogleDrivePickerProps {
  onSelect: (fileId: string) => void
  onClose: () => void
  importing: boolean
}

export function GoogleDrivePicker({ onSelect, onClose, importing }: GoogleDrivePickerProps) {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFolder, setCurrentFolder] = useState<string>('root')
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'My Drive' }
  ])
  const modalRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadFiles(currentFolder, true)
  }, [currentFolder])

  useEffect(() => {
    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const sortFiles = (files: DriveFile[]) => {
    return [...files].sort((a, b) => {
      // Folders first
      const aIsFolder = a.mimeType === 'application/vnd.google-apps.folder'
      const bIsFolder = b.mimeType === 'application/vnd.google-apps.folder'
      if (aIsFolder && !bIsFolder) return -1
      if (!aIsFolder && bIsFolder) return 1
      // Then alphabetical
      return a.name.localeCompare(b.name)
    })
  }

  const loadFiles = async (folderId: string, reset: boolean = false) => {
    if (reset) {
      setLoading(true)
      setFiles([])
      setNextPageToken(null)
    } else {
      setLoadingMore(true)
    }
    setError(null)

    const pageToken = reset ? undefined : (nextPageToken || undefined)
    const { data, error: apiError } = await filesApi.listDrive(folderId, pageToken)

    if (data) {
      const newFiles = reset ? data.files : [...files, ...data.files]
      setFiles(sortFiles(newFiles))
      setNextPageToken(data.nextPageToken || null)
    } else if (apiError) {
      setError(apiError)
    }

    setLoading(false)
    setLoadingMore(false)
  }

  const loadMore = () => {
    if (nextPageToken && !loadingMore) {
      loadFiles(currentFolder, false)
    }
  }

  // Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 100 && nextPageToken && !loadingMore) {
      loadMore()
    }
  }

  const handleFileClick = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      // Navigate into folder
      setCurrentFolder(file.id)
      setFolderPath(prev => [...prev, { id: file.id, name: file.name }])
    } else {
      // Select file for import
      onSelect(file.id)
    }
  }

  const navigateToFolder = (index: number) => {
    const folder = folderPath[index]
    setCurrentFolder(folder.id)
    setFolderPath(prev => prev.slice(0, index + 1))
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card ref={modalRef} className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Import from Google Drive</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm mb-4 overflow-x-auto pb-2">
            {folderPath.map((folder, index) => (
              <div key={folder.id} className="flex items-center">
                {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
                <button
                  onClick={() => navigateToFolder(index)}
                  className={`hover:text-primary ${
                    index === folderPath.length - 1
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {folder.name}
                </button>
              </div>
            ))}
          </div>

          {/* File list */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto border rounded-md"
            onScroll={handleScroll}
          >
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-48 text-destructive">
                {error}
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <FolderOpen className="h-8 w-8 mb-2" />
                <p>This folder is empty</p>
              </div>
            ) : (
              <div className="divide-y">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    disabled={importing}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 text-left disabled:opacity-50"
                  >
                    {file.mimeType === 'application/vnd.google-apps.folder' ? (
                      <FolderOpen className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    ) : file.iconLink ? (
                      <img
                        src={file.iconLink}
                        alt=""
                        className="h-5 w-5 flex-shrink-0"
                      />
                    ) : (
                      <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="truncate flex-1">{file.name}</span>
                    {file.mimeType === 'application/vnd.google-apps.folder' && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
                {loadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
