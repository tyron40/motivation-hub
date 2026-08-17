import Foundation
import SwiftUI
import WebKit

/// Playback states reported by the YouTube IFrame API.
nonisolated enum YouTubePlaybackState: Int, Sendable {
    case unstarted = -1
    case ended = 0
    case playing = 1
    case paused = 2
    case buffering = 3
    case cued = 5
}

/// Owns a hidden `WKWebView` running the YouTube IFrame API and exposes
/// native play / pause / seek controls plus progress reporting.
@MainActor
@Observable
final class YouTubePlayerController: NSObject {
    private(set) var isReady = false
    private(set) var isPlaying = false
    private(set) var currentTime: Double = 0
    private(set) var duration: Double = 0
    private(set) var loadFailed = false

    /// Fired when the video reaches its end.
    var onEnded: (() -> Void)?

    private var webView: WKWebView?
    private var loadedVideoId: String?
    /// Set while the user is dragging the scrubber so progress ticks don't fight it.
    private var isScrubbing = false
    /// Desired play state, applied as soon as the player reports ready.
    private var wantsPlayback = true

    // MARK: - Web view

    func makeWebView() -> WKWebView {
        if let webView { return webView }

        let controller = WKUserContentController()
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let view = WKWebView(frame: .zero, configuration: configuration)
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.isScrollEnabled = false
        view.isUserInteractionEnabled = false

        controller.add(MessageProxy(controller: self), name: "player")
        webView = view

        if let loadedVideoId {
            loadHTML(videoId: loadedVideoId)
        }
        return view
    }

    // MARK: - Commands

    /// Loads a video, replacing anything currently playing.
    func load(videoId: String, autoplay: Bool = true) {
        guard loadedVideoId != videoId else {
            if autoplay { play() }
            return
        }
        loadedVideoId = videoId
        wantsPlayback = autoplay
        isReady = false
        isPlaying = false
        loadFailed = false
        currentTime = 0
        duration = 0

        if webView != nil {
            loadHTML(videoId: videoId)
        }
    }

    func play() {
        wantsPlayback = true
        guard isReady else { return }
        evaluate("player.playVideo();")
    }

    func pause() {
        wantsPlayback = false
        guard isReady else { return }
        evaluate("player.pauseVideo();")
    }

    func togglePlayPause() {
        isPlaying ? pause() : play()
    }

    /// Jumps to an absolute position in seconds.
    func seek(to seconds: Double) {
        let clamped = max(0, duration > 0 ? min(seconds, duration) : seconds)
        currentTime = clamped
        guard isReady else { return }
        evaluate("player.seekTo(\(clamped), true);")
    }

    /// Skips forward or backward relative to the current position.
    func skip(by seconds: Double) {
        seek(to: currentTime + seconds)
    }

    func beginScrubbing() {
        isScrubbing = true
    }

    func endScrubbing(at seconds: Double) {
        isScrubbing = false
        seek(to: seconds)
    }

    /// Stops playback and tears the player down (used when the player screen closes).
    func teardown() {
        pause()
        webView?.stopLoading()
        webView?.configuration.userContentController.removeAllScriptMessageHandlers()
        webView = nil
        loadedVideoId = nil
        isReady = false
        isPlaying = false
    }

    // MARK: - Bridge

    fileprivate func handle(message: [String: Any]) {
        guard let event = message["event"] as? String else { return }

        switch event {
        case "ready":
            isReady = true
            loadFailed = false
            if let value = message["duration"] as? Double, value > 0 { duration = value }
            if wantsPlayback { evaluate("player.playVideo();") }

        case "time":
            if let value = message["duration"] as? Double, value > 0 { duration = value }
            if !isScrubbing, let value = message["time"] as? Double { currentTime = value }

        case "state":
            guard let raw = message["state"] as? Int,
                  let state = YouTubePlaybackState(rawValue: raw) else { return }
            switch state {
            case .playing:
                isPlaying = true
                loadFailed = false
            case .paused, .unstarted, .cued:
                isPlaying = false
            case .buffering:
                break
            case .ended:
                isPlaying = false
                onEnded?()
            }

        case "error":
            loadFailed = true
            isPlaying = false

        default:
            break
        }
    }

    private func evaluate(_ script: String) {
        webView?.evaluateJavaScript(script) { _, error in
            if let error {
                #if DEBUG
                print("[Player] JS error: \(error.localizedDescription)")
                #endif
            }
        }
    }

    private func loadHTML(videoId: String) {
        let html = Self.playerHTML(videoId: videoId)
        webView?.loadHTMLString(html, baseURL: URL(string: "https://www.youtube.com"))
    }

    private static func playerHTML(videoId: String) -> String {
        """
        <!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
        <style>html,body{margin:0;padding:0;background:#000;overflow:hidden}</style>
        </head>
        <body>
        <div id="player"></div>
        <script src="https://www.youtube.com/iframe_api"></script>
        <script>
        var player;
        function post(payload) {
          try { window.webkit.messageHandlers.player.postMessage(payload); } catch (e) {}
        }
        function onYouTubeIframeAPIReady() {
          player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            videoId: '\(videoId)',
            playerVars: {
              playsinline: 1, controls: 0, rel: 0, fs: 0,
              modestbranding: 1, autoplay: 1, enablejsapi: 1, iv_load_policy: 3
            },
            events: {
              onReady: function (e) {
                post({ event: 'ready', duration: e.target.getDuration() });
                e.target.playVideo();
                setInterval(function () {
                  if (!player || !player.getCurrentTime) return;
                  post({ event: 'time', time: player.getCurrentTime(), duration: player.getDuration() });
                }, 500);
              },
              onStateChange: function (e) { post({ event: 'state', state: e.data }); },
              onError: function (e) { post({ event: 'error', code: e.data }); }
            }
          });
        }
        </script>
        </body>
        </html>
        """
    }
}

/// Weak bridge so the web view's content controller doesn't retain the controller.
private final class MessageProxy: NSObject, WKScriptMessageHandler {
    private weak var controller: YouTubePlayerController?

    init(controller: YouTubePlayerController) {
        self.controller = controller
    }

    nonisolated func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any] else { return }
        Task { @MainActor [weak controller] in
            controller?.handle(message: body)
        }
    }
}

/// Hosts the hidden IFrame player inside SwiftUI.
struct YouTubePlayerHost: UIViewRepresentable {
    let controller: YouTubePlayerController

    func makeUIView(context: Context) -> WKWebView {
        controller.makeWebView()
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
