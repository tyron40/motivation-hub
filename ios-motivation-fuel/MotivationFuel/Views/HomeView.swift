import SwiftUI

struct HomeView: View {
    @Environment(ContentStore.self) private var content
    @Environment(LibraryStore.self) private var library
    @Environment(PlayerStore.self) private var player

    @State private var selectedFlyer: Flyer?
    @State private var path = NavigationPath()

    private var categories: [SpeechCategory] {
        var list = AppData.categories
        list.append(AppData.athleteCategory)
        if library.includeChurchMotivation {
            list.insert(AppData.churchCategory, at: 1)
        }
        return list
    }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 28) {
                    header
                    dailyQuoteCard
                    featuredSection
                    flyersSection
                    shortClipsSection
                    categoriesSection
                    popularSection
                }
                .padding(.vertical, 8)
                .padding(.bottom, 120)
            }
            .scrollIndicators(.hidden)
            .background(AppTheme.screenGradient.ignoresSafeArea())
            .refreshable { await content.refresh() }
            .navigationDestination(for: HomeRoute.self) { route in
                switch route {
                case .category(let category): CategoryDetailView(category: category)
                case .flyers: FlyersView()
                case .shortClips(let clip): ShortClipsView(initialClip: clip)
                }
            }
        }
        .task { await content.loadIfNeeded() }
        .sheet(item: $selectedFlyer) { flyer in
            FlyerPreview(flyer: flyer)
        }
    }

    // MARK: - Sections

    private var header: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Welcome to")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
                Text("Motivation Fuel")
                    .font(.title.weight(.bold))
                    .foregroundStyle(AppTheme.text)
            }

            Spacer()

            Button {
                if let first = content.featuredList.first {
                    player.play(first, in: content.featuredList)
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "play.fill")
                    Text("Play All")
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(AppTheme.text)
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(AppTheme.primary.opacity(0.9), in: .capsule)
            }
            .buttonStyle(PressableCardStyle())
        }
        .padding(.horizontal)
    }

    private var dailyQuoteCard: some View {
        let quote = AppData.dailyQuote
        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "sun.max.fill")
                    .font(.caption)
                Text("DAILY MOTIVATION")
                    .font(.caption2.weight(.bold))
                    .tracking(1.1)
            }
            .foregroundStyle(AppTheme.primary)

            Text("\u{201C}\(quote.text)\u{201D}")
                .font(.system(size: 19, weight: .semibold, design: .serif))
                .foregroundStyle(AppTheme.text)
                .lineLimit(4)
                .fixedSize(horizontal: false, vertical: true)

            Text("— \(quote.author)")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background {
            LinearGradient(
                colors: [AppTheme.primary.opacity(0.16), AppTheme.accent.opacity(0.07), .clear],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .background(AppTheme.card.opacity(0.4))
        .clipShape(.rect(cornerRadius: 20))
        .overlay {
            RoundedRectangle(cornerRadius: 20)
                .stroke(AppTheme.primary.opacity(0.25), lineWidth: 1)
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private var featuredSection: some View {
        if let featured = content.featured {
            VStack(spacing: 14) {
                CenteredSectionTitle(title: "Today's Featured")
                FeaturedSpeechCard(
                    speech: featured,
                    isFavorite: library.isFavorite(featured),
                    onPlay: { player.play(featured, in: content.featuredList) },
                    onFavorite: { library.toggleFavorite(featured) }
                )
                .padding(.horizontal)
            }
        }
    }

    private var flyersSection: some View {
        VStack(spacing: 14) {
            SectionHeader(
                title: "Motivation Flyers",
                symbol: "photo.fill",
                actionLabel: "See All",
                action: { path.append(HomeRoute.flyers) }
            )

            ScrollView(.horizontal) {
                HStack(spacing: 14) {
                    ForEach(AppData.flyers.prefix(10)) { flyer in
                        Button {
                            selectedFlyer = flyer
                        } label: {
                            FlyerPoster(flyer: flyer)
                        }
                        .buttonStyle(PressableCardStyle())
                    }
                }
            }
            .scrollIndicators(.hidden)
            .contentMargins(.horizontal, 16, for: .scrollContent)
        }
    }

    private var shortClipsSection: some View {
        VStack(spacing: 14) {
            SectionHeader(
                title: "Short Clips",
                symbol: "film.fill",
                symbolTint: AppTheme.accent,
                actionLabel: "Watch All",
                action: { path.append(HomeRoute.shortClips(nil)) }
            )

            ScrollView(.horizontal) {
                HStack(spacing: 14) {
                    ForEach(content.shortClips.prefix(8)) { clip in
                        Button {
                            path.append(HomeRoute.shortClips(clip))
                        } label: {
                            ClipPoster(clip: clip)
                        }
                        .buttonStyle(PressableCardStyle())
                    }
                }
            }
            .scrollIndicators(.hidden)
            .contentMargins(.horizontal, 16, for: .scrollContent)
        }
    }

    private var categoriesSection: some View {
        VStack(spacing: 14) {
            CenteredSectionTitle(title: "Categories")

            ScrollView(.horizontal) {
                HStack(spacing: 12) {
                    ForEach(categories) { category in
                        Button {
                            path.append(HomeRoute.category(category))
                        } label: {
                            CategoryTileView(category: category)
                        }
                        .buttonStyle(PressableCardStyle())
                    }
                }
            }
            .scrollIndicators(.hidden)
            .contentMargins(.horizontal, 16, for: .scrollContent)
        }
    }

    private var popularSection: some View {
        VStack(spacing: 14) {
            CenteredSectionTitle(title: "Popular Speeches")

            VStack(spacing: 12) {
                ForEach(content.featuredList.prefix(6)) { speech in
                    SpeechRow(
                        speech: speech,
                        isFavorite: library.isFavorite(speech),
                        onPlay: { player.play(speech, in: content.featuredList) },
                        onFavorite: { library.toggleFavorite(speech) }
                    )
                }
            }
            .padding(.horizontal)
        }
    }
}

// MARK: - Routes

enum HomeRoute: Hashable {
    case category(SpeechCategory)
    case flyers
    case shortClips(Speech?)
}

// MARK: - Flyer / clip posters

struct FlyerPoster: View {
    let flyer: Flyer

    var body: some View {
        let accent = Color(hexString: flyer.accentHex)

        Color.black
            .frame(width: 160, height: 232)
            .overlay {
                AsyncImage(url: URL(string: flyer.imageUrl)) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    LinearGradient(colors: [accent.opacity(0.5), .black], startPoint: .top, endPoint: .bottom)
                }
                .allowsHitTesting(false)
            }
            .overlay(alignment: .bottom) {
                LinearGradient(
                    colors: [.clear, .black.opacity(0.75), .black.opacity(0.94)],
                    startPoint: .center,
                    endPoint: .bottom
                )
                .allowsHitTesting(false)
            }
            .overlay(alignment: .bottomLeading) {
                VStack(alignment: .leading, spacing: 7) {
                    if !flyer.quote.isEmpty {
                        Image(systemName: "quote.opening")
                            .font(.caption2)
                            .foregroundStyle(accent)
                        Text(flyer.quote)
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(.white.opacity(0.92))
                            .lineLimit(3)
                            .multilineTextAlignment(.leading)
                    }
                    Rectangle()
                        .fill(accent)
                        .frame(width: 28, height: 3)
                        .clipShape(.capsule)
                    Text(flyer.title)
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
                .padding(12)
                .allowsHitTesting(false)
            }
            .clipShape(.rect(cornerRadius: 16))
    }
}

struct ClipPoster: View {
    let clip: Speech

    var body: some View {
        Color.black
            .frame(width: 160, height: 232)
            .overlay {
                AsyncImage(url: clip.thumbnailURL) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    AppTheme.card
                }
                .allowsHitTesting(false)
            }
            .overlay(alignment: .bottom) {
                LinearGradient(colors: [.clear, .black.opacity(0.88)], startPoint: .center, endPoint: .bottom)
                    .allowsHitTesting(false)
            }
            .overlay(alignment: .bottomLeading) {
                VStack(alignment: .leading, spacing: 7) {
                    Image(systemName: "play.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.white)
                    Text(clip.title)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Text(clip.speaker)
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.7))
                        .lineLimit(1)
                }
                .padding(12)
                .allowsHitTesting(false)
            }
            .clipShape(.rect(cornerRadius: 16))
    }
}

/// Full-bleed flyer preview presented as a sheet.
struct FlyerPreview: View {
    let flyer: Flyer
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let accent = Color(hexString: flyer.accentHex)

        ScrollView {
            VStack(spacing: 18) {
                RemoteImage(url: URL(string: flyer.imageUrl), cornerRadius: 20)
                    .frame(height: 420)

                VStack(alignment: .leading, spacing: 12) {
                    Text(flyer.title)
                        .font(.title2.weight(.bold))
                        .foregroundStyle(AppTheme.text)

                    if !flyer.quote.isEmpty {
                        Text(flyer.quote)
                            .font(.body)
                            .foregroundStyle(AppTheme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    ShareLink(item: "\(flyer.title)\n\n\(flyer.quote)\n\nShared from Motivation Fuel") {
                        Label("Share", systemImage: "square.and.arrow.up")
                            .font(.subheadline.weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                            .background(accent, in: .capsule)
                            .foregroundStyle(.white)
                    }
                    .padding(.top, 4)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
            }
            .padding(.top, 12)
            .padding(.bottom, 32)
        }
        .background(AppTheme.screenGradient.ignoresSafeArea())
        .overlay(alignment: .topTrailing) {
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 34, height: 34)
                    .background(.black.opacity(0.55), in: .circle)
            }
            .padding()
        }
    }
}
