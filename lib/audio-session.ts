import { Audio } from 'expo-av';
import { Platform } from 'react-native';

/**
 * The app's single authoritative PLAYBACK audio-session configuration.
 * Used by the speech player, Voice Coach TTS, and — critically — after any
 * full-screen ad dismisses, so the session is never left interrupted,
 * ducked, or in the recording category.
 */
// Typed loosely on purpose: setAudioModeAsync takes Partial<AudioMode> and
// merges omitted keys from the current session mode.
export const PLAYBACK_AUDIO_MODE = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
};

/**
 * Recording configuration for Voice Coach capture. MUST be followed by
 * restorePlaybackAudioSession() as soon as the recorder is unloaded.
 */
export const RECORDING_AUDIO_MODE = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
};

let inFlightRestore: Promise<void> | null = null;

/**
 * Restore the application's playback audio session exactly ONCE per call
 * window (concurrent calls coalesce). Call this only at meaningful
 * transitions: after an ad fully dismisses, after Voice Coach recording
 * unloads, and when leaving Voice Coach.
 */
export async function restorePlaybackAudioSession(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (inFlightRestore) return inFlightRestore;
  inFlightRestore = (async () => {
    try {
      await Audio.setAudioModeAsync(PLAYBACK_AUDIO_MODE);
    } catch (error) {
      console.warn('[AudioSession] restore failed', error);
    } finally {
      inFlightRestore = null;
    }
  })();
  return inFlightRestore;
}
