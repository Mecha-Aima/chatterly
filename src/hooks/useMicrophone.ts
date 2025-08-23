import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'denied' | 'error';

export function useMicrophone() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [audioSupported, setAudioSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [confidence, setConfidence] = useState<any[]>([]);

  // Request permission and setup
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setPermission('granted');
    } catch (err) {
      setPermission('denied');
      setAudioSupported(false);
    }
  }, []);

  // Start recording and streaming
  const startRecording = useCallback((wsUrl: string) => {
    if (!mediaStreamRef.current) return;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setRecordingState('recording');
    setTranscript('');
    setConfidence([]);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.transcript) setTranscript(data.transcript);
        if (data.confidence) setConfidence(data.confidence);
      } catch {}
    };

    const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType: 'audio/webm;codecs=opus' });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (ws.readyState === 1 && e.data.size > 0) {
        ws.send(e.data);
      }
    };
    recorder.start(250); // send every 250ms
  }, []);

  // Stop recording and close connection
  const stopRecording = useCallback(() => {
    setRecordingState('idle');
    mediaRecorderRef.current?.stop();
    wsRef.current?.send(JSON.stringify({ event: 'end' }));
    wsRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return {
    recordingState,
    audioSupported,
    permission,
    transcript,
    confidence,
    requestPermission,
    startRecording,
    stopRecording,
  };
}
