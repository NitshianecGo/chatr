import { useRef, useCallback } from 'react'

// Все звуки генерируются программно через Web Audio API.
// Это значит, что приложению не нужны аудиофайлы — оно будет
// работать сразу после загрузки на GitHub, без "битых" ссылок
// на отсутствующие mp3/wav.

let sharedCtx = null
function getCtx() {
  if (!sharedCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    sharedCtx = new AudioCtx()
  }
  if (sharedCtx.state === 'suspended') sharedCtx.resume()
  return sharedCtx
}

function tone(ctx, { freq, start, duration, type = 'sine', gain = 0.18, glideTo = null }) {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration)

  amp.gain.setValueAtTime(0, start)
  amp.gain.linearRampToValueAtTime(gain, start + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export function useSound() {
  const enabledRef = useRef(true)

  const playSend = useCallback(() => {
    if (!enabledRef.current) return
    const ctx = getCtx()
    const t = ctx.currentTime
    tone(ctx, { freq: 520, start: t, duration: 0.09, type: 'sine', gain: 0.14, glideTo: 720 })
  }, [])

  const playReceive = useCallback(() => {
    if (!enabledRef.current) return
    const ctx = getCtx()
    const t = ctx.currentTime
    tone(ctx, { freq: 660, start: t, duration: 0.11, type: 'sine', gain: 0.15 })
    tone(ctx, { freq: 880, start: t + 0.09, duration: 0.16, type: 'sine', gain: 0.13 })
  }, [])

  const playNotify = useCallback(() => {
    if (!enabledRef.current) return
    const ctx = getCtx()
    const t = ctx.currentTime
    tone(ctx, { freq: 784, start: t, duration: 0.1, type: 'triangle', gain: 0.14 })
    tone(ctx, { freq: 988, start: t + 0.1, duration: 0.1, type: 'triangle', gain: 0.12 })
    tone(ctx, { freq: 1174, start: t + 0.2, duration: 0.18, type: 'triangle', gain: 0.1 })
  }, [])

  const playPop = useCallback(() => {
    if (!enabledRef.current) return
    const ctx = getCtx()
    const t = ctx.currentTime
    tone(ctx, { freq: 340, start: t, duration: 0.06, type: 'sine', gain: 0.08, glideTo: 220 })
  }, [])

  const setEnabled = useCallback((v) => {
    enabledRef.current = v
  }, [])

  return { playSend, playReceive, playNotify, playPop, setEnabled }
}
