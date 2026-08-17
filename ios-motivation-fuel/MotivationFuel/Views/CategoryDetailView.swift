import SwiftUI

struct CategoryDetailView: View {
    let category: SpeechCategory

    @Environment(ContentStore.self) private var content
    @Environment(LibraryStore.self) private var library
    @Environment(PlayerStore.self) private var player

    @State private var speeches: [Speech] = []
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                banner

                if isLoading {
                    ProgressView()
                        .tint(AppTheme.primary)
                        .padding(.top, 60)
                } else if speeches.isEmpty {
                    ContentUnavailableView(
                        "Nothing here yet",
                        systemImage: "waveform",
                        description: Text("We couldn't load speeches for this category. Try again shortly.")
                    )
                    .padding(.top, 40)
                } else {
                    ForEach(speeches) { speech in
                        SpeechRow(
                            speech: speech,
                            isFavorite: library.isFavorite(speech),
                            onPlay: { player.play(speech, in: speeches) },
                            onFavorite: { library.toggleFavorite(speech) }
                        )
                    }
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 130)
        }
        .scrollIndicators(.hidden)
        .background(AppTheme.screenGradient.ignoresSafeArea())
        .navigationTitle(category.name)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            speeches = await content.speeches(for: category)
            library.remember(speeches)
            isLoading = false
        }
    }

    private var banner: some View {
        let tint = Color(hexString: category.colorHex)

        return HStack(spacing: 16) {
            Image(systemName: category.symbol)
                .font(.title2.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(tint, in: .circle)

            VStack(alignment: .leading, spacing: 4) {
                Text(category.name)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(AppTheme.text)
                Text("\(speeches.isEmpty ? category.speechCount : speeches.count) speeches to fuel your day")
                    .font(.footnote)
                    .foregroundStyle(AppTheme.textSecondary)
            }

            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.14), in: .rect(cornerRadius: 20))
        .overlay {
            RoundedRectangle(cornerRadius: 20).stroke(tint.opacity(0.25), lineWidth: 1)
        }
        .padding(.bottom, 6)
    }
}
