import React from 'react';
import YouTubeEmbed from './YouTubeEmbed';

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
  // Suppress unused variable warnings
  void audioOnly;
  void onProgress;
  void onDuration;

  // Convert videoId to full YouTube URL for the YouTubeEmbed component
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <YouTubeEmbed
      url={youtubeUrl}
      title={title}
      autoplay={autoplay}
      onReady={onReady}
      onError={onError}
    />
  );
}

