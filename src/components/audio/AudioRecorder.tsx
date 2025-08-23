'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Square, Pause, Play, AlertCircle } from 'lucide-react';
import { AudioRecordingState } from '@/types/audio.types';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  maxDuration?: number; // in seconds
  language?: string;
  disabled?: boolean;
}

export default function AudioRecorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  maxDuration = 30,
  language = 'en',
  disabled = false
}: AudioRecorderProps) {
  const [recordingState, setRecordingState] = useState<AudioRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    error: null
  });
  const [microphonePermission, setMicrophonePermission] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check microphone permission status
  const checkMicrophonePermission = useCallback(async () => {
    try {
      if (!navigator.permissions) {
        setMicrophonePermission('unknown');
        return;
      }
      
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicrophonePermission(permission.state);
      
      // Listen for permission changes
      permission.onchange = () => {
        setMicrophonePermission(permission.state);
      };
      
      return permission.state;
    } catch (error) {
      console.error('Permission check error:', error);
      setMicrophonePermission('unknown');
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    checkMicrophonePermission();
  }, [checkMicrophonePermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, []);

  // Request microphone access
  const requestMicrophoneAccess = useCallback(async (): Promise<MediaStream> => {
    try {
      // First check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported in this browser');
      }

      // Check if we already have permission
      const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permissions.state === 'denied') {
        throw new Error('Microphone permission denied. Please enable it in your browser settings.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      // Verify we actually got audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('No audio tracks found in microphone stream');
      }

      console.log('Microphone access granted:', {
        trackCount: audioTracks.length,
        trackSettings: audioTracks[0].getSettings()
      });

      return stream;
    } catch (error) {
      console.error('Microphone access error:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone permission denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Microphone is already in use by another application.');
        }
      }
      throw new Error(`Microphone access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setRecordingState(prev => ({ ...prev, error: null }));
      
      const stream = await requestMicrophoneAccess();
      streamRef.current = stream;
      
      // Try to use WAV format first, fallback to WebM if not supported
      let mimeType = 'audio/wav';
      if (!MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/webm;codecs=opus';
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      mediaRecorderRef.current = mediaRecorder;
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordingState(prev => ({ ...prev, audioBlob, isRecording: false, isPaused: false }));
        onRecordingComplete(audioBlob);
      };
      
      mediaRecorder.onerror = (event) => {
        setRecordingState(prev => ({ 
          ...prev, 
          error: 'Recording error occurred',
          isRecording: false,
          isPaused: false
        }));
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      
      // Start duration timer
      durationTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingState(prev => ({ ...prev, duration: elapsed }));
        
        // Auto-stop if max duration reached
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);
      
      setRecordingState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isPaused: false,
        duration: 0
      }));
      
      onRecordingStart?.();
      
    } catch (error) {
      setRecordingState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start recording',
        isRecording: false
      }));
    }
  }, [maxDuration, onRecordingStart, requestMicrophoneAccess]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
      
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      onRecordingStop?.();
    }
  }, [recordingState.isRecording, onRecordingStop]);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    
    if (recordingState.isPaused) {
      mediaRecorderRef.current.resume();
      setRecordingState(prev => ({ ...prev, isPaused: false }));
    } else {
      mediaRecorderRef.current.pause();
      setRecordingState(prev => ({ ...prev, isPaused: true }));
    }
  }, [recordingState.isPaused]);

  // Format duration display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle button click
  const handleButtonClick = () => {
    if (recordingState.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Get permission status display
  const getPermissionStatus = () => {
    switch (microphonePermission) {
      case 'granted':
        return { text: 'Microphone Access Granted', color: 'text-green-600', icon: <Mic className="w-4 h-4" /> };
      case 'denied':
        return { text: 'Microphone Access Denied', color: 'text-red-600', icon: <MicOff className="w-4 h-4" /> };
      case 'prompt':
        return { text: 'Microphone Permission Required', color: 'text-yellow-600', icon: <AlertCircle className="w-4 h-4" /> };
      default:
        return { text: 'Checking Microphone Access...', color: 'text-gray-600', icon: <AlertCircle className="w-4 h-4" /> };
    }
  };

  const permissionStatus = getPermissionStatus();

  return (
    <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Permission Status */}
      <div className="text-center">
        <div className={`flex items-center justify-center space-x-2 mb-2 ${permissionStatus.color}`}>
          {permissionStatus.icon}
          <span className="text-sm font-medium">{permissionStatus.text}</span>
        </div>
      </div>

      {/* Recording Status */}
      <div className="text-center">
        <div className="text-sm text-gray-600 mb-2">
          {recordingState.isRecording ? 'Recording...' : 'Ready to record'}
        </div>
        {recordingState.duration > 0 && (
          <div className="text-2xl font-mono font-bold text-blue-600">
            {formatDuration(recordingState.duration)}
          </div>
        )}
      </div>

      {/* Recording Controls */}
      <div className="flex items-center space-x-3">
        <Button
          onClick={handleButtonClick}
          disabled={disabled || microphonePermission === 'denied'}
          variant={recordingState.isRecording ? "destructive" : "default"}
          size="lg"
          className="w-16 h-16 rounded-full"
        >
          {recordingState.isRecording ? (
            <Square className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>

        {recordingState.isRecording && (
          <Button
            onClick={togglePause}
            variant="outline"
            size="sm"
            disabled={disabled}
          >
            {recordingState.isPaused ? (
              <Play className="w-4 h-4" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Error Display */}
      {recordingState.error && (
        <div className="text-red-600 text-sm text-center max-w-xs">
          {recordingState.error}
        </div>
      )}

      {/* Language Info */}
      <div className="text-xs text-gray-500">
        Language: {language.toUpperCase()}
      </div>

      {/* Max Duration Info */}
      <div className="text-xs text-gray-500">
        Max duration: {maxDuration}s
      </div>
    </div>
  );
} 