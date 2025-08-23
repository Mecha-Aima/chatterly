'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { AudioPlaybackState } from '@/types/audio.types';

interface AudioPlayerProps {
  audioUrl: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  autoPlay?: boolean;
  showControls?: boolean;
  className?: string;
}

export default function AudioPlayer({
  audioUrl,
  onPlay,
  onPause,
  onEnded,
  onError,
  autoPlay = false,
  showControls = true,
  className = ''
}: AudioPlayerProps) {
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    error: null
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Set up event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Set initial volume
    audio.volume = playbackState.volume;

    // Auto-play if requested
    if (autoPlay) {
      audio.play().catch(console.error);
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
    };
  }, [audioUrl, autoPlay]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Event handlers
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setPlaybackState(prev => ({
        ...prev,
        duration: audioRef.current!.duration
      }));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackState(prev => ({
        ...prev,
        currentTime: audioRef.current!.currentTime
      }));
    }
  };

  const handlePlay = () => {
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      error: null
    }));
    onPlay?.();
  };

  const handlePause = () => {
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: true
    }));
    onPause?.();
  };

  const handleEnded = () => {
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTime: 0
    }));
    onEnded?.();
  };

  const handleError = () => {
    const error = audioRef.current?.error?.message || 'Audio playback error';
    setPlaybackState(prev => ({
      ...prev,
      error,
      isPlaying: false,
      isPaused: false
    }));
    onError?.(error);
  };

  // Control functions
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (playbackState.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, [playbackState.isPlaying]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setPlaybackState(prev => ({ ...prev, currentTime: time }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      setPlaybackState(prev => ({ ...prev, volume }));
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (playbackState.volume > 0) {
      setVolume(0);
    } else {
      setVolume(1);
    }
  }, [playbackState.volume, setVolume]);

  const reset = useCallback(() => {
    seekTo(0);
  }, [seekTo]);

  // Format time display
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = playbackState.duration > 0 
    ? (playbackState.currentTime / playbackState.duration) * 100 
    : 0;

  if (!showControls) {
    return (
      <audio
        ref={audioRef}
        src={audioUrl}
        autoPlay={autoPlay}
        className={className}
      />
    );
  }

  return (
    <div className={`flex flex-col space-y-3 p-4 border rounded-lg bg-white ${className}`}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{formatTime(playbackState.currentTime)}</span>
          <span>{formatTime(playbackState.duration)}</span>
        </div>
        <Slider
          value={[playbackState.currentTime]}
          max={playbackState.duration}
          step={0.1}
          onValueChange={([value]) => seekTo(value)}
          className="w-full"
        />
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center space-x-3">
        <Button
          onClick={reset}
          variant="outline"
          size="sm"
          disabled={playbackState.currentTime === 0}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        <Button
          onClick={togglePlayPause}
          variant="default"
          size="lg"
          className="w-12 h-12 rounded-full"
        >
          {playbackState.isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center space-x-3">
        <Button
          onClick={toggleMute}
          variant="outline"
          size="sm"
        >
          {playbackState.volume > 0 ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </Button>
        <Slider
          value={[playbackState.volume]}
          max={1}
          step={0.1}
          onValueChange={([value]) => setVolume(value)}
          className="w-32"
        />
      </div>

      {/* Error Display */}
      {playbackState.error && (
        <div className="text-red-600 text-sm text-center">
          {playbackState.error}
        </div>
      )}

      {/* Status */}
      <div className="text-xs text-gray-500 text-center">
        {playbackState.isPlaying ? 'Playing' : 
         playbackState.isPaused ? 'Paused' : 'Ready'}
      </div>
    </div>
  );
} 