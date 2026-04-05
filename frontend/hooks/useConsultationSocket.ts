'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConsultationStatus } from '@/lib/types'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000'

interface ConsultationSocketState {
  status: ConsultationStatus
  progress: number
  connected: boolean
}

interface UseConsultationSocketReturn extends ConsultationSocketState {
  /** Connecte le WebSocket à une consultation */
  connect: (consultationId: string) => void
  /** Déconnecte le WebSocket */
  disconnect: () => void
}

export function useConsultationSocket(): UseConsultationSocketReturn {
  const [state, setState] = useState<ConsultationSocketState>({
    status: 'idle',
    progress: 0,
    connected: false,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setState((s) => ({ ...s, connected: false }))
  }, [])

  const connect = useCallback(
    (consultationId: string) => {
      disconnect()

      const url = `${WS_URL}/api/v1/consultations/${consultationId}/ws`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setState((s) => ({ ...s, connected: true }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            status: ConsultationStatus
            progress: number
          }
          setState({
            status: data.status,
            progress: data.progress,
            connected: true,
          })
        } catch {
          // Message non-JSON ignoré
        }
      }

      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }))
        // Reconnexion automatique si la consultation n'est pas terminée
        if (
          state.status !== 'done' &&
          state.status !== 'error'
        ) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect(consultationId)
          }, 3000)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    },
    [disconnect, state.status]
  )

  // Nettoyage à la destruction
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    ...state,
    connect,
    disconnect,
  }
}
