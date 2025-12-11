import React, { useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { AlertCircle, RefreshCw } from 'lucide-react-native';

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  autoplay?: boolean;
  onReady?: () => void;
  onError?: (error: string) => void;
}

export default function YouTubePlayer({
  videoId,
  title,
  autoplay = false,
  onReady,
  onError
}: YouTubePlayerProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            background-color: #000;
            overflow: hidden;
          }
          #player-container {
            width: 100vw;
            height: 100vh;
            position: relative;
          }
          #player {
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        <div id="player-container">
          <div id="player"></div>
        </div>

        <script src="https://www.youtube.com/iframe_api"></script>
        <script>
          let player;
          let isReady = false;

          function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
              videoId: '${videoId}',
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: ${autoplay ? 1 : 0},
                controls: 1,
                rel: 0,
                showinfo: 0,
                modestbranding: 1,
                playsinline: 1,
                fs: 1,
                cc_load_policy: 0,
                iv_load_policy: 3,
                autohide: 1
              },
              events: {
                onReady: function(event) {
                  isReady = true;
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'ready'
                  }));
                  if (${autoplay}) {
                    event.target.playVideo();
                  }
                },
                onError: function(event) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    error: 'Error code: ' + event.data
                  }));
                },
                onStateChange: function(event) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'stateChange',
                    state: event.data
                  }));
                }
              }
            });
          }

          window.addEventListener('error', function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: e.message
            }));
          });
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'ready':
          console.log('✅ YouTube player ready:', videoId);
          setIsLoading(false);
          setError(null);
          onReady?.();
          break;
        case 'error':
          console.error('❌ YouTube player error:', data.error);
          setError(data.error);
          setIsLoading(false);
          onError?.(data.error);
          break;
        case 'stateChange':
          console.log('📊 Player state changed:', data.state);
          break;
      }
    } catch (err) {
      console.error('❌ Error parsing message:', err);
    }
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle color="#ff6b6b" size={48} />
        <Text style={styles.errorTitle}>Unable to load video</Text>
        <Text style={styles.errorText}>{title}</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
          <RefreshCw color="white" size={20} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <Text style={styles.helpText}>Video ID: {videoId}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webView}
        onMessage={handleMessage}
        allowsFullscreenVideo={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ WebView error:', nativeEvent);
          setError('Failed to load video player');
          setIsLoading(false);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ HTTP error:', nativeEvent.statusCode);
          setError(`HTTP error: ${nativeEvent.statusCode}`);
          setIsLoading(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    color: '#666',
    fontSize: 12,
    marginTop: 16,
    fontFamily: 'monospace',
  },
});
