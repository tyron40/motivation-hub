import SwiftUI

struct ProfileView: View {
    @Environment(LibraryStore.self) private var library

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    profileCard
                    statsRow
                    quickLinks
                }
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 130)
            }
            .scrollIndicators(.hidden)
            .background(AppTheme.screenGradient.ignoresSafeArea())
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .foregroundStyle(AppTheme.primary)
                    }
                }
            }
        }
    }

    private var profileCard: some View {
        VStack(spacing: 14) {
            Text(initials)
                .font(.title.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 88, height: 88)
                .background(AppTheme.featuredGradient, in: .circle)
                .overlay {
                    Circle().stroke(.white.opacity(0.2), lineWidth: 2)
                }

            Text(library.displayName)
                .font(.title3.weight(.bold))
                .foregroundStyle(AppTheme.text)

            Text("Day \(library.streak) of showing up")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 26)
        .background(AppTheme.card.opacity(0.55), in: .rect(cornerRadius: 24))
        .overlay {
            RoundedRectangle(cornerRadius: 24).stroke(.white.opacity(0.08), lineWidth: 1)
        }
    }

    private var initials: String {
        let parts = library.displayName.split(separator: " ").prefix(2)
        let letters = parts.compactMap { $0.first }
        return letters.isEmpty ? "MF" : String(letters).uppercased()
    }

    private var statsRow: some View {
        HStack(spacing: 12) {
            StatTile(value: library.listeningTimeLabel, label: "Listened", symbol: "headphones", tint: AppTheme.primary)
            StatTile(value: "\(library.favorites.count)", label: "Favorites", symbol: "heart.fill", tint: Color(hex: 0xEC4899))
            StatTile(value: "\(library.streak)", label: "Day Streak", symbol: "flame.fill", tint: Color(hex: 0xF59E0B))
        }
    }

    private var quickLinks: some View {
        VStack(spacing: 12) {
            NavigationLink {
                FavoritesView()
            } label: {
                LinkRow(symbol: "heart.fill", tint: Color(hex: 0xEC4899),
                        title: "My Favorites",
                        subtitle: "\(library.favorites.count) saved \(library.favorites.count == 1 ? "speech" : "speeches")")
            }

            NavigationLink {
                PlaylistsView()
            } label: {
                LinkRow(symbol: "music.note.list", tint: AppTheme.primary,
                        title: "My Playlists",
                        subtitle: "\(library.playlists.count) \(library.playlists.count == 1 ? "playlist" : "playlists")")
            }

            NavigationLink {
                FavoriteScripturesView()
            } label: {
                LinkRow(symbol: "book.fill", tint: Color(hex: 0x8B5CF6),
                        title: "Saved Scriptures",
                        subtitle: "\(library.favoriteScriptures.count) saved")
            }

            NavigationLink {
                SettingsView()
            } label: {
                LinkRow(symbol: "gearshape.fill", tint: AppTheme.textSecondary,
                        title: "Settings", subtitle: "Name, theme, preferences")
            }
        }
    }
}

struct StatTile: View {
    let value: String
    let label: String
    let symbol: String
    let tint: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: symbol)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(tint)

            Text(value)
                .font(.title3.weight(.bold))
                .foregroundStyle(AppTheme.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(label)
                .font(.caption2)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(tint.opacity(0.12), in: .rect(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18).stroke(tint.opacity(0.2), lineWidth: 1)
        }
    }
}

struct LinkRow: View {
    let symbol: String
    let tint: Color
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: symbol)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 38, height: 38)
                .background(tint, in: .rect(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(AppTheme.text)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(AppTheme.textSecondary)
        }
        .padding(14)
        .background(AppTheme.card.opacity(0.5), in: .rect(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.06), lineWidth: 1)
        }
    }
}

/// Saved bible verses list.
struct FavoriteScripturesView: View {
    @Environment(LibraryStore.self) private var library

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                if library.favoriteScriptures.isEmpty {
                    ContentUnavailableView(
                        "No saved verses",
                        systemImage: "book.closed",
                        description: Text("Tap the heart on a verse in Sacred Words to save it here.")
                    )
                    .padding(.top, 60)
                } else {
                    ForEach(library.favoriteScriptures) { scripture in
                        VStack(alignment: .leading, spacing: 10) {
                            Text(scripture.reference)
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(AppTheme.scriptureColor(scripture.category))
                            Text("\"\(scripture.verse)\"")
                                .font(.system(size: 16, design: .serif))
                                .italic()
                                .foregroundStyle(AppTheme.text)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .background(AppTheme.card.opacity(0.55), in: .rect(cornerRadius: 18))
                        .swipeActions {
                            Button(role: .destructive) {
                                library.toggleFavoriteScripture(scripture)
                            } label: {
                                Label("Remove", systemImage: "trash")
                            }
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 120)
        }
        .scrollIndicators(.hidden)
        .background(AppTheme.screenGradient.ignoresSafeArea())
        .navigationTitle("Saved Scriptures")
        .navigationBarTitleDisplayMode(.inline)
    }
}
