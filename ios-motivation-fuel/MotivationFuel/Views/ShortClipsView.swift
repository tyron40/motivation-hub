import SwiftUI

/// Vertical, full-screen swipeable feed of short motivational clips.
struct ShortClipsView: View {
    let initialClip: Speech?

    @Environment(ContentStore.self) private var content
    @Environment(LibraryStore.self) private var library
    @Environment(PlayerStore.self) private var player

    @State private var selection: String?

    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(content.shortClips) { clip in
                        ClipPage(clip: clip, height: geometry.size.height)
                            .id(clip.id)
                    }
                }
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.paging)
            .scrollPosition(id: $selection)
            .scrollIndicators(.hidden)
            .ignoresSafeArea()
        }
        .background(Color.black.ignoresSafeArea())
        .navigationTitle("Short Clips")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .onAppear {
            selection = initialClip?.id ?? content.shortClips.first?.id
        }
    }
}

private struct ClipPage: View {
    let clip: Speech
    let height: CGFloat

    @Environment(LibraryStore.self) private var library
    @Environment(PlayerStore.self) private var player

    var body: some View {
        Color.black
            .frame(height: height)
            .overlay {
                AsyncImage(url: clip.thumbnailURL) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    AppTheme.card
                }
                .allowsHitTesting(false)
            }
            .overlay {
                LinearGradient(
                    colors: [.black.opacity(0.35), .clear, .black.opacity(0.85)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .allowsHitTesting(false)
            }
            .clipped()
            .overlay(alignment: .center) {
                Button {
                    player.play(clip, in: [clip])
                } label: {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 68))
                        .foregroundStyle(.white.opacity(0.92))
                        .shadow(radius: 12)
                }
                .buttonStyle(PressableCardStyle())
            }
            .overlay(alignment: .bottomLeading) {
                HStack(alignment: .bottom, spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(clip.title)
                            .font(.headline)
                            .foregroundStyle(.white)
                            .lineLimit(3)
                        Text(clip.speaker)
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.75))
                    }

                    Spacer(minLength: 0)

                    VStack(spacing: 18) {
                        Button {
                            library.toggleFavorite(clip)
                        } label: {
                            Image(systemName: library.isFavorite(clip) ? "heart.fill" : "heart")
                                .font(.title2)
                                .foregroundStyle(library.isFavorite(clip) ? Color(hex: 0xFF3B30) : .white)
                                .frame(width: 44, height: 44)
                        }

                        ShareLink(item: clip.shareURL ?? URL(string: "https://youtube.com")!) {
                            Image(systemName: "square.and.arrow.up")
                                .font(.title2)
                                .foregroundStyle(.white)
                                .frame(width: 44, height: 44)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 90)
            }
    }
}
