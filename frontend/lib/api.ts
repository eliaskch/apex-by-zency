import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

// En production, l'API passe par le proxy Vercel (same-origin → pas de pb cookies cross-origin)
// En dev, on pointe directement vers le backend local
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Injecter le JWT dans chaque requête
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Refresh automatique si 401
let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (!token) {
              reject(error)
            } else {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(api(originalRequest))
            }
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshUrl = API_URL
          ? `${API_URL}/api/v1/auth/refresh`
          : '/api/v1/auth/refresh'
        const { data } = await axios.post(
          refreshUrl,
          {},
          { withCredentials: true }
        )
        const newToken: string = data.access_token
        setAccessToken(newToken)

        refreshQueue.forEach((cb) => cb(newToken))
        refreshQueue = []

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (err) {
        clearAccessToken()
        // CRUCIAL: Delete the middleware session cookie to break the redirect loop
        if (typeof document !== 'undefined') {
          document.cookie = 'apex_session=; path=/; max-age=0'
        }
        
        // Reject all queued requests safely
        refreshQueue.forEach((cb) => cb(null))
        refreshQueue = []
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// Stockage du token en mémoire (plus sécurisé que localStorage)
let _accessToken: string | null = null

export function getAccessToken(): string | null {
  return _accessToken
}

export function setAccessToken(token: string): void {
  _accessToken = token
}

export function clearAccessToken(): void {
  _accessToken = null
}

/**
 * Upload un fichier audio pour une consultation.
 * Supporte une callback de progression (0-100).
 */
export async function uploadAudio(
  consultationId: string,
  audioBlob: Blob,
  onProgress?: (percent: number) => void
) {
  const formData = new FormData()
  const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
  formData.append('file', audioBlob, `audio.${ext}`)

  const response = await api.post(
    `/consultations/${consultationId}/upload-audio`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      },
    }
  )
  return response.data
}
