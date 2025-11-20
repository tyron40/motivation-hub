import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { getBrowserSafeAudioUrl } from '@/services/speechService';

// Check if URL is a YouTube URL
function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// Extract YouTube video ID
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

interface AudioPlayerProps {
  audioUrl: string;
  isPlaying: boolean;
  onPlaybackStatusUpdate?: (status: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    didJustFinish: boolean;
  }) => void;
  onError?: (error: string) => void;
}

export const AudioPlayer = forwardRef<any, AudioPlayerProps>((
  {
    audioUrl,
    isPlaying,
    onPlaybackStatusUpdate,
    onError,
  },
  ref
) => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [safeAudioUrl, setSafeAudioUrl] = useState<string>('');
  const [webReady, setWebReady] = useState(false);
  
  // Validation after hooks to comply with React rules
  const isValidAudioUrl = audioUrl && typeof audioUrl === 'string' && audioUrl.trim().length > 0;

  // Get browser-safe audio URL
  useEffect(() => {
    const getSafeUrl = async () => {
      try {
        setIsLoading(true);
        
        // Validate audioUrl before processing
        if (!audioUrl || typeof audioUrl !== 'string' || audioUrl.trim().length === 0) {
          console.warn('⚠️ Invalid or empty audioUrl provided:', audioUrl);
          const fallbackUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
          setSafeAudioUrl(fallbackUrl);
          setIsLoading(false);
          return;
        }
        
        // Check if it's a YouTube URL - if so, pass it through as-is
        // The parent component should handle YouTube video IDs differently
        if (isYouTubeUrl(audioUrl)) {
          const videoId = extractYouTubeId(audioUrl);
          if (videoId) {
            console.log('🎬 YouTube video detected:', videoId);
            console.log('⚠️ YouTube URLs cannot be played as audio directly');
            console.log('⚠️ Please use YouTubePlayer component for YouTube content');
            // Signal to parent that this is a YouTube video
            setSafeAudioUrl(`youtube:${videoId}`);
            onError?.('YouTube videos require YouTubePlayer component');
            setIsLoading(false);
            return;
          }
        }
        
        const safeUrl = await getBrowserSafeAudioUrl(audioUrl);
        
        // Validate the returned safe URL
        if (!safeUrl || typeof safeUrl !== 'string' || safeUrl.trim().length === 0) {
          console.warn('⚠️ Invalid safe URL returned:', safeUrl);
          const fallbackUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
          setSafeAudioUrl(fallbackUrl);
          onError?.('Using fallback audio');
        } else {
          setSafeAudioUrl(safeUrl);
          console.log('🎵 Using safe audio URL:', safeUrl);
        }
      } catch (error) {
        console.error('Error getting safe audio URL:', error);
        const fallbackUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        setSafeAudioUrl(fallbackUrl);
        onError?.('Using fallback audio');
      } finally {
        setIsLoading(false);
      }
    };

    if (audioUrl && typeof audioUrl === 'string' && audioUrl.trim().length > 0) {
      getSafeUrl();
    } else {
      console.log('⚠️ No valid audioUrl provided, using fallback');
      const fallbackUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      setSafeAudioUrl(fallbackUrl);
      setIsLoading(false);
    }
  }, [audioUrl, onError]);

  // Initialize audio player with enhanced error handling
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    const initializeAudio = async () => {
      if (!safeAudioUrl || isLoading) {
        console.log('⚠️ Skipping audio init - no URL or still loading');
        return;
      }
      setWebReady(false);

      // Validate audio URL
      if (typeof safeAudioUrl !== 'string' || safeAudioUrl.length === 0) {
        console.warn('⚠️ Invalid audio URL:', safeAudioUrl);
        onError?.('Invalid audio URL');
        return;
      }

      try {
        console.log('🎵 Initializing audio player for:', safeAudioUrl);
        
        // Add timeout to prevent hanging
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('⚠️ Audio initialization timeout');
            onError?.('Audio initialization timeout');
          }
        }, 15000); // 15 second timeout for production stability
        
        if (Platform.OS === 'web') {
          // Web Audio API
          if (webAudioRef.current) {
            try {
              webAudioRef.current.pause();
            } catch {}
            webAudioRef.current.src = '';
            webAudioRef.current = null;
          }

          const audio = new (window as any).Audio();
          if (!isMounted) return;
          
          webAudioRef.current = audio;

          audio.preload = 'auto';
          // Avoid forcing crossOrigin which can break some hosts
          // audio.crossOrigin = 'anonymous';
          
          audio.addEventListener('loadedmetadata', () => {
            if (isMounted) {
              console.log('✅ Web audio metadata loaded');
              onPlaybackStatusUpdate?.({
                isPlaying: false,
                currentTime: 0,
                duration: audio.duration || 0,
                didJustFinish: false,
              });
            }
          });

          audio.addEventListener('canplay', () => {
            if (isMounted) {
              setWebReady(true);
              console.log('✅ Web audio canplay');
            }
          });

          audio.addEventListener('canplaythrough', () => {
            if (isMounted) {
              setWebReady(true);
              console.log('✅ Web audio canplaythrough');
            }
          });

          audio.addEventListener('timeupdate', () => {
            if (isMounted) {
              onPlaybackStatusUpdate?.({
                isPlaying: !audio.paused,
                currentTime: audio.currentTime || 0,
                duration: audio.duration || 0,
                didJustFinish: false,
              });
            }
          });

          audio.addEventListener('ended', () => {
            if (isMounted) {
              console.log('✅ Web audio playback ended');
              onPlaybackStatusUpdate?.({
                isPlaying: false,
                currentTime: 0,
                duration: audio.duration || 0,
                didJustFinish: true,
              });
            }
          });

          audio.addEventListener('error', (event: any) => {
            const err = (audio as any).error;
            const errorDetails = {
              code: err?.code || 'unknown',
              message: err?.message || 'Unknown error',
              networkState: audio.networkState,
              readyState: audio.readyState,
              src: audio.src
            };
            console.error('❌ Web audio error:', JSON.stringify(errorDetails, null, 2));
            if (isMounted) {
              onError?.(`Audio playback failed: ${err?.message || 'Network error'}`);
            }
          });
          
          audio.addEventListener('loadstart', () => {
            if (isMounted) {
              console.log('🔄 Web audio loading started');
            }
          });
          
          audio.addEventListener('progress', () => {
            if (isMounted && audio.buffered.length > 0) {
              try {
                const buffered = (audio.buffered.end(0) / audio.duration) * 100;
                if (isFinite(buffered)) {
                  console.log(`📊 Web audio buffered: ${buffered.toFixed(1)}%`);
                }
              } catch {
                // Ignore buffering calculation errors
              }
            }
          });

          // Set source and load with better error handling
          try {
            // Double-check the URL before setting it
            if (!safeAudioUrl || typeof safeAudioUrl !== 'string' || safeAudioUrl.trim().length === 0) {
              console.error('❌ Cannot set empty or invalid audio source:', safeAudioUrl);
              if (isMounted) {
                onError?.('Invalid audio source URL');
              }
              return;
            }
            
            // Validate URL format
            try {
              new URL(safeAudioUrl);
            } catch (urlError) {
              console.error('❌ Invalid URL format:', safeAudioUrl, urlError);
              if (isMounted) {
                onError?.('Invalid audio URL format');
              }
              return;
            }
            
            // Clear any previous source first to prevent empty src errors
            if (audio.src) {
              audio.pause();
              audio.src = '';
              audio.load();
            }
            
            // Set the new source
            audio.src = safeAudioUrl;
            audio.load();
            console.log('🔄 Web audio source set and loading initiated');
          } catch (loadError) {
            console.error('❌ Error setting audio source:', loadError);
            if (isMounted) {
              onError?.('Failed to load audio source');
            }
          }
        } else {
          // Native Audio (Expo AV)
          if (soundRef.current) {
            try {
              await soundRef.current.unloadAsync();
            } catch (e) {
              console.log('⚠️ Error unloading previous sound:', e);
            }
            soundRef.current = null;
          }

          // Set audio mode for playback with error handling
          try {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              staysActiveInBackground: true,
              playsInSilentModeIOS: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
            });
          } catch (audioModeError) {
            console.warn('⚠️ Could not set audio mode:', audioModeError);
            // Continue anyway, this is not critical for basic playback
          }

          if (!isMounted) return;

          console.log('🔊 Creating native sound from URI:', safeAudioUrl);
          
          try {
            const { sound } = await Audio.Sound.createAsync(
              { uri: safeAudioUrl },
              {
                shouldPlay: false,
                progressUpdateIntervalMillis: 1000,
                volume: 1.0,
                rate: 1.0,
                shouldCorrectPitch: true,
                isLooping: false,
              },
              (status) => {
                // Handle initial load status
                if (!isMounted) return;
                
                try {
                  if (status.isLoaded) {
                    onPlaybackStatusUpdate?.({
                      isPlaying: status.isPlaying || false,
                      currentTime: Math.floor((status.positionMillis || 0) / 1000),
                      duration: Math.floor((status.durationMillis || 0) / 1000),
                      didJustFinish: status.didJustFinish || false,
                    });
                  } else if (status.error) {
                    console.error('❌ Native audio load error:', status.error);
                    onError?.('Audio failed to load');
                  }
                } catch (statusError) {
                  console.error('❌ Error in initial load status:', statusError);
                }
              }
            );

            if (!isMounted) {
              // Component unmounted during creation, cleanup
              try {
                await sound.unloadAsync();
              } catch (e) {
                console.warn('⚠️ Error cleaning up sound after unmount:', e);
              }
              return;
            }

            soundRef.current = sound;
            console.log('✅ Native sound created successfully');

            // Additional status update handler for ongoing playback
            sound.setOnPlaybackStatusUpdate((status) => {
              if (!isMounted) return;
              
              try {
                if (status.isLoaded) {
                  const currentTime = Math.floor((status.positionMillis || 0) / 1000);
                  const duration = Math.floor((status.durationMillis || 0) / 1000);
                  
                  // Validate values before updating
                  if (currentTime >= 0 && duration >= 0) {
                    onPlaybackStatusUpdate?.({
                      isPlaying: status.isPlaying || false,
                      currentTime,
                      duration,
                      didJustFinish: status.didJustFinish || false,
                    });
                  }
                } else if (status.error) {
                  console.error('❌ Native audio playback error:', status.error);
                  onError?.('Audio playback failed');
                }
              } catch (statusError) {
                console.error('❌ Error in playback status update:', statusError);
                // Don't call onError here to avoid infinite loops
              }
            });
          } catch (soundCreationError) {
            console.error('❌ Error creating sound:', soundCreationError);
            if (isMounted) {
              onError?.('Failed to create audio player');
            }
          }
        }
      } catch (error) {
        console.error('❌ Error initializing audio:', error);
        if (isMounted) {
          onError?.('Failed to initialize audio player');
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    initializeAudio();

    return () => {
      isMounted = false;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Cleanup
      const cleanup = async () => {
        try {
          if (Platform.OS === 'web' && webAudioRef.current) {
            const audio = webAudioRef.current;
            try {
              audio.pause();
              // Set src to empty string instead of removing attribute to avoid errors
              audio.src = '';
              audio.load();
            } catch (cleanupError) {
              console.log('⚠️ Web audio cleanup error:', cleanupError);
            }
            webAudioRef.current = null;
          } else if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
        } catch (e) {
          console.log('⚠️ Cleanup error:', e);
        }
      };
      
      cleanup();
    };
  }, [safeAudioUrl, isLoading, onPlaybackStatusUpdate, onError]);

  // Handle play/pause with enhanced error handling
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    const waitForCanPlay = (audio: HTMLAudioElement) => new Promise<void>((resolve, reject) => {
      if (webReady || audio.readyState >= 3) {
        resolve();
        return;
      }
      const onOk = () => {
        audio.removeEventListener('canplay', onOk);
        audio.removeEventListener('canplaythrough', onOk);
        resolve();
      };
      setTimeout(() => {
        audio.removeEventListener('canplay', onOk);
        audio.removeEventListener('canplaythrough', onOk);
        reject(new Error('canplay timeout'));
      }, 5000);
      audio.addEventListener('canplay', onOk, { once: true });
      audio.addEventListener('canplaythrough', onOk, { once: true });
    });

    const handlePlayPause = async () => {
      try {
        // Add timeout for play/pause operations
        timeoutId = setTimeout(() => {
          console.warn('⚠️ Play/pause operation timeout');
          onError?.('Audio control timeout');
        }, 8000);
        
        if (Platform.OS === 'web') {
          const el = webAudioRef.current;
          if (el) {
            if (isPlaying) {
              try {
                await waitForCanPlay(el);
              } catch (e) {
                console.warn('canplay wait failed:', e);
              }
              const playPromise = el.play();
              if (playPromise !== undefined) {
                await playPromise;
              }
            } else {
              el.pause();
            }
          } else {
            console.log('⚠️ Web audio element not ready');
          }
        } else {
          if (soundRef.current) {
            try {
              // First check if the sound object exists and has the method
              if (!soundRef.current.getStatusAsync) {
                console.log('⚠️ Sound object not fully initialized');
                return;
              }
              
              const status = await soundRef.current.getStatusAsync();
              
              // Check if status is valid
              if (!status) {
                console.log('⚠️ No status returned from sound');
                return;
              }
              
              if (status.isLoaded) {
                if (isPlaying) {
                  console.log('🎵 Starting playback');
                  await soundRef.current.playAsync();
                } else {
                  console.log('⏸️ Pausing playback');
                  await soundRef.current.pauseAsync();
                }
              } else {
                console.log('⚠️ Sound not loaded yet');
                // Don't treat this as an error, just wait for it to load
                if ((status as any).error) {
                  console.error('❌ Sound has error:', (status as any).error);
                  onError?.('Audio failed to load');
                }
              }
            } catch (statusError) {
              // Only log error if it's not a "sound not loaded" error
              const errorMessage = statusError?.toString() || '';
              if (errorMessage.includes('not loaded') || errorMessage.includes('loading')) {
                console.log('⚠️ Sound still loading, will retry...');
              } else {
                console.error('Error controlling playback:', statusError);
                // Don't call onError for transient issues
              }
            }
          } else {
            console.log('⚠️ Sound reference is null');
          }
        }
        
        if (timeoutId) clearTimeout(timeoutId);
      } catch (error) {
        console.error('Error controlling playback:', error);
        onError?.('Playback control failed');
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    if (safeAudioUrl && !isLoading) {
      handlePlayPause();
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isPlaying, safeAudioUrl, isLoading, onError, webReady]);

  // Expose seek function via ref
  useImperativeHandle(ref, () => ({
    seekTo: async (position: number) => {
      try {
        if (Platform.OS === 'web') {
          if (webAudioRef.current) {
            webAudioRef.current.currentTime = position;
          } else {
            console.log('⚠️ Cannot seek - web audio not ready');
          }
        } else {
          if (soundRef.current) {
            try {
              // Check if sound has the method
              if (!soundRef.current.getStatusAsync) {
                console.log('⚠️ Sound not fully initialized for seeking');
                return;
              }
              
              const status = await soundRef.current.getStatusAsync();
              if (status && status.isLoaded) {
                await soundRef.current.setPositionAsync(position * 1000);
              } else {
                console.log('⚠️ Cannot seek - sound not loaded');
              }
            } catch (seekError) {
              console.log('⚠️ Seek operation failed:', seekError);
            }
          } else {
            console.log('⚠️ Cannot seek - sound reference is null');
          }
        }
      } catch (error) {
        console.error('Error seeking:', error);
      }
    },
    stop: async () => {
      try {
        if (Platform.OS === 'web') {
          if (webAudioRef.current) {
            webAudioRef.current.pause();
            webAudioRef.current.currentTime = 0;
          }
        } else {
          if (soundRef.current) {
            try {
              // Check if sound has the method
              if (!soundRef.current.getStatusAsync) {
                console.log('⚠️ Sound not fully initialized for stopping');
                return;
              }
              
              const status = await soundRef.current.getStatusAsync();
              if (status && status.isLoaded) {
                await soundRef.current.stopAsync();
              }
            } catch (stopError) {
              console.log('⚠️ Stop operation failed:', stopError);
            }
          }
        }
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    },
  }), []);

  // Don't render if URL is invalid - but still need to return something for hooks consistency
  if (!isValidAudioUrl) {
    console.warn('⚠️ AudioPlayer: Invalid audioUrl provided, not rendering:', audioUrl);
  }
  
  return null;
});

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;