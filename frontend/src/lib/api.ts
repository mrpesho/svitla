const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

interface ApiResponse<T> {
  data?: T
  error?: string
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Request failed' }
    }

    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

// Auth API
export const authApi = {
  login: () => request<{ auth_url: string }>('/auth/login'),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  status: () => request<{ authenticated: boolean; user?: User }>('/auth/status'),
  me: () => request<User>('/auth/me'),
  exchange: (token: string) => request<{ authenticated: boolean; user: User }>('/auth/exchange', {
    method: 'POST',
    body: JSON.stringify({ token }),
  }),
  deleteAccount: () => request<{ message: string }>('/auth/account', { method: 'DELETE' }),
}

// Files API
export const filesApi = {
  list: () => request<DataroomFile[]>('/files'),
  get: (id: number) => request<DataroomFile>(`/files/${id}`),
  delete: (id: number) => request<{ message: string }>(`/files/${id}`, { method: 'DELETE' }),
  import: (fileId: string) => request<DataroomFile>('/files/import', {
    method: 'POST',
    body: JSON.stringify({ fileId }),
  }),
  listDrive: (folderId?: string, pageToken?: string) => {
    const params = new URLSearchParams()
    if (folderId) params.set('folderId', folderId)
    if (pageToken) params.set('pageToken', pageToken)
    return request<{ files: DriveFile[]; nextPageToken?: string }>(
      `/files/drive?${params.toString()}`
    )
  },
  getViewUrl: (id: number) => `${API_BASE}/files/${id}/view`,
  getDownloadUrl: (id: number) => `${API_BASE}/files/${id}/download`,
}

// Types
export interface User {
  id: number
  email: string
  name: string
  picture: string
  created_at: string
}

export interface DataroomFile {
  id: number
  name: string
  mime_type: string
  size: number
  google_drive_id: string
  created_at: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  iconLink?: string
  thumbnailLink?: string
}
