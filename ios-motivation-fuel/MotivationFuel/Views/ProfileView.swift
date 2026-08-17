import SwiftUI

struct ProfileView: View {
    @Environment(LibraryStore.self) private var library
    @Environment(AuthManager.self) private var auth
    @Environment(StoreManager.self) private var store
    @Environment(UserProfileStore.self) private var profile

    @State private var showPaywall = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    profileCard
                    statsRow
                    upgradeCard
                    quickLinks
                    signOutSection
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
            .sheet(isPresented: $showPaywall) {
                PaywallView()
            }
        }
    }

    // MARK: - Profile Card

    private var profileCard: some View {
        VStack(spacing: 14) {
            if let imageUrl = profile.profileImageURI, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    placeholderAvatar
                }
                .frame(width: 88, height: 88)
                .clipShape(.circle)
                .overlay {
                    Circle().stroke(AppTheme.primary.opacity(0.4), lineWidth: 3)
                }
            } else {
                placeholderAvatar
            }

            Text(displayName)
                .font(.title3.weight(.bold))
                .foregroundStyle(AppTheme.text)

            if let email = auth.user?.email {
                Text(email)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }

            Text("Day \(library.streak) of showing up")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)

            if store.isPremium {
                HStack(spacing: 6) {
                    Image(systemName: "crown.fill")
                        .font(.caption)
                        .foregroundStyle(Color(hex: 0xFFD700))
                    Text("Premium")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color(hex: 0xFFD700))
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(Color(hex: 0xFFD700).opacity(0.12), in: .capsule)
                .overlay {
                    Capsule().stroke(Color(hex: 0xFFD700).opacity(0.2), lineWidth: 1)
                }
                .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 26)
        .background(AppTheme.card.opacity(0.55), in: .rect(cornerRadius: 24))
        .overlay {
            RoundedRectangle(cornerRadius: 24).stroke(.white.opacity(0.08), lineWidth: 1)
        }
    }

    private var placeholderAvatar: some View {
        Text(initials)
            .font(.title.weight(.bold))
            .foregroundStyle(.white)
            .frame(width: 88, height: 88)
            .background(AppTheme.featuredGradient, in: .circle)
            .overlay {
                Circle().stroke(.white.opacity(0.2), lineWidth: 2)
            }
    }

    private var initials: String {
        let name = profile.name.isEmpty ? library.displayName : profile.name
        let parts = name.split(separator: " ").prefix(2)
        let letters = parts.compactMap { $0.first }
        return letters.isEmpty ? "MF" : String(letters).uppercased()
    }

    private var displayName: String {
        let name = profile.name.isEmpty ? library.displayName : profile.name
        return name.isEmpty ? (auth.user?.displayName ?? "Friend") : name
    }

    // MARK: - Stats

    private var statsRow: some View {
        HStack(spacing: 12) {
            StatTile(value: library.listeningTimeLabel, label: "Listened", symbol: "headphones", tint: AppTheme.primary)
            StatTile(value: "\(library.favorites.count)", label: "Favorites", symbol: "heart.fill", tint: Color(hex: 0xEC4899))
            StatTile(value: "\(library.streak)", label: "Day Streak", symbol: "flame.fill", tint: Color(hex: 0xF59E0B))
            StatTile(value: "\(store.credits)", label: "Credits", symbol: "bolt.fill", tint: Color(hex: 0x8B5CF6))
        }
    }

    // MARK: - Upgrade Card

    @ViewBuilder
    private var upgradeCard: some View {
        if !store.isPremium {
            Button {
                showPaywall = true
            } label: {
                HStack(spacing: 14) {
                    Image(systemName: "crown.fill")
                        .font(.title2)
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(.white.opacity(0.2), in: .rect(cornerRadius: 14))

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Go Premium")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.white)
                        Text("Ad-free + unlimited AI features")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.8))
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .foregroundStyle(.white.opacity(0.7))
                }
                .padding(18)
                .background(
                    LinearGradient(colors: [AppTheme.primary, AppTheme.gradientStart],
                                   startPoint: .leading, endPoint: .trailing),
                    in: .rect(cornerRadius: 18)
                )
            }
            .buttonStyle(PressableCardStyle())
        }
    }

    // MARK: - Quick Links

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
                CoachCharacterView()
            } label: {
                LinkRow(symbol: "sparkles", tint: Color(hex: 0xF59E0B),
                        title: "Choose Coach Character",
                        subtitle: profile.coachCharacter?.name ?? "Coach Alex")
            }

            NavigationLink {
                VoiceCoachView()
            } label: {
                LinkRow(symbol: "mic.fill", tint: AppTheme.primary,
                        title: "Talk to Voice Coach",
                        subtitle: "Press and hold to speak")
            }

            NavigationLink {
                SettingsView()
            } label: {
                LinkRow(symbol: "gearshape.fill", tint: AppTheme.textSecondary,
                        title: "Settings", subtitle: "Name, voice, preferences")
            }
        }
    }

    // MARK: - Sign Out

    private var signOutSection: some View {
        VStack(spacing: 12) {
            Button {
                Task { await auth.signOut() }
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color(hex: 0xFF6B6B))
                        .frame(width: 38, height: 38)
                        .background(Color(hex: 0xFF6B6B).opacity(0.12), in: .rect(cornerRadius: 12))

                    Text("Sign Out")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color(hex: 0xFF6B6B))

                    Spacer()
                }
                .padding(14)
                .background(AppTheme.card.opacity(0.5), in: .rect(cornerRadius: 16))
                .overlay {
                    RoundedRectangle(cornerRadius: 16).stroke(Color(hex: 0xFF6B6B).opacity(0.15), lineWidth: 1)
                }
            }
            .buttonStyle(PressableCardStyle())
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
