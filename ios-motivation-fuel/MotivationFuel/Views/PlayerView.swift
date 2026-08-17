import Combine
import SwiftUI

/// Full-screen now-playing experience with native transport controls
/// driving a hidden YouTube player.
struct PlayerView: View {
    @Environment(PlayerStore.self) private var player
    @Environment(LibraryStore.self) private var library
    @Environment(\.dismiss) private var dismiss

    @State private var scrubValue: Double = 0
    @State private var isScrubbing = false
    @State private var showPlaylistPicker = false
    @State private var artworkPulse = false

    private let ticker = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.black.opacity(0.95), .black, .black],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            if let speech = player.currentSpeech {
                content(for: speech)
            } else {
                ProgressView().tint(.white)
            }

            // Hidden IFrame player: audio only, controlled natively.
            YouTubePlayerHost(controller: player.controller)
                .frame(width: 1, height: 1)
                .opacity(0.01)
                .allowsHitTesting(false)
        }
        .onReceive(ticker) { _ in
            player.tickListeningTime()
        }
        .sheet(isPresented: $showPlaylistPicker) {
            PlaylistPickerSheet()
        }
    }

    private func content(for speech: Speech) -> some View {
        VStack(spacing: 0) {
            header

            Spacer(minLength: 8)

            artwork(for: speech)
                .padding(.horizontal, 32)

            VStack(spacing: 10) {
                Text(speech.title)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(3)

                Text(speech.speaker)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.75))

                Text(speech.category.uppercased())
                    .font(.caption2.weight(.semibold))
                    .tracking(1)
                    .foregroundStyle(.white.opacity(0.85))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(.white.opacity(0.14), in: .capsule)
                    .overlay {
                        Capsule().stroke(.white.opacity(0.2), lineWidth: 1)
                    }
            }
            .padding(.horizontal, 28)
            .padding(.top, 28)

            scrubber
                .padding(.horizontal, 28)
                .padding(.top, 26)

            transportControls
                .padding(.top, 18)

            Spacer(minLength: 8)

            bottomActions(for: speech)
                .padding(.bottom, 12)
        }
    }

    private var header: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "chevron.down")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(.white.opacity(0.1), in: .circle)
            }

            Spacer()

            Text("NOW PLAYING")
                .font(.caption.weight(.bold))
                .tracking(1.5)
                .foregroundStyle(.white.opacity(0.9))

            Spacer()

            Color.clear.frame(width: 40, height: 40)
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
    }

    private func artwork(for speech: Speech) -> some View {
        RemoteImage(url: speech.thumbnailURL, cornerRadius: 24)
            .aspectRatio(1, contentMode: .fit)
            .frame(maxWidth: 340)
            .shadow(color: .black.opacity(0.55), radius: 24, y: 12)
            .scaleEffect(artworkPulse ? 1.03 : 1)
            .animation(.easeInOut(duration: 2).repeatForever(autoreverses: true), value: artworkPulse)
            .onAppear { artworkPulse = true }
            .overlay(alignment: .bottom) {
                if player.controller.loadFailed {
                    Text("This speech can't be streamed right now.")
                        .font(.caption)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(.black.opacity(0.7), in: .capsule)
                        .padding(.bottom, 12)
                }
            }
    }

    private var scrubber: some View {
        VStack(spacing: 6) {
            Slider(
                value: Binding(
                    get: { isScrubbing ? scrubValue : player.currentTime },
                    set: { scrubValue = $0 }
                ),
                in: 0...max(player.duration, 1),
                onEditingChanged: { editing in
                    if editing {
                        isScrubbing = true
                        scrubValue = player.currentTime
                        player.controller.beginScrubbing()
                    } else {
                        isScrubbing = false
                        player.controller.endScrubbing(at: scrubValue)
                    }
                }
            )
            .tint(.white)

            HStack {
                Text(formatTime(isScrubbing ? scrubValue : player.currentTime))
                Spacer()
                Text(formatTime(player.duration))
            }
            .font(.caption2.monospacedDigit())
            .foregroundStyle(.white.opacity(0.65))
        }
    }

    private var transportControls: some View {
        HStack(spacing: 26) {
            Button { player.skipToPrevious() } label: {
                Image(systemName: "backward.end.fill")
                    .font(.title3)
                    .foregroundStyle(player.hasQueue ? .white : .white.opacity(0.3))
                    .frame(width: 52, height: 52)
            }
            .disabled(!player.hasQueue)

            Button { player.controller.skip(by: -15) } label: {
                Image(systemName: "gobackward.15")
                    .font(.title2)
                    .foregroundStyle(.white.opacity(0.9))
                    .frame(width: 52, height: 52)
            }

            Button {
                player.togglePlayPause()
            } label: {
                ZStack {
                    Circle()
                        .fill(.white)
                        .frame(width: 76, height: 76)

                    if player.controller.isReady {
                        Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 30, weight: .bold))
                            .foregroundStyle(.black)
                            .contentTransition(.symbolEffect(.replace))
                    } else {
                        ProgressView().tint(.black)
                    }
                }
            }
            .buttonStyle(PressableCardStyle())
            .sensoryFeedback(.impact(weight: .light), trigger: player.isPlaying)

            Button { player.controller.skip(by: 15) } label: {
                Image(systemName: "goforward.15")
                    .font(.title2)
                    .foregroundStyle(.white.opacity(0.9))
                    .frame(width: 52, height: 52)
            }

            Button { player.skipToNext() } label: {
                Image(systemName: "forward.end.fill")
                    .font(.title3)
                    .foregroundStyle(player.hasQueue ? .white : .white.opacity(0.3))
                    .frame(width: 52, height: 52)
            }
            .disabled(!player.hasQueue)
        }
    }

    private func bottomActions(for speech: Speech) -> some View {
        HStack(spacing: 28) {
            Button { library.toggleFavorite(speech) } label: {
                actionLabel(
                    symbol: library.isFavorite(speech) ? "heart.fill" : "heart",
                    title: library.isFavorite(speech) ? "Saved" : "Save",
                    tint: library.isFavorite(speech) ? Color(hex: 0xFF3B30) : .white.opacity(0.8)
                )
            }

            Button { showPlaylistPicker = true } label: {
                actionLabel(symbol: "plus", title: "Playlist", tint: .white.opacity(0.8))
            }

            ShareLink(
                item: speech.shareURL ?? URL(string: "https://youtube.com")!,
                message: Text("Check out \"\(speech.title)\" by \(speech.speaker) on Motivation Fuel!")
            ) {
                actionLabel(symbol: "square.and.arrow.up", title: "Share", tint: .white.opacity(0.8))
            }
        }
    }

    private func actionLabel(symbol: String, title: String, tint: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: symbol)
                .font(.system(size: 20, weight: .medium))
            Text(title)
                .font(.caption2.weight(.semibold))
        }
        .foregroundStyle(tint)
        .frame(minWidth: 80, minHeight: 58)
        .background(.white.opacity(0.06), in: .rect(cornerRadius: 16))
    }
}

/// Sheet for saving the current speech into a playlist.
struct PlaylistPickerSheet: View {
    @Environment(LibraryStore.self) private var library
    @Environment(PlayerStore.self) private var player
    @Environment(\.dismiss) private var dismiss

    @State private var newPlaylistName = ""

    var body: some View {
        NavigationStack {
            List {
                Section("Save to playlist") {
                    if library.playlists.isEmpty {
                        Text("No playlists yet — create one below.")
                            .font(.footnote)
                            .foregroundStyle(AppTheme.textSecondary)
                    }

                    ForEach(library.playlists) { playlist in
                        Button {
                            if let speech = player.currentSpeech {
                                library.addToPlaylist(playlist.id, speech: speech)
                            }
                            dismiss()
                        } label: {
                            HStack(spacing: 10) {
                                Circle()
                                    .fill(Color(hexString: playlist.colorHex))
                                    .frame(width: 12, height: 12)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(playlist.name)
                                        .foregroundStyle(AppTheme.text)
                                    Text("\(playlist.speechIds.count) \(playlist.speechIds.count == 1 ? "speech" : "speeches")")
                                        .font(.caption)
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                            }
                        }
                    }
                }

                Section("New playlist") {
                    HStack {
                        TextField("Playlist name", text: $newPlaylistName)
                            .foregroundStyle(AppTheme.text)
                        Button("Create") {
                            let name = newPlaylistName.trimmingCharacters(in: .whitespaces)
                            guard !name.isEmpty else { return }
                            let playlist = library.createPlaylist(named: name)
                            if let speech = player.currentSpeech {
                                library.addToPlaylist(playlist.id, speech: speech)
                            }
                            newPlaylistName = ""
                            dismiss()
                        }
                        .disabled(newPlaylistName.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(AppTheme.screenGradient.ignoresSafeArea())
            .navigationTitle("Playlists")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationContentInteraction(.scrolls)
    }
}
