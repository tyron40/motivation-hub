import SwiftUI

/// Compact now-playing bar docked above the tab bar.
struct MiniPlayerView: View {
    @Environment(PlayerStore.self) private var player

    var body: some View {
        if let speech = player.currentSpeech, !player.isPlayerPresented {
            VStack(spacing: 0) {
                ProgressView(value: player.progress)
                    .progressViewStyle(.linear)
                    .tint(AppTheme.primary)
                    .scaleEffect(x: 1, y: 0.6, anchor: .center)

                HStack(spacing: 12) {
                    Button {
                        player.isPlayerPresented = true
                    } label: {
                        HStack(spacing: 12) {
                            RemoteImage(url: speech.thumbnailURL, cornerRadius: 8)
                                .frame(width: 42, height: 42)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(speech.title)
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(AppTheme.text)
                                    .lineLimit(1)
                                Text(speech.speaker)
                                    .font(.caption2)
                                    .foregroundStyle(AppTheme.textSecondary)
                                    .lineLimit(1)
                            }

                            Spacer(minLength: 0)
                        }
                    }
                    .buttonStyle(.plain)

                    Button {
                        player.togglePlayPause()
                    } label: {
                        Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(AppTheme.text)
                            .frame(width: 44, height: 44)
                            .contentTransition(.symbolEffect(.replace))
                    }

                    Button {
                        player.stop()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(AppTheme.textSecondary)
                            .frame(width: 44, height: 44)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
            }
            .background(.ultraThinMaterial)
            .background(AppTheme.card)
            .clipShape(.rect(cornerRadius: 16))
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .stroke(.white.opacity(0.08), lineWidth: 1)
            }
            .padding(.horizontal, 10)
            .shadow(color: .black.opacity(0.4), radius: 12, y: 6)
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }
}
