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

  const webViewRef = useRef<WebView>(null);

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerReadyRef = useRef(false);

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
  body {
    margin: 0;
    padding: 0;
    background: #000;
  }

  /* FIXED: Player MUST be visible to YouTube */
  #player-container {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 2px;
    height: 2px;
    opacity: 0.01;          /* MUST NOT be 0 */
    pointer-events: auto;   /* FIXED */
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
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);

    var player;
    var isReady = false;

    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        width: "640",
        height: "360",
        videoId: "${safeVideoId}",
        playerVars: {
          autoplay: 0,
          controls: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: "https://youtube.com"
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError
        }
      });
    }

    function onPlayerReady() {
      console.log('🎵 YouTube Player is ready');
      isReady = true;

      var duration = player.getDuration();
      console.log('🎵 Video duration:', duration);

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "ready",
        duration: duration
      }));

      setTimeout(function() {
        if (${autoplay ? 'true' : 'false'}) {
          console.log('🎵 Auto-playing video');
          player.playVideo();
        }
      }, 500);
    }

    var timeUpdateInterval = null;

    function onPlayerStateChange(event) {
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
      }

      if (state === YT.PlayerState.PLAYING) {
        console.log('🎵 Video is playing');
        if (timeUpdateInterval) {
          clearInterval(timeUpdateInterval);
        }
        timeUpdateInterval = setInterval(function() {
          if (player && typeof player.getCurrentTime === 'function') {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "timeUpdate",
              currentTime: player.getCurrentTime(),
              duration: player.getDuration(),
              state: state
            }));
          }
        }, 500);
      } else if (state === YT.PlayerState.PAUSED) {
        console.log('🎵 Video paused');
        if (timeUpdateInterval) {
          clearInterval(timeUpdateInterval);
          timeUpdateInterval = null;
        }
      }
    }

    function onPlayerError(event) {
      const errors = {
        2: "Invalid video ID",
        5: "HTML5 error",
        100: "Video removed/private",
        101: "Embedding disabled",
        150: "Embedding disabled",
        153: "Embedding disabled"
      };

      console.error('❌ YouTube Player error:', event.data, errors[event.data]);

      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
      }

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "error",
        error: event.data,
        errorMessage: errors[event.data] || "Playback error"
      }));
    }

    window.addEventListener("message", function(event) {
      if (!player || !isReady) return;
      const data = JSON.parse(event.data);

      if (data.command === "play") player.playVideo();
      if (data.command === "pause") player.pauseVideo();
      if (data.command === "seekTo") player.seekTo(data.time, true);
    });
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
        }
        if (data.state === 2) {
          console.log('⏸️ Paused');
          setIsPlaying(false);
        }
        if (data.state === 3) {
          console.log('⏳ Buffering');
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
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
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
