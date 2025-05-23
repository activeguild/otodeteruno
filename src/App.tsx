import { useState, useEffect, useRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isLoud, setIsLoud] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const rafIdRef = useRef<number | null>(null)

  // ファイルアップロード時の処理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      setError(null)
    }
  }

  // 動画再生時に音声解析を開始
  const handlePlay = () => {
    if (!videoRef.current) return
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const audioContext = new AudioCtx()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaElementSource(videoRef.current)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser
      source.connect(analyser)
      analyser.connect(audioContext.destination)
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      dataArrayRef.current = dataArray

      const detect = () => {
        if (!analyserRef.current || !dataArrayRef.current) return
        analyserRef.current.getByteTimeDomainData(dataArrayRef.current as Uint8Array)
        // 音量の簡易判定
        let sum = 0
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const val = dataArrayRef.current[i] - 128
          sum += val * val
        }
        const rms = Math.sqrt(sum / dataArrayRef.current.length)
        setIsLoud(rms > 0) // 閾値は調整可能
        rafIdRef.current = requestAnimationFrame(detect)
      }
      detect()
    } catch (e) {
      if (e instanceof Error) {
        setError('音声解析エラー: ' + e.message)
      } else {
        setError('音声解析エラー')
      }
    }
  }

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  return (
    <div style={{ textAlign: 'center', marginTop: '3em' }}>
      <h1>mp4音検出デモ</h1>
      <input type="file" accept="video/mp4" onChange={handleFileChange} />
      {videoUrl && (
        <div style={{ margin: '2em 0' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            width={480}
            onPlay={handlePlay}
            style={{ display: 'block', margin: '0 auto' }}
          />
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {videoUrl && !error && (
        <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
          {isLoud ? '音が鳴っています！' : '静かです'}
        </div>
      )}
    </div>
  )
}

export default App
