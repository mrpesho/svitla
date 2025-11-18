import { type DataroomFile, filesApi } from '@/lib/api'
import { formatFileSize, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  File,
  FileText,
  Image,
  Video,
  Music,
  FileSpreadsheet,
  Presentation,
  Trash2,
  Eye,
  Download,
  FolderOpen
} from 'lucide-react'

interface FileListProps {
  files: DataroomFile[]
  onDelete: (id: number) => void
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />
  if (mimeType.startsWith('video/')) return <Video className="h-5 w-5" />
  if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5" />
  if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />
  if (mimeType.includes('document') || mimeType.includes('word'))
    return <FileText className="h-5 w-5 text-blue-600" />
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return <Presentation className="h-5 w-5 text-orange-500" />
  return <File className="h-5 w-5" />
}

export function FileList({ files, onDelete }: FileListProps) {
  if (files.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No files yet</h3>
        <p className="text-muted-foreground">
          Import files from Google Drive to get started
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <Card key={file.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0 text-muted-foreground">
                {getFileIcon(file.mime_type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)} • {formatDate(file.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(filesApi.getViewUrl(file.id), '_blank')}
                title="View file"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(filesApi.getDownloadUrl(file.id), '_blank')}
                title="Download file"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(file.id)}
                title="Delete file"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
