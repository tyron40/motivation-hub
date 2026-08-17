import AVFoundation
import Foundation
import SwiftUI

/// Owns the now-playing queue and drives the underlying YouTube player.
@MainActor
@Observable
final class PlayerStore {
    private(set) var currentSpeech: Speech?
    private(set) var queue: [Speech] = []
    /// Presents the full-screen player sheet.
    var isPlayerPresented = false

    let controller = YouTubePlayerController()

    private weak var library: LibraryStore?
    private var lastTickTime: Double = 0

    init() {
        controller.onEnded = { [weak self] in
            self?.skipToNext()
        }
    }

    func attach(library: LibraryStore) {
        self.library = library
    }

    var isPlaying: Bool { controller.isPlaying }
    var currentTime: Double { controller.currentTime }
    var duration: Double { controller.duration }
    var hasQueue: Bool { queue.count > 1 }

    var progress: Double {
        guard duration > 0 else { return 0 }
        return min(max(currentTime / duration, 0), 1)
    }

    // MARK: - Playback control

    /// Starts a speech, optionally replacing the queue, and opens the player.
    func play(_ speech: Speech, in playlist: [Speech]? = nil) {
        if let playlist, !playlist.isEmpty {
            queue = playlist
        } else if queue.isEmpty {
            queue = [speech]
        }
        library?.remember(queue)
        library?.remember(speech)

        currentSpeech = speech
        lastTickTime = 0
        configureAudioSession()

        if let videoId = speech.youtubeId, !videoId.isEmpty {
            controller.load(videoId: videoId, autoplay: true)
        }
        isPlayerPresented = true
    }

    func togglePlayPause() {
        controller.togglePlayPause()
    }

    func skipToNext() {
        guard let current = currentSpeech,
              let index = queue.firstIndex(where: { $0.id == current.id }),
              queue.count > 1 else { return }
        let next = queue[(index + 1) % queue.count]
        startQueued(next)
    }

    func skipToPrevious() {
        // Restart the track first, matching standard player behaviour.
        if currentTime > 3 {
            controller.seek(to: 0)
            return
        }
        guard let current = currentSpeech,
              let index = queue.firstIndex(where: { $0.id == current.id }),
              queue.count > 1 else { return }
        let previous = queue[(index - 1 + queue.count) % queue.count]
        startQueued(previous)
    }

    private func startQueued(_ speech: Speech) {
        currentSpeech = speech
        lastTickTime = 0
        if let videoId = speech.youtubeId, !videoId.isEmpty {
            controller.load(videoId: videoId, autoplay: true)
        }
    }

    /// Closes the player screen and stops playback.
    func stop() {
        controller.teardown()
        currentSpeech = nil
        queue = []
        isPlayerPresented = false
    }

    /// Accumulates listening time as playback progresses.
    func tickListeningTime() {
        let now = controller.currentTime
        let delta = now - lastTickTime
        if delta > 0, delta < 5 {
            library?.addListeningTime(Int(delta.rounded()))
        }
        lastTickTime = now
    }

    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            #if DEBUG
            print("[Player] audio session error: \(error.localizedDescription)")
            #endif
        }
    }
}

/// Formats a playback position as `m:ss` / `h:mm:ss`.
nonisolated func formatTime(_ seconds: Double) -> String {
    guard seconds.isFinite, seconds >= 0 else { return "0:00" }
    let total = Int(seconds)
    let hours = total / 3600
    let minutes = (total % 3600) / 60
    let secs = total % 60
    if hours > 0 {
        return String(format: "%d:%02d:%02d", hours, minutes, secs)
    }
    return String(format: "%d:%02d", minutes, secs)
}
