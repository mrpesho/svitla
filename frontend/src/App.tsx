import { useState, useEffect, useCallback } from 'react'
import { authApi, filesApi, type User, type DataroomFile } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileList } from '@/components/FileList'
import { GoogleDrivePicker } from '@/components/GoogleDrivePicker'
import { Privacy } from '@/pages/Privacy'
import { Terms } from '@/pages/Terms'
import { LogOut, FolderOpen, Upload, Loader2 } from 'lucide-react'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [files, setFiles] = useState<DataroomFile[]>([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [importing, setImporting] = useState(false)

  // Check auth status on mount and handle OAuth callback
  useEffect(() => {
    const checkAuth = async () => {
      // Check for OAuth callback with token
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')

      if (params.get('auth') === 'success' && token) {
        // Exchange token for session
        const { data: exchangeData, error } = await authApi.exchange(token)
        window.history.replaceState({}, '', window.location.pathname)

        if (exchangeData?.authenticated && exchangeData.user) {
          setUser(exchangeData.user)
          await loadFiles()
          setLoading(false)
          return
        } else if (error) {
          console.error('Token exchange failed:', error)
        }
      } else if (params.get('auth') === 'success') {
        window.history.replaceState({}, '', window.location.pathname)
      }

      // Check existing session
      const { data } = await authApi.status()
      if (data?.authenticated && data.user) {
        setUser(data.user)
        await loadFiles()
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  const loadFiles = async () => {
    const { data, error } = await filesApi.list()
    if (data) {
      setFiles(data)
    } else if (error) {
      console.error('Failed to load files:', error)
    }
  }

  const handleLogin = async () => {
    const { data, error } = await authApi.login()
    if (data?.auth_url) {
      window.location.href = data.auth_url
    } else if (error) {
      alert(`Login failed: ${error}`)
    }
  }

  const handleLogout = async () => {
    await authApi.logout()
    setUser(null)
    setFiles([])
  }

  const handleImport = useCallback(async (fileId: string) => {
    setImporting(true)
    const { data, error } = await filesApi.import(fileId)
    setImporting(false)

    if (data) {
      setFiles(prev => [data, ...prev])
      setShowPicker(false)
    } else if (error) {
      alert(`Import failed: ${error}`)
    }
  }, [])

  const handleDelete = useCallback(async (fileId: number) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    const { error } = await filesApi.delete(fileId)
    if (!error) {
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } else {
      alert(`Delete failed: ${error}`)
    }
  }, [])

  // Handle static page routes
  if (window.location.pathname === '/privacy') {
    return <Privacy />
  }
  if (window.location.pathname === '/terms') {
    return <Terms />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Data Room</CardTitle>
            <CardDescription>
              Securely store and manage your documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogin} className="w-full" size="lg">
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              By signing in you agree with the{' '}
              <a href="/privacy" className="hover:underline">Privacy Policy</a>
              {' and '}
              <a href="/terms" className="hover:underline">Terms of Service</a>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Data Room</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="text-sm font-medium">{user.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Files</h2>
          <Button onClick={() => setShowPicker(true)} disabled={importing}>
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import from Drive
          </Button>
        </div>

        <FileList
          files={files}
          onDelete={handleDelete}
        />
      </main>

      {/* Google Drive Picker Modal */}
      {showPicker && (
        <GoogleDrivePicker
          onSelect={handleImport}
          onClose={() => setShowPicker(false)}
          importing={importing}
        />
      )}
    </div>
  )
}

export default App
