import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Play, Pause, SkipForward, SkipBack, Volume2 } from 'lucide-react-native';

interface AudioOnlyVideoPlayerProps {
  videoId: string;
  title: string;
  thumbnail?: string;
  channelTitle?: string;
  autoplay?: boolean;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export default function AudioOnlyVideoPlayer({
  videoId,
  title,
  thumbnail,
  channelTitle,
  autoplay = false,
  onEnd,
  onError
}: AudioOnlyVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  // Validate videoId
  if (!videoId || typeof videoId !== 'string' || videoId.trim().length === 0) {
    console.warn('⚠️ AudioOnlyVideoPlayer: Invalid videoId provided:', videoId);
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid video ID</Text>
          <Text style={styles.errorSubtext}>Cannot play audio</Text>
        </View>
      </View>
    );
  }

  // HTML for invisible YouTube player that only plays audio
  const getHtmlContent = () => {
    // Ensure videoId is properly escaped for HTML
    const safeVideoId = String(videoId).replace(/["'<>&]/g, '');
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #000;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    #player {
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    var player;
    var isReady = false;
    
    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        height: '1',
        width: '1',
        videoId: '${safeVideoId}',
        playerVars: {
          'autoplay': 1,
          'controls': 0,
          'modestbranding': 1,
          'rel': 0,
          'showinfo': 0,
          'playsinline': 1,
          'mute': 0,
          'enablejsapi': 1,
          'origin': window.location.origin || 'https://localhost',
          'widget_referrer': window.location.href || 'https://localhost'
        },
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange,
          'onError': onPlayerError
        }
      });
    }

    function onPlayerReady(event) {
      isReady = true;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ready'
      }));
      if (player && player.playVideo) {
        player.playVideo();
        console.log('Auto-playing video immediately');
      }
    }

    function onPlayerStateChange(event) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'stateChange',
        state: event.data
      }));
      
      if (event.data == YT.PlayerState.ENDED) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ended'
        }));
      }
    }

    function onPlayerError(event) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        error: event.data
      }));
    }

    window.addEventListener('message', function(event) {
      if (!isReady || !player) return;
      
      try {
        var data = JSON.parse(event.data);
        switch(data.command) {
          case 'play':
            player.playVideo();
            break;
          case 'pause':
            player.pauseVideo();
            break;
          case 'seekForward':
            var currentTime = player.getCurrentTime();
            player.seekTo(currentTime + 10, true);
            break;
          case 'seekBackward':
            var currentTime = player.getCurrentTime();
            player.seekTo(Math.max(0, currentTime - 10), true);
            break;
        }
      } catch(e) {
        console.error('Error processing command:', e);
      }
    });
  </script>
</body>
</html>`;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch(data.type) {
        case 'ready':
          setIsLoading(false);
          break;
        case 'stateChange':
          // YouTube Player States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
          if (data.state === 1) {
            setIsPlaying(true);
          } else if (data.state === 2 || data.state === 0) {
            setIsPlaying(false);
          }
          break;
        case 'ended':
          setIsPlaying(false);
          onEnd?.();
          break;
        case 'error':
          const errorMsg = `Failed to play audio: Error code ${data.error}`;
          setError(errorMsg);
          setIsLoading(false);
          onError?.(errorMsg);
          break;
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  const sendCommand = (command: string) => {
    const message = JSON.stringify({ command });
    if (Platform.OS === 'web') {
      webViewRef.current?.postMessage(message);
    } else {
      webViewRef.current?.injectJavaScript(`
        window.postMessage(${JSON.stringify(message)}, '*');
        true;
      `);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      sendCommand('pause');
    } else {
      sendCommand('play');
    }
  };

  const seekForward = () => {
    sendCommand('seekForward');
  };

  const seekBackward = () => {
    sendCommand('seekBackward');
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to play audio</Text>
          <Text style={styles.errorSubtext}>{title}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hidden WebView for audio playback */}
      <View style={styles.hiddenWebView}>
        <WebView
          ref={webViewRef}
          source={{ html: getHtmlContent() }}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          originWhitelist={['*']}
        />
      </View>

      {/* Visible UI with image placeholder */}
      <View style={styles.playerContainer}>
        {/* Album Art / Thumbnail */}
        <View style={styles.artworkContainer}>
          {thumbnail ? (
            <Image 
              source={{ uri: thumbnail }} 
              style={styles.artwork} 
              resizeMode="cover"
              onError={() => console.warn('Failed to load audio player thumbnail:', thumbnail)}
            />
          ) : (
            <View style={styles.placeholderArtwork}>
              <Volume2 size={60} color="#666" />
            </View>
          )}
          
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="white" />
            </View>
          )}
        </View>

        {/* Track Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {channelTitle && (
            <Text style={styles.artist} numberOfLines={1}>{channelTitle}</Text>
          )}
        </View>

        {/* Playback Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            onPress={seekBackward} 
            style={styles.controlButton}
            disabled={isLoading}
          >
            <SkipBack size={24} color={isLoading ? "#666" : "#333"} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={togglePlayPause} 
            style={styles.playButton}
            disabled={isLoading}
          >
            {isPlaying ? (
              <Pause size={32} color="white" fill="white" />
            ) : (
              <Play size={32} color="white" fill="white" />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={seekForward} 
            style={styles.controlButton}
            disabled={isLoading}
          >
            <SkipForward size={24} color={isLoading ? "#666" : "#333"} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  hiddenWebView: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: 'none',
  },
  playerContainer: {
    alignItems: 'center',
  },
  artworkContainer: {
    width: 280,
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  placeholderArtwork: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  artist: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b6b',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});