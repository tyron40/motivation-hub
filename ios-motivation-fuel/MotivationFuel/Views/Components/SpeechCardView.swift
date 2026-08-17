import SwiftUI

/// Large hero card used for "Today's Featured".
struct FeaturedSpeechCard: View {
    let speech: Speech
    let isFavorite: Bool
    let onPlay: () -> Void
    let onFavorite: () -> Void

    var body: some View {
        Button(action: onPlay) {
            ZStack(alignment: .bottomLeading) {
                Color.black
                    .frame(height: 260)
                    .overlay {
                        AsyncImage(url: speech.thumbnailURL) { image in
                            image.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            AppTheme.featuredGradient
                        }
                        .allowsHitTesting(false)
                    }
                    .overlay {
                        LinearGradient(
                            colors: [.clear, .black.opacity(0.35), .black.opacity(0.88)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .allowsHitTesting(false)
                    }
                    .clipShape(.rect(cornerRadius: 20))

                VStack(alignment: .leading, spacing: 8) {
                    Text(speech.category.uppercased())
                        .font(.caption2.weight(.bold))
                        .tracking(1.2)
                        .foregroundStyle(AppTheme.accent)

                    Text(speech.title)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    Text(speech.speaker)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.75))

                    HStack(spacing: 12) {
                        Label(speech.durationLabel, systemImage: "clock")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.white.opacity(0.85))

                        Spacer()

                        Button(action: onFavorite) {
                            Image(systemName: isFavorite ? "heart.fill" : "heart")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(isFavorite ? Color(hex: 0xFF3B30) : .white)
                                .frame(width: 44, height: 44)
                                .background(.white.opacity(0.15), in: .circle)
                        }
                        .buttonStyle(.plain)

                        Image(systemName: "play.fill")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(AppTheme.background)
                            .frame(width: 44, height: 44)
                            .background(.white, in: .circle)
                    }
                    .padding(.top, 4)
                }
                .padding(18)
            }
        }
        .buttonStyle(PressableCardStyle())
    }
}

/// Compact row used in lists of speeches.
struct SpeechRow: View {
    let speech: Speech
    let isFavorite: Bool
    let onPlay: () -> Void
    let onFavorite: () -> Void

    var body: some View {
        Button(action: onPlay) {
            HStack(spacing: 14) {
                RemoteImage(url: speech.thumbnailURL, cornerRadius: 12)
                    .frame(width: 92, height: 68)
                    .overlay(alignment: .center) {
                        Image(systemName: "play.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.white.opacity(0.9))
                            .shadow(radius: 4)
                            .allowsHitTesting(false)
                    }

                VStack(alignment: .leading, spacing: 5) {
                    Text(speech.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(AppTheme.text)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    Text(speech.speaker)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        Image(systemName: "clock")
                        Text(speech.durationLabel)
                    }
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
                }

                Spacer(minLength: 0)

                Button(action: onFavorite) {
                    Image(systemName: isFavorite ? "heart.fill" : "heart")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(isFavorite ? Color(hex: 0xFF3B30) : AppTheme.textSecondary)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
            }
            .padding(10)
            .background(AppTheme.card.opacity(0.55), in: .rect(cornerRadius: 16))
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .stroke(.white.opacity(0.06), lineWidth: 1)
            }
        }
        .buttonStyle(PressableCardStyle())
    }
}

/// Subtle press-scale feedback shared by content cards.
struct PressableCardStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
    }
}
