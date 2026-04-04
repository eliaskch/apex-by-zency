import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true, // pour les cookies httpOnly
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
let refreshQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(
          `${API_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const newToken: string = data.access_token
        setAccessToken(newToken)

        refreshQueue.forEach((cb) => cb(newToken))
        refreshQueue = []

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch {
        clearAccessToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
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
