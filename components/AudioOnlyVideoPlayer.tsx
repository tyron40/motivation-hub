import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import YoutubePlayer from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  RotateCw,
} from 'lucide-react-native';

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

interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  duration: number;
  viewCount: number;
  publishedAt: string;
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
  onError,
  onNext,
  onPrevious
}: AudioOnlyVideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const webReadyTimeout = useRef<any>(null);
  
  const playerRef = useRef<any>(null);
  const progressInterval = useRef<any>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (webReadyTimeout.current) {
        clearTimeout(webReadyTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchVideoMetadata = async () => {
      console.log(`🎵 Fetching metadata for audio: ${videoId}`);
      setIsLoading(true);
      setError(null);

      try {
        const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
        if (!apiKey) {
          throw new Error('YouTube API key not configured');
        }

        const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
        detailsUrl.searchParams.set('id', videoId);
        detailsUrl.searchParams.set('key', apiKey);

        const response = await fetch(detailsUrl.toString());
        
        if (!response.ok) {
          throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
          throw new Error('Audio not found');
        }

        const video = data.items[0];
        
        const parseDuration = (duration: string): number => {
          const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (!match) return 0;
          const hours = parseInt(match[1] || '0');
          const minutes = parseInt(match[2] || '0');
          const seconds = parseInt(match[3] || '0');
          return hours * 3600 + minutes * 60 + seconds;
        };

        const videoDuration = parseDuration(video.contentDetails.duration);
        setDuration(videoDuration);

        setMetadata({
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description || '',
          thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
          channelTitle: video.snippet.channelTitle,
          duration: videoDuration,
          viewCount: parseInt(video.statistics.viewCount || '0'),
          publishedAt: video.snippet.publishedAt,
        });

        console.log(`✅ Audio metadata fetched:`, video.snippet.title);
        setIsLoading(false);
      } catch (err: any) {
        console.error('❌ Error fetching audio metadata:', err);
        setError(err.message || 'Failed to fetch audio data');
        setIsLoading(false);
        onError?.(err.message || 'Failed to fetch audio data');
      }
    };

    if (videoId) {
      fetchVideoMetadata();
    }
  }, [videoId, onError]);

  const onPlayerReady = useCallback(() => {
    console.log('✅ YouTube player ready');
    setPlayerReady(true);
    setError(null);
    
    if (Platform.OS !== 'web' && playerRef.current) {
      playerRef.current.getDuration().then((dur: number) => {
        console.log('📊 Video duration:', dur);
        setDuration(dur);
      });
      
      if (autoplay) {
        console.log('🔊 Autoplay enabled - starting playback');
        setTimeout(() => {
          playerRef.current?.playVideo();
          setIsPlaying(true);
        }, 300);
      }
    }
  }, [autoplay]);

  const onPlayerError = useCallback((errorMsg: string) => {
    console.error('❌ YouTube player error:', errorMsg);
    setError('Failed to load video');
    setPlayerReady(false);
  }, []);

  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    progressInterval.current = setInterval(async () => {
      if (playerRef.current && !isSeeking) {
        try {
          const time = await playerRef.current.getCurrentTime();
          setCurrentTime(time);
        } catch (err) {
          console.error('Error getting current time:', err);
        }
      }
    }, 500);
  }, [isSeeking]);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const onStateChange = useCallback((state: string) => {
    console.log('🎬 Player state:', state);
    
    if (state === 'playing') {
      setIsPlaying(true);
      startProgressTracking();
    } else if (state === 'paused' || state === 'ended') {
      setIsPlaying(false);
      stopProgressTracking();
      
      if (state === 'ended') {
        console.log('🏁 Video ended');
        setCurrentTime(0);
      }
    }
  }, [startProgressTracking, stopProgressTracking]);

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.stopAnimation();
    }
  }, [isPlaying, rotateAnim]);



  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (!playerReady || !playerRef.current) {
      console.log('⚠️ Player not ready yet');
      return;
    }

    try {
      if (Platform.OS === 'web') {
        if (isPlaying) {
          console.log('⏸️ Pausing video');
          playerRef.current.injectJavaScript('window.pauseVideo();');
          setIsPlaying(false);
        } else {
          console.log('▶️ Playing video');
          playerRef.current.injectJavaScript('window.playVideo();');
          setIsPlaying(true);
        }
      } else {
        if (isPlaying) {
          console.log('⏸️ Pausing video');
          await playerRef.current.pauseVideo();
        } else {
          console.log('▶️ Playing video');
          await playerRef.current.playVideo();
        }
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
    }
  };

  const handleSkipForward = async () => {
    if (!playerReady || !playerRef.current) return;
    
    try {
      const newPosition = Math.min(currentTime + 15, duration);
      if (Platform.OS === 'web') {
        playerRef.current.injectJavaScript(`window.seekTo(${newPosition});`);
        setCurrentTime(newPosition);
      } else {
        await playerRef.current.seekTo(newPosition, true);
        setCurrentTime(newPosition);
      }
    } catch (err) {
      console.error('Error skipping forward:', err);
    }
  };

  const handleSkipBackward = async () => {
    if (!playerReady || !playerRef.current) return;
    
    try {
      const newPosition = Math.max(currentTime - 15, 0);
      if (Platform.OS === 'web') {
        playerRef.current.injectJavaScript(`window.seekTo(${newPosition});`);
        setCurrentTime(newPosition);
      } else {
        await playerRef.current.seekTo(newPosition, true);
        setCurrentTime(newPosition);
      }
    } catch (err) {
      console.error('Error skipping backward:', err);
    }
  };

  const handleSliderChange = async (value: number) => {
    if (!playerReady || !playerRef.current) return;
    
    setCurrentTime(value);
  };

  const handleSliderComplete = async (value: number) => {
    if (!playerReady || !playerRef.current) return;
    
    try {
      if (Platform.OS === 'web') {
        playerRef.current.injectJavaScript(`window.seekTo(${value});`);
      } else {
        await playerRef.current.seekTo(value, true);
      }
      setIsSeeking(false);
    } catch (err) {
      console.error('Error seeking:', err);
      setIsSeeking(false);
    }
  };



  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.artworkContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
        <Text style={styles.loadingText}>Loading audio...</Text>
      </View>
    );
  }

  if (error || !metadata) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Cannot load audio</Text>
          <Text style={styles.errorSub}>{error || 'Audio not found'}</Text>
          <Text style={styles.errorHint}>Please try again or select another track</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.artworkContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.hiddenPlayerWrapper}>
            <WebView
              ref={playerRef}
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <style>
                        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: transparent; overflow: hidden; }
                        #player { width: 100%; height: 100%; }
                      </style>
                    </head>
                    <body>
                      <div id="player"></div>
                      <script>
                        var player;
                        var isReady = false;
                        var tag = document.createElement('script');
                        tag.src = "https://www.youtube.com/iframe_api";
                        var firstScriptTag = document.getElementsByTagName('script')[0];
                        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

                        function postMsg(data) {
                          try {
                            console.log('Posting message:', data);
                            if (window.ReactNativeWebView) {
                              window.ReactNativeWebView.postMessage(JSON.stringify(data));
                            } else if (window.parent !== window) {
                              window.parent.postMessage(JSON.stringify(data), '*');
                            } else {
                              console.warn('No message channel available');
                            }
                          } catch(e) {
                            console.error('postMsg error:', e);
                          }
                        }

                        function onYouTubeIframeAPIReady() {
                          console.log('YouTube API Ready');
                          player = new YT.Player('player', {
                            videoId: '${videoId}',
                            playerVars: {
                              autoplay: ${autoplay ? 1 : 0},
                              controls: 0,
                              disablekb: 1,
                              fs: 0,
                              modestbranding: 1,
                              playsinline: 1,
                              rel: 0
                            },
                            events: {
                              onReady: function(event) {
                                console.log('Player ready');
                                isReady = true;
                                postMsg({type: 'ready'});
                                
                                setInterval(function() {
                                  if (isReady && player && player.getCurrentTime) {
                                    try {
                                      var time = player.getCurrentTime();
                                      var duration = player.getDuration();
                                      var state = player.getPlayerState();
                                      postMsg({
                                        type: 'progress',
                                        currentTime: time,
                                        duration: duration,
                                        state: state
                                      });
                                    } catch(e) {
                                      console.error('Progress error:', e);
                                    }
                                  }
                                }, 500);
                              },
                              onStateChange: function(event) {
                                console.log('State change:', event.data);
                                var states = {'-1': 'unstarted', '0': 'ended', '1': 'playing', '2': 'paused', '3': 'buffering', '5': 'cued'};
                                postMsg({
                                  type: 'stateChange',
                                  state: states[event.data] || 'unknown'
                                });
                              },
                              onError: function(event) {
                                console.error('Player error:', event.data);
                                postMsg({type: 'error', error: event.data});
                              }
                            }
                          });
                        }

                        window.playVideo = function() { 
                          console.log('playVideo called, isReady:', isReady);
                          if (player && player.playVideo) {
                            player.playVideo(); 
                            console.log('Playing video');
                          } else {
                            console.error('Player not available', player);
                          }
                        };
                        window.pauseVideo = function() { 
                          console.log('pauseVideo called, isReady:', isReady);
                          if (player && player.pauseVideo) {
                            player.pauseVideo(); 
                            console.log('Pausing video');
                          } else {
                            console.error('Player not available', player);
                          }
                        };
                        window.seekTo = function(seconds) { 
                          console.log('seekTo called:', seconds);
                          if (player && player.seekTo) {
                            player.seekTo(seconds, true); 
                            console.log('Seeking to:', seconds);
                          } else {
                            console.error('Player not available', player);
                          }
                        };
                      </script>
                    </body>
                  </html>
                `
              }}
              style={{ width: 300, height: 300 }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback={true}
              scalesPageToFit={true}
              onLoad={() => {
                console.log('WebView loaded, waiting for YouTube API...');
                if (webReadyTimeout.current) {
                  clearTimeout(webReadyTimeout.current);
                }
                webReadyTimeout.current = setTimeout(() => {
                  console.log('⏱️ Timeout: Manually setting player ready');
                  setPlayerReady(true);
                  setError(null);
                }, 5000);
              }}
              onMessage={(event) => {
                try {
                  const message = event.nativeEvent.data;
                  let data;
                  
                  if (typeof message === 'string') {
                    data = JSON.parse(message);
                  } else {
                    data = message;
                  }
                  
                  console.log('WebView message:', data);
                  
                  if (data.type === 'ready') {
                    console.log('✅ Player is ready via message');
                    if (webReadyTimeout.current) {
                      clearTimeout(webReadyTimeout.current);
                    }
                    onPlayerReady();
                  } else if (data.type === 'stateChange') {
                    console.log('State changed to:', data.state);
                    onStateChange(data.state);
                  } else if (data.type === 'progress') {
                    if (!isSeeking && data.currentTime !== undefined) {
                      setCurrentTime(data.currentTime);
                    }
                    if (data.duration && duration === 0) {
                      setDuration(data.duration);
                    }
                    if (data.state === 1 && !isPlaying) {
                      setIsPlaying(true);
                    } else if (data.state === 2 && isPlaying) {
                      setIsPlaying(false);
                    }
                  } else if (data.type === 'error') {
                    console.error('Player error:', data.error);
                    onPlayerError('Player error: ' + data.error);
                  }
                } catch (e) {
                  console.error('Error parsing message:', e, event.nativeEvent.data);
                }
              }}
            />
          </View>
        ) : (
          <View style={styles.hiddenPlayerWrapper}>
            <YoutubePlayer
              ref={playerRef}
              videoId={videoId}
              height={300}
              width={300}
              play={isPlaying}
              onReady={onPlayerReady}
              onError={onPlayerError}
              onChangeState={onStateChange}
              webViewStyle={{ opacity: 0 }}
            />
          </View>
        )}
        
        <Animated.View style={[styles.thumbnailOverlay, { transform: [{ rotate: isPlaying ? spin : '0deg' }] }]}>
          <Image 
            source={{ uri: metadata.thumbnail || thumbnail }} 
            style={styles.artwork} 
          />
        </Animated.View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.title} numberOfLines={2}>{metadata.title}</Text>
        <Text style={styles.subtitle}>{metadata.channelTitle}</Text>
      </View>

      <View style={styles.progressSection}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={currentTime}
          onValueChange={handleSliderChange}
          onSlidingStart={() => setIsSeeking(true)}
          onSlidingComplete={handleSliderComplete}
          minimumTrackTintColor="#667eea"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#FFFFFF"
          disabled={!playerReady}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>
          <Text style={styles.timeText}>{formatDuration(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={onPrevious} style={styles.smallButton}>
          <SkipBack size={28} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkipBackward} style={styles.smallButton}>
          <RotateCcw size={24} color="#FFFFFF" />
          <Text style={styles.skipText}>15</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
          {isPlaying ? (
            <Pause size={36} color="#000000" fill="#000000" />
          ) : (
            <Play size={36} color="#000000" fill="#000000" />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkipForward} style={styles.smallButton}>
          <RotateCw size={24} color="#FFFFFF" />
          <Text style={styles.skipText}>15</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext} style={styles.smallButton}>
          <SkipForward size={28} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  artworkContainer: {
    width: width * 0.75,
    height: width * 0.75,
    maxWidth: 320,
    maxHeight: 320,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 40,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    backgroundColor: '#1C1C1E',
    position: 'relative',
  },

  hiddenPlayerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
    zIndex: 1,
  },

  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },

  artwork: {
    width: '100%',
    height: '100%',
  },

  infoSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },

  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    textAlign: 'center',
  },

  progressSection: {
    width: '100%',
    marginBottom: 32,
  },

  slider: {
    width: '100%',
    height: 40,
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -8,
  },

  timeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
  },

  smallButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  skipText: {
    position: 'absolute',
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    bottom: 12,
  },

  loadingText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 16,
  },

  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },

  errorText: {
    fontSize: 18,
    color: '#ff6b6b',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },

  errorSub: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 8,
  },

  errorHint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontStyle: 'italic',
  },


});
