type PlaybackAdSubscriber = {
  pauseForAd: () => void | Promise<void>;
  resumeAfterAd: () => void | Promise<void>;
};

class PlaybackAdCoordinator {
  private subscribers = new Set<PlaybackAdSubscriber>();
  private adActive = false;
  private sessionId = 0;
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

    // beginAd is intentionally idempotent. Multiple callbacks for the
    // same visible ad must never create a playback lock that requires
    // an equal number of endAd calls to recover.
    if (this.adActive) {
      return;
    }

    this.adActive = true;
    this.sessionId += 1;

    for (const subscriber of this.subscribers) {
      try {
        void subscriber.pauseForAd();
      } catch (error) {
        console.warn('[PlaybackAdCoordinator] pause failed', error);
      }
    }
  }

  endAd() {
    // endAd is also intentionally idempotent.
    // One dismissal is sufficient to restore the global player.
    const sessionAtEnd = this.sessionId;
    this.adActive = false;

    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }

    // Short native-view settling period only. This is not used as
    // playback state; adActive is already false so controls are usable.
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null;

      // A newer ad started while the previous ad was closing.
      if (this.adActive || this.sessionId !== sessionAtEnd) {
        return;
      }

      for (const subscriber of this.subscribers) {
        try {
          void subscriber.resumeAfterAd();
        } catch (error) {
          console.warn('[PlaybackAdCoordinator] resume failed', error);
        }
      }
    }, 200);
  }

  reset() {
    this.adActive = false;
    this.sessionId += 1;

    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  }

  get isAdActive() {
    return this.adActive;
  }
}

export const playbackAdCoordinator = new PlaybackAdCoordinator();