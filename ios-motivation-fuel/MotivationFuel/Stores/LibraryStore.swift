import Foundation
import SwiftUI

/// User library: favorites, playlists, profile and listening stats.
/// Persists to `UserDefaults` so the state survives relaunches.
@MainActor
@Observable
final class LibraryStore {
    private(set) var favorites: [Speech] = []
    private(set) var playlists: [Playlist] = []
    private(set) var favoriteScriptures: [Scripture] = []

    var displayName: String = "Friend" { didSet { persistProfile() } }
    var includeChurchMotivation: Bool = false { didSet { persistProfile() } }
    var notificationsEnabled: Bool = true { didSet { persistProfile() } }
    private(set) var totalListeningSeconds: Int = 0
    private(set) var streak: Int = 1

    private let defaults = UserDefaults.standard
    private enum Key {
        static let favorites = "library.favorites"
        static let playlists = "library.playlists"
        static let scriptures = "library.scriptureFavorites"
        static let name = "profile.name"
        static let church = "profile.includeChurch"
        static let notifications = "profile.notifications"
        static let listening = "profile.listeningSeconds"
        static let streak = "profile.streak"
        static let lastOpen = "profile.lastOpenDay"
    }

    init() {
        favorites = decode([Speech].self, key: Key.favorites) ?? []
        playlists = decode([Playlist].self, key: Key.playlists) ?? []
        favoriteScriptures = decode([Scripture].self, key: Key.scriptures) ?? []
        displayName = defaults.string(forKey: Key.name) ?? "Friend"
        includeChurchMotivation = defaults.bool(forKey: Key.church)
        notificationsEnabled = defaults.object(forKey: Key.notifications) as? Bool ?? true
        totalListeningSeconds = defaults.integer(forKey: Key.listening)
        streak = max(1, defaults.integer(forKey: Key.streak))
        refreshStreak()
    }

    // MARK: - Speech favorites

    func isFavorite(_ speech: Speech) -> Bool {
        favorites.contains { $0.id == speech.id }
    }

    func toggleFavorite(_ speech: Speech) {
        if let index = favorites.firstIndex(where: { $0.id == speech.id }) {
            favorites.remove(at: index)
        } else {
            favorites.insert(speech, at: 0)
        }
        persist(favorites, key: Key.favorites)
    }

    // MARK: - Scripture favorites

    func isFavoriteScripture(_ scripture: Scripture) -> Bool {
        favoriteScriptures.contains { $0.reference == scripture.reference }
    }

    func toggleFavoriteScripture(_ scripture: Scripture) {
        if let index = favoriteScriptures.firstIndex(where: { $0.reference == scripture.reference }) {
            favoriteScriptures.remove(at: index)
        } else {
            favoriteScriptures.insert(scripture, at: 0)
        }
        persist(favoriteScriptures, key: Key.scriptures)
    }

    // MARK: - Playlists

    private static let playlistColors = ["#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#06B6D4"]

    @discardableResult
    func createPlaylist(named name: String) -> Playlist {
        let playlist = Playlist(
            id: UUID().uuidString,
            name: name,
            speechIds: [],
            createdAt: .now,
            updatedAt: .now,
            colorHex: Self.playlistColors[playlists.count % Self.playlistColors.count]
        )
        playlists.insert(playlist, at: 0)
        persist(playlists, key: Key.playlists)
        return playlist
    }

    func deletePlaylist(_ playlist: Playlist) {
        playlists.removeAll { $0.id == playlist.id }
        persist(playlists, key: Key.playlists)
    }

    func addToPlaylist(_ playlistId: String, speech: Speech) {
        guard let index = playlists.firstIndex(where: { $0.id == playlistId }) else { return }
        if !playlists[index].speechIds.contains(speech.id) {
            playlists[index].speechIds.append(speech.id)
            playlists[index].updatedAt = .now
            persist(playlists, key: Key.playlists)
        }
        // Keep a copy of the speech so playlists can be rendered offline.
        remember(speech)
    }

    func removeFromPlaylist(_ playlistId: String, speechId: String) {
        guard let index = playlists.firstIndex(where: { $0.id == playlistId }) else { return }
        playlists[index].speechIds.removeAll { $0 == speechId }
        playlists[index].updatedAt = .now
        persist(playlists, key: Key.playlists)
    }

    /// Speeches belonging to a playlist, resolved from the known-speech cache.
    func speeches(in playlist: Playlist) -> [Speech] {
        playlist.speechIds.compactMap { id in knownSpeeches[id] }
    }

    // MARK: - Known speech cache

    private var knownSpeeches: [String: Speech] = [:]

    func remember(_ speech: Speech) {
        knownSpeeches[speech.id] = speech
    }

    func remember(_ speeches: [Speech]) {
        for speech in speeches { knownSpeeches[speech.id] = speech }
    }

    // MARK: - Stats

    func addListeningTime(_ seconds: Int) {
        guard seconds > 0 else { return }
        totalListeningSeconds += seconds
        defaults.set(totalListeningSeconds, forKey: Key.listening)
    }

    var listeningTimeLabel: String {
        let hours = totalListeningSeconds / 3600
        let minutes = (totalListeningSeconds % 3600) / 60
        return hours > 0 ? "\(hours)h \(minutes)m" : "\(minutes)m"
    }

    private func refreshStreak() {
        let today = Calendar.current.startOfDay(for: .now)
        guard let last = defaults.object(forKey: Key.lastOpen) as? Date else {
            defaults.set(today, forKey: Key.lastOpen)
            return
        }
        let lastDay = Calendar.current.startOfDay(for: last)
        let days = Calendar.current.dateComponents([.day], from: lastDay, to: today).day ?? 0
        if days == 1 {
            streak += 1
        } else if days > 1 {
            streak = 1
        }
        defaults.set(streak, forKey: Key.streak)
        defaults.set(today, forKey: Key.lastOpen)
    }

    // MARK: - Persistence

    private func persistProfile() {
        defaults.set(displayName, forKey: Key.name)
        defaults.set(includeChurchMotivation, forKey: Key.church)
        defaults.set(notificationsEnabled, forKey: Key.notifications)
    }

    private func persist<T: Encodable>(_ value: T, key: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        defaults.set(data, forKey: key)
    }

    private func decode<T: Decodable>(_ type: T.Type, key: String) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }
}
