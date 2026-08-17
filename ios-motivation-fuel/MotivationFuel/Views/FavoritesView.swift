import SwiftUI

struct FavoritesView: View {
    @Environment(LibraryStore.self) private var library
    @Environment(PlayerStore.self) private var player

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                if library.favorites.isEmpty {
                    emptyState
                } else {
                    HStack {
                        Text("\(library.favorites.count) \(library.favorites.count == 1 ? "speech" : "speeches")")
                            .font(.footnote.weight(.medium))
                            .foregroundStyle(AppTheme.textSecondary)
                        Spacer()
                        Button {
                            if let first = library.favorites.first {
                                player.play(first, in: library.favorites)
                            }
                        } label: {
                            Label("Play All", systemImage: "play.fill")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(AppTheme.primary)
                        }
                    }
                    .padding(.bottom, 4)

                    ForEach(library.favorites) { speech in
                        SpeechRow(
                            speech: speech,
                            isFavorite: true,
                            onPlay: { player.play(speech, in: library.favorites) },
                            onFavorite: { library.toggleFavorite(speech) }
                        )
                    }
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)
            .padding(.bottom, 130)
        }
        .scrollIndicators(.hidden)
        .background(AppTheme.screenGradient.ignoresSafeArea())
        .navigationTitle("My Favorites")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var emptyState: some View {
        VStack(spacing: 18) {
            Image(systemName: "heart.fill")
                .font(.system(size: 44))
                .foregroundStyle(Color(hex: 0xEC4899))
                .frame(width: 100, height: 100)
                .background(Color(hex: 0xEC4899).opacity(0.15), in: .circle)

            Text("No Favorites Yet")
                .font(.title3.weight(.bold))
                .foregroundStyle(AppTheme.text)

            Text("Tap the heart icon on speeches you love to save them here")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .padding(.top, 80)
    }
}
