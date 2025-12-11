import React from 'react';
import YouTubePlayer from './YouTubePlayer';

interface VideoPlayerProps {
  videoId: string;
  title: string;
  audioOnly?: boolean;
  autoplay?: boolean;
  onProgress?: (progress: number) => void;
  onDuration?: (duration: number) => void;
  onReady?: () => void;
  onError?: (error: string) => void;
}

export default function VideoPlayer({
  videoId,
  title,
  audioOnly = false,
  autoplay = false,
  onProgress,
  onDuration,
  onReady,
  onError
}: VideoPlayerProps) {
  console.log(`🎬 VideoPlayer mounted with videoId: ${videoId}`);
  
  return (
    <YouTubePlayer
      videoId={videoId}
      title={title}
      autoplay={autoplay}
      onReady={onReady}
      onError={onError}
    />
  );
}
