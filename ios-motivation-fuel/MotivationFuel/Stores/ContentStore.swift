import Foundation
import SwiftUI

/// Loads and caches speech content from YouTube, with bundled fallbacks.
@MainActor
@Observable
final class ContentStore {
    private(set) var speeches: [Speech] = AppData.fallbackSpeeches
    private(set) var shortClips: [Speech] = AppData.fallbackShortClips
    private(set) var isLoading = false
    private(set) var loadFailed = false

    private var categoryCache: [String: [Speech]] = [:]

    /// Long-form speeches (over a minute) used across the home screen.
    var featuredList: [Speech] {
        let filtered = speeches.filter { $0.duration > 60 }
        return filtered.isEmpty ? AppData.fallbackSpeeches : filtered
    }

    /// The speech of the day, rotating by day of year.
    var featured: Speech? {
        let list = featuredList
        guard !list.isEmpty else { return nil }
        let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: .now) ?? 1
        return list[dayOfYear % list.count]
    }

    func loadIfNeeded() async {
        guard !isLoading, speeches.count <= AppData.fallbackSpeeches.count else { return }
        await refresh()
    }

    func refresh() async {
        isLoading = true
        loadFailed = false
        defer { isLoading = false }

        async let trending = YouTubeService.shared.trending(limit: 35)
        async let clips = YouTubeService.shared.search("motivational short clips inspiration", limit: 24)

        do {
            let loaded = try await trending
            if !loaded.isEmpty { speeches = loaded }
        } catch {
            loadFailed = true
            #if DEBUG
            print("[Content] trending failed: \(error.localizedDescription)")
            #endif
        }

        if let loadedClips = try? await clips {
            let short = loadedClips.filter { $0.duration > 0 && $0.duration <= 180 }
            if !short.isEmpty { shortClips = short }
        }
    }

    /// Speeches for a category — locally filtered first, then fetched if sparse.
    func speeches(for category: SpeechCategory) async -> [Speech] {
        if let cached = categoryCache[category.id] { return cached }

        let local = speeches.filter { $0.category == category.name }
        if local.count >= 6 {
            categoryCache[category.id] = local
            return local
        }

        do {
            let fetched = try await YouTubeService.shared.videos(forCategory: category.name, limit: 25)
            let merged = (local + fetched).reduced()
            categoryCache[category.id] = merged
            return merged
        } catch {
            let fallback = local.isEmpty ? AppData.fallbackSpeeches : local
            categoryCache[category.id] = fallback
            return fallback
        }
    }
}

extension Array where Element == Speech {
    /// Removes duplicate speeches while preserving order.
    func reduced() -> [Speech] {
        var seen = Set<String>()
        return filter { seen.insert($0.id).inserted }
    }
}
