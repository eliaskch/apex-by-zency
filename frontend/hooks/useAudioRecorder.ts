'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseAudioRecorderReturn {
  /** Démarre l'enregistrement audio */
  start: () => Promise<void>
  /** Arrête l'enregistrement et retourne le Blob audio */
  stop: () => Promise<Blob>
  /** L'enregistrement est en cours */
  isRecording: boolean
  /** Durée en secondes */
  duration: number
  /** Volume audio de 0 à 100 (pour la waveform) */
  volume: number
  /** Erreur éventuelle (micro refusé, etc.) */
  error: string | null
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const resolveStopRef = useRef<((blob: Blob) => void) | null>(null)

  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // Animation du volume via requestAnimationFrame
  const updateVolume = useCallback(() => {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.fftSize)
    analyserRef.current.getByteTimeDomainData(data)

    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / data.length)
    setVolume(Math.min(100, Math.round(rms * 300)))

    animFrameRef.current = requestAnimationFrame(updateVolume)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setDuration(0)
    setVolume(0)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // WebAudio AnalyserNode pour le volume
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Choisir le format supporté
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (resolveStopRef.current) {
          resolveStopRef.current(blob)
          resolveStopRef.current = null
        }
      }

      recorder.start(1000) // chunks toutes les secondes
      setIsRecording(true)

      // Chronomètre
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)

      // Démarrer l'animation du volume
      updateVolume()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError(
          "Accès au microphone refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur."
        )
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('Aucun microphone détecté sur cet appareil.')
      } else {
        setError("Erreur lors de l'accès au microphone.")
      }
    }
  }, [updateVolume])

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        reject(new Error("Aucun enregistrement en cours"))
        return
      }

      resolveStopRef.current = resolve
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      // Arrêter le chronomètre
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      // Arrêter l'animation du volume
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      setVolume(0)

      // Libérer le micro
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    })
  }, [])

  return { start, stop, isRecording, duration, volume, error }
}
