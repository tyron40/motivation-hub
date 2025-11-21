import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Play, Pause, SkipForward, SkipBack, Volume2 } from 'lucide-react-native';
import CustomSlider from './CustomSlider';

interface AudioOnlyVideoPlayerProps {
  videoId: string;
  title: string;
  thumbnail?: string;
  channelTitle?: string;
  autoplay?: boolean;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export default function AudioOnlyVideoPlayer({
  videoId,
  title,
  thumbnail,
  channelTitle,
  autoplay = false,
  onEnd,
  onError,
  onNext,
  onPrevious
}: AudioOnlyVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 1;
  const autoSkipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log(`🎵 Initializing AudioOnlyVideoPlayer for video: ${videoId}`);
    console.log(`📺 Video title: ${title}`);
    
    const loadingTimeout = setTimeout(() => {
      console.warn(`⚠️ Loading timeout for video ${videoId} - player may not be ready`);
      
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.log(`🔄 Retrying... (${retryCountRef.current}/${maxRetries})`);
        setIsLoading(true);
        setError(null);
        return;
      }
      
      setIsLoading(false);
      setError('Loading timeout. Skipping...');
      onError?.('Loading timeout');
      
      // Auto-skip after 1 second if still can't load
      const autoSkip = setTimeout(() => {
        console.log('⏭️ Auto-skipping unplayable video');
        onNext?.();
      }, 1000);
      
      autoSkipTimeoutRef.current = autoSkip;
    }, 10000);
    
    loadingTimeoutRef.current = loadingTimeout;

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      if (autoSkipTimeoutRef.current) {
        clearTimeout(autoSkipTimeoutRef.current);
        autoSkipTimeoutRef.current = null;
      }
    };
  }, [videoId, title, onError, onNext]);

  // Clean up auto-skip timeout when video changes
  useEffect(() => {
    return () => {
      if (autoSkipTimeoutRef.current) {
        clearTimeout(autoSkipTimeoutRef.current);
        autoSkipTimeoutRef.current = null;
      }
    };
  }, [videoId]);

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
          'autoplay': 0,
          'controls': 0,
          'modestbranding': 1,
          'rel': 0,
          'showinfo': 0,
          'playsinline': 1,
          'mute': 0,
          'enablejsapi': 1,
          'origin': window.location.origin || 'https://localhost',
          'widget_referrer': window.location.href || 'https://localhost',
          'fs': 0,
          'iv_load_policy': 3
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
      var videoDuration = player.getDuration();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ready',
        duration: videoDuration
      }));
      
      setTimeout(function() {
        if (player && player.playVideo) {
          try {
            player.unMute();
            player.setVolume(100);
            console.log('Player ready, waiting for manual play');
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'playbackReady'
            }));
          } catch(e) {
            console.error('Error in ready handler:', e);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: 'READY_HANDLER_FAILED'
            }));
          }
        }
      }, 500);
      
      setInterval(function() {
        if (player && player.getCurrentTime) {
          var currentTime = player.getCurrentTime();
          var duration = player.getDuration();
          var state = player.getPlayerState();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'timeUpdate',
            currentTime: currentTime,
            duration: duration,
            state: state
          }));
        }
      }, 500);
    }

    function onPlayerStateChange(event) {
      var stateNames = {
        '-1': 'UNSTARTED',
        '0': 'ENDED',
        '1': 'PLAYING',
        '2': 'PAUSED',
        '3': 'BUFFERING',
        '5': 'CUED'
      };
      
      console.log('Player state changed to:', stateNames[event.data] || event.data);
      
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'stateChange',
        state: event.data,
        stateName: stateNames[event.data] || 'UNKNOWN'
      }));
      
      if (event.data == YT.PlayerState.ENDED) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ended'
        }));
      }
      
      if (event.data == -1 || event.data == 5) {
        setTimeout(function() {
          if (player && player.getPlayerState && (player.getPlayerState() == -1 || player.getPlayerState() == 5)) {
            console.log('Video stuck in unstarted/cued state, attempting to play');
            try {
              player.unMute();
              player.setVolume(100);
              player.playVideo();
            } catch(e) {
              console.error('Error attempting to play stuck video:', e);
            }
          }
        }, 1500);
      }
      
      if (event.data == 3) {
        console.log('Video buffering...');
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'buffering'
        }));
      }
    }

    function onPlayerError(event) {
      var errorMessages = {
        2: 'Invalid video ID',
        5: 'HTML5 player error',
        100: 'Video not found or private',
        101: 'Video not allowed to be played in embedded players',
        150: 'Video not allowed to be played in embedded players'
      };
      
      console.error('YouTube player error:', event.data, errorMessages[event.data] || 'Unknown error');
      
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        error: event.data,
        errorMessage: errorMessages[event.data] || 'Unknown error'
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
          case 'seekTo':
            if (data.time !== undefined) {
              player.seekTo(data.time, true);
            }
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
      
      console.log('📨 WebView message:', data.type, data.stateName || '', data);
      
      switch(data.type) {
        case 'ready':
          console.log('✅ Player ready, duration:', data.duration);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          setIsLoading(false);
          setError(null);
          retryCountRef.current = 0;
          if (data.duration) {
            setDuration(data.duration);
          }
          if (autoplay) {
            setTimeout(() => {
              console.log('🎵 Auto-starting playback');
              sendCommand('play');
            }, 500);
          }
          break;
        case 'playbackReady':
          console.log('▶️ Playback system ready');
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          setIsLoading(false);
          setError(null);
          retryCountRef.current = 0;
          if (autoplay) {
            setTimeout(() => {
              console.log('🎵 Auto-starting playback');
              sendCommand('play');
            }, 500);
          }
          break;
        case 'playbackStarted':
          console.log('▶️ Playback started successfully');
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          setIsLoading(false);
          setIsPlaying(true);
          setError(null);
          retryCountRef.current = 0;
          break;
        case 'stateChange':
          console.log('🔄 State change:', data.stateName, '(', data.state, ')');
          if (data.state === 1) {
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
            }
            setIsPlaying(true);
            setIsLoading(false);
            setError(null);
          } else if (data.state === 2 || data.state === 0) {
            setIsPlaying(false);
          } else if (data.state === 3) {
            console.log('⏳ Buffering...');
          }
          break;
        case 'timeUpdate':
          if (!isSeeking && data.currentTime !== undefined) {
            setCurrentTime(data.currentTime);
          }
          if (data.duration !== undefined && data.duration > 0) {
            setDuration(data.duration);
          }
          if (data.state === 1) {
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
            }
            setIsLoading(false);
            setError(null);
            if (!isPlaying) {
              setIsPlaying(true);
            }
          }
          break;
        case 'ended':
          console.log('⏹️ Playback ended');
          setIsPlaying(false);
          setCurrentTime(0);
          onEnd?.();
          break;
        case 'error':
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          
          const errorCode = data.error;
          let errorMsg = data.errorMessage || 'Playback error';
          
          // Provide more specific error messages
          if (errorCode === 101 || errorCode === 150 || errorCode === 153) {
            errorMsg = 'This video cannot be embedded. Skipping...';
          } else if (errorCode === 100) {
            errorMsg = 'Video not available. Skipping...';
          } else if (errorCode === 2) {
            errorMsg = 'Invalid video ID. Skipping...';
          } else if (errorCode === 5) {
            errorMsg = 'Playback error. Skipping...';
          }
          
          console.error(`❌ Player error for video ${videoId} (${title}):`, errorMsg, 'Code:', errorCode);
          
          // For embedding errors (101, 150), skip immediately without retry
          if (errorCode === 101 || errorCode === 150 || errorCode === 100) {
            setError(errorMsg);
            setIsLoading(false);
            setIsPlaying(false);
            onError?.(errorMsg);
            
            // Auto-skip immediately for embedding restriction errors
            console.log('⏭️ Auto-skipping unplayable video (embedding restricted)');
            autoSkipTimeoutRef.current = setTimeout(() => {
              onNext?.();
            }, 800);
            return;
          }
          
          if (retryCountRef.current < maxRetries && (errorCode === 5 || errorCode === 'PLAYBACK_START_FAILED')) {
            retryCountRef.current += 1;
            console.log(`🔄 Retrying after error... (${retryCountRef.current}/${maxRetries})`);
            setTimeout(() => {
              setIsLoading(true);
              setError(null);
            }, 1000);
            return;
          }
          
          setError(errorMsg);
          setIsLoading(false);
          setIsPlaying(false);
          onError?.(errorMsg);
          
          // Auto-skip after 1.5 seconds for other errors
          autoSkipTimeoutRef.current = setTimeout(() => {
            console.log('⏭️ Auto-skipping unplayable video after error');
            onNext?.();
          }, 1500);
          break;
      }
    } catch (e) {
      console.error('❌ Error parsing WebView message:', e, event.nativeEvent.data);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      setError('Communication error with player');
      setIsLoading(false);
      onError?.('WebView communication error');
    }
  };

  const sendCommand = (command: string, data?: any) => {
    const message = JSON.stringify({ command, ...data });
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
    console.log('🎵 Toggle play/pause, currently:', isPlaying ? 'playing' : 'paused');
    if (isPlaying) {
      sendCommand('pause');
      setIsPlaying(false);
    } else {
      if (error) {
        setError(null);
        setIsLoading(true);
        retryCountRef.current = 0;
        setTimeout(() => {
          sendCommand('play');
        }, 1000);
      } else {
        sendCommand('play');
        setIsPlaying(true);
      }
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    }
  };

  const handleSeek = (value: number) => {
    setCurrentTime(value);
    sendCommand('seekTo', { time: value });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          {thumbnail && (
            <Image 
              source={{ uri: thumbnail }} 
              style={styles.errorThumbnail} 
              resizeMode="cover"
            />
          )}
          <Text style={styles.errorText}>Cannot Play Video</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity 
              onPress={() => {
                if (autoSkipTimeoutRef.current) {
                  clearTimeout(autoSkipTimeoutRef.current);
                }
                setError(null);
                setIsLoading(true);
                setCurrentTime(0);
                setDuration(0);
                retryCountRef.current = 0;
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                if (autoSkipTimeoutRef.current) {
                  clearTimeout(autoSkipTimeoutRef.current);
                }
                onNext?.();
              }}
              style={[styles.retryButton, styles.skipButton]}
            >
              <Text style={styles.retryText}>Skip</Text>
            </TouchableOpacity>
          </View>
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

        {/* Progress Slider */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <CustomSlider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration || 1}
            value={currentTime}
            onValueChange={(value: number) => {
              setIsSeeking(true);
              setCurrentTime(value);
            }}
            onSlidingComplete={(value: number) => {
              setIsSeeking(false);
              handleSeek(value);
            }}
            minimumTrackTintColor="#ff6b6b"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#ff6b6b"
            disabled={isLoading}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Playback Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            onPress={handlePrevious} 
            style={styles.controlButton}
            disabled={isLoading || !onPrevious}
          >
            <SkipBack size={24} color={isLoading || !onPrevious ? "#ccc" : "#333"} />
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
            onPress={handleNext} 
            style={styles.controlButton}
            disabled={isLoading || !onNext}
          >
            <SkipForward size={24} color={isLoading || !onNext ? "#ccc" : "#333"} />
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
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    minWidth: 40,
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
    marginBottom: 16,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    flex: 1,
  },
  skipButton: {
    backgroundColor: '#666',
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  errorThumbnail: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
  },

});