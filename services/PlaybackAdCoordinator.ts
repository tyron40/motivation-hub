type PlaybackAdSubscriber = {
  pauseForAd: () => void | Promise<void>;
  resumeAfterAd: () => void | Promise<void>;
};

class PlaybackAdCoordinator {
  private subscribers = new Set<PlaybackAdSubscriber>();
  private adDepth = 0;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;

  register(subscriber: PlaybackAdSubscriber) {
    this.subscribers.add(subscriber);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  beginAd() {
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }

    this.adDepth += 1;

    if (this.adDepth !== 1) {
      return;
    }

    for (const subscriber of this.subscribers) {
      try {
        void subscriber.pauseForAd();
      } catch (error) {
        console.warn('[PlaybackAdCoordinator] pause failed', error);
      }
    }
  }

  endAd() {
    this.adDepth = Math.max(0, this.adDepth - 1);

    if (this.adDepth !== 0) {
      return;
    }

    // Give the native ad view time to fully disappear before playback resumes.
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null;

      if (this.adDepth !== 0) {
        return;
      }

      for (const subscriber of this.subscribers) {
        try {
          void subscriber.resumeAfterAd();
        } catch (error) {
          console.warn('[PlaybackAdCoordinator] resume failed', error);
        }
      }
    }, 350);
  }

  reset() {
    this.adDepth = 0;

    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  }

  get isAdActive() {
    return this.adDepth > 0;
  }
}

export const playbackAdCoordinator = new PlaybackAdCoordinator();
