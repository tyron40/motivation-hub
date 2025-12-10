// ====================
//  AUDIO ONLY PLAYER FIXED VERSION
// ====================

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking
} from 'react-native';

import { WebView } from 'react-native-webview';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2
} from 'lucide-react-native';

import CustomSlider from './CustomSlider';

// Props
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

// =========================
//     COMPONENT START
// =========================

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
  const [, setBufferingCount] = useState(0);

  const webViewRef = useRef<WebView>(null);

  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerReadyRef = useRef(false);
  const lastBufferTimeRef = useRef<number>(0);

  // ===============================
  //  FIX: YouTube Hidden Player HTML
  // ===============================

  const getHtmlContent = () => {
    const safeVideoId = String(videoId).replace(/["'<>&]/g, '');

    return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * {
    margin: 0;
    padding: 0;
  }
  body {
    margin: 0;
    padding: 0;
    background: #000;
    overflow: hidden;
  }
  #player-container {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 1px;
    height: 1px;
    opacity: 0.01;
    overflow: hidden;
  }
  #player {
    width: 100%;
    height: 100%;
  }
</style>
</head>
<body>
  <div id="player-container">
    <div id="player"></div>
  </div>

  <script>
    console.log('🎵 Initializing YouTube player for video: ${safeVideoId}');
    
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    var player = null;
    var isReady = false;
    var timeUpdateInterval = null;
    var playerLoadTimeout = null;

    function onYouTubeIframeAPIReady() {
      console.log('🎵 YouTube IFrame API loaded');
      
      playerLoadTimeout = setTimeout(function() {
        if (!isReady) {
          console.error('❌ Player failed to load within 10 seconds');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "error",
            error: 'timeout',
            errorMessage: "Player loading timeout"
          }));
        }
      }, 10000);
      
      try {
        player = new YT.Player('player', {
          height: '360',
          width: '640',
          videoId: '${safeVideoId}',
          playerVars: {
            autoplay: 0,
            controls: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            widget_referrer: window.location.origin
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: onPlayerError
          }
        });
        console.log('🎵 Player created successfully');
      } catch (error) {
        console.error('❌ Error creating player:', error);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "error",
          error: 'init_error',
          errorMessage: "Failed to initialize player: " + error.message
        }));
      }
    }

    function onPlayerReady(event) {
      console.log('🎵 YouTube Player is ready');
      isReady = true;
      
      if (playerLoadTimeout) {
        clearTimeout(playerLoadTimeout);
        playerLoadTimeout = null;
      }

      try {
        var duration = player.getDuration();
        console.log('🎵 Video duration:', duration);

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "ready",
          duration: duration
        }));

        if (${autoplay ? 'true' : 'false'}) {
          setTimeout(function() {
            console.log('🎵 Auto-playing video');
            try {
              player.playVideo();
            } catch (playError) {
              console.error('❌ Error auto-playing:', playError);
            }
          }, 500);
        }
      } catch (error) {
        console.error('❌ Error in onPlayerReady:', error);
      }
    }

    function onPlayerStateChange(event) {
      try {
        const state = event.data;
        console.log('🎵 Player state changed:', state);
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "stateChange",
          state: state
        }));

        if (state === YT.PlayerState.ENDED) {
          console.log('🎵 Video ended');
          if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
            timeUpdateInterval = null;
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ended" }));
        } else if (state === YT.PlayerState.PLAYING) {
          console.log('🎵 Video is playing');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "playbackStarted"
          }));
          if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
          }
          timeUpdateInterval = setInterval(function() {
            try {
              if (player && typeof player.getCurrentTime === 'function') {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: "timeUpdate",
                  currentTime: player.getCurrentTime(),
                  duration: player.getDuration(),
                  state: state
                }));
              }
            } catch (timeError) {
              console.error('❌ Error in time update:', timeError);
            }
          }, 500);
        } else if (state === YT.PlayerState.PAUSED) {
          console.log('⏸️ Video paused');
          if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
            timeUpdateInterval = null;
          }
        } else if (state === YT.PlayerState.BUFFERING) {
          console.log('⏳ Video buffering...');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "buffering"
          }));
        } else if (state === YT.PlayerState.CUED) {
          console.log('📼 Video cued');
        }
      } catch (error) {
        console.error('❌ Error in onPlayerStateChange:', error);
      }
    }

    function onPlayerError(event) {
      const errors = {
        2: "Invalid video ID or parameters",
        5: "HTML5 player error",
        100: "Video not found or private",
        101: "Video owner does not allow embedding",
        150: "Video owner does not allow embedding",
        153: "Video owner does not allow embedding"
      };

      const errorCode = event.data;
      const errorMessage = errors[errorCode] || "Unknown playback error";
      
      console.error('❌ YouTube Player error:', errorCode, errorMessage);

      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
      }

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "error",
        error: errorCode,
        errorMessage: errorMessage
      }));
    }

    window.addEventListener("message", function(event) {
      try {
        if (!player || !isReady) {
          console.warn('⚠️ Player not ready, ignoring command');
          return;
        }
        
        const data = JSON.parse(event.data);
        console.log('📩 Received command:', data.command);

        if (data.command === "play") {
          player.playVideo();
        } else if (data.command === "pause") {
          player.pauseVideo();
        } else if (data.command === "seekTo" && typeof data.time !== 'undefined') {
          player.seekTo(data.time, true);
        }
      } catch (error) {
        console.error('❌ Error handling message:', error);
      }
    });

    window.onerror = function(msg, url, lineNo, columnNo, error) {
      console.error('❌ Global error:', msg, 'at', url, lineNo, columnNo);
      return false;
    };
  </script>
</body>
</html>`;
  };

  // ====================================
  //  WebView -> RN Message Handler
  // ====================================

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📩 Message from WebView:', data.type);

      if (data.type === "ready") {
        console.log('✅ Player ready! Duration:', data.duration);
        playerReadyRef.current = true;
        setDuration(data.duration || 0);
        setIsLoading(false);
        setError(null);
        
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }

      if (data.type === "stateChange") {
        if (data.state === 1) {
          console.log('▶️ Playing');
          setIsPlaying(true);
          setIsLoading(false);
          setBufferingCount(0);
          
          if (bufferingTimeoutRef.current) {
            clearTimeout(bufferingTimeoutRef.current);
            bufferingTimeoutRef.current = null;
          }
        }
        if (data.state === 2) {
          console.log('⏸️ Paused');
          setIsPlaying(false);
        }
        if (data.state === 3) {
          console.log('⏳ Buffering...');
          const now = Date.now();
          lastBufferTimeRef.current = now;
          
          setBufferingCount(prev => {
            const newCount = prev + 1;
            console.log(`⏳ Buffering count: ${newCount}`);
            return newCount;
          });
          
          if (bufferingTimeoutRef.current) {
            clearTimeout(bufferingTimeoutRef.current);
          }
          
          bufferingTimeoutRef.current = setTimeout(() => {
            console.error('❌ Video stuck in buffering - skipping');
            const errorMsg = 'Video playback timeout - buffering too long';
            setError(errorMsg);
            setIsLoading(false);
            onError?.(errorMsg);
            
            setTimeout(() => {
              console.log('⏭️ Auto-skipping to next video due to buffering timeout');
              onNext?.();
            }, 1500);
          }, 15000);
        }
      }

      if (data.type === "timeUpdate") {
        if (!isSeeking) setCurrentTime(data.currentTime);
        setDuration(data.duration);
      }

      if (data.type === "ended") {
        console.log('✅ Video ended');
        setIsPlaying(false);
        setCurrentTime(0);
        onEnd?.();
      }

      if (data.type === "error") {
        console.error('❌ Player error:', data.error, data.errorMessage);
        const errorMsg = `${data.errorMessage} (Code: ${data.error})`;
        setError(errorMsg);
        setIsLoading(false);
        onError?.(errorMsg);

        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        
        if (bufferingTimeoutRef.current) {
          clearTimeout(bufferingTimeoutRef.current);
          bufferingTimeoutRef.current = null;
        }

        setTimeout(() => {
          console.log('⏭️ Auto-skipping to next video due to error');
          onNext?.();
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to parse WebView message:', err);
    }
  };

  // ====================================
  //  Commands to WebView
  // ====================================

  const sendCommand = (command: string, data?: any) => {
    if (!playerReadyRef.current) {
      console.warn('⚠️ Player not ready yet, queuing command:', command);
      return;
    }

    const msg = JSON.stringify({ command, ...data });
    console.log('📤 Sending command:', command, data);

    webViewRef.current?.injectJavaScript(`
      window.postMessage('${msg}', '*');
      true;
    `);
  };

  // ====================================
  //   PLAY / PAUSE TOGGLE
  // ====================================
  const togglePlayPause = () => {
    if (!playerReadyRef.current) {
      console.warn('⚠️ Player not ready');
      return;
    }

    if (isPlaying) {
      console.log('⏸️ Pausing playback');
      sendCommand("pause");
    } else {
      console.log('▶️ Starting playback');
      sendCommand("play");
    }
  };

  // ====================================
  //  GO TO YOUTUBE BUTTON
  // ====================================
  const openInYouTube = () => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    Linking.openURL(url);
  };

  // ================================
  //           UI RENDER
  // ================================

  if (error && !isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Cannot Play</Text>
        <Text style={styles.errorSub}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={openInYouTube}>
          <Text style={styles.buttonText}>Open in YouTube</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hidden Player */}
      <View style={styles.hiddenWebView}>
        <WebView
          ref={webViewRef}
          source={{ html: getHtmlContent() }}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          allowsFullscreenVideo={false}
          mixedContentMode="always"
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('❌ WebView error:', nativeEvent);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('❌ WebView HTTP error:', nativeEvent.statusCode, nativeEvent.url);
          }}
          onLoadStart={() => {
            console.log('🔄 WebView started loading');
          }}
          onLoadEnd={() => {
            console.log('✅ WebView finished loading');
          }}
        />
      </View>

      {/* Thumbnail */}
      <View style={styles.artworkContainer}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.artwork} />
        ) : (
          <Volume2 size={50} color="#444" />
        )}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{channelTitle}</Text>

      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={styles.time}>{formatTime(currentTime)}</Text>
        <CustomSlider
          minimumValue={0}
          maximumValue={duration || 1}
          value={currentTime}
          onValueChange={(v) => {
            setIsSeeking(true);
            setCurrentTime(v);
          }}
          onSlidingComplete={(v) => {
            setIsSeeking(false);
            sendCommand("seekTo", { time: v });
          }}
        />
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={onPrevious}>
          <SkipBack size={28} color="#333" />
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
          {isPlaying ? (
            <Pause size={32} color="#fff" />
          ) : (
            <Play size={32} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext}>
          <SkipForward size={28} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ====================================================
//                 STYLES
// ====================================================

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16
  },

  hiddenWebView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 2,
    height: 2,
    opacity: 0.01,
    zIndex: 0,         // FIXED
    overflow: 'hidden'
  },

  artworkContainer: {
    width: 260,
    height: 260,
    alignSelf: 'center',
    marginBottom: 20,
    backgroundColor: '#eee',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },

  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 16
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center"
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4
  },

  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#777",
    marginBottom: 16
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20
  },

  time: {
    width: 40,
    textAlign: "center",
    color: "#666"
  },

  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 30
  },

  playButton: {
    backgroundColor: "#ff6b6b",
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center"
  },

  errorText: {
    fontSize: 18,
    color: "#ff4444",
    fontWeight: "600",
    textAlign: "center"
  },

  errorSub: {
    textAlign: "center",
    color: "#666",
    marginBottom: 10
  },

  button: {
    backgroundColor: "#ff0000",
    padding: 12,
    borderRadius: 8,
    alignSelf: "center"
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600"
  }
});
