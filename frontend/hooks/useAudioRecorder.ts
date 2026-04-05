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
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("L'API microphone n'est pas supportée dans ce navigateur. Assurez-vous d'être en HTTPS (ou localhost).")
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // WebAudio AnalyserNode pour le volume (avec fallback Safari)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        try {
          const audioCtx = new AudioContextClass()
          const source = audioCtx.createMediaStreamSource(stream)
          const analyser = audioCtx.createAnalyser()
          analyser.fftSize = 256
          source.connect(analyser)
          analyserRef.current = analyser
          updateVolume()
        } catch (e) {
          console.warn("L'analyseur de volume n'a pas pu être initialisé :", e)
        }
      }

      // Choisir le format supporté en toute sécurité
      let options: MediaRecorderOptions = {}
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' }
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' }
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' }
      }

      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mime })
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

    } catch (err: any) {
      console.error("Erreur hook audio:", err)
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError(
          "Accès au microphone refusé. Le navigateur a bloqué l'accès. Veuillez cliquer sur l'icône de cadenas dans la barre d'adresse puis autoriser le microphone."
        )
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError(
          "Aucun microphone détecté. Votre navigateur ne trouve pas de périphérique audio. Branchez un micro et réessayez."
        )
      } else {
        setError(err.message || "Erreur lors de l'accès au microphone.")
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
