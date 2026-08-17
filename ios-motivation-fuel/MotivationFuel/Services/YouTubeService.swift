import Foundation

nonisolated enum YouTubeError: LocalizedError {
    case missingKey
    case badResponse(Int)

    var errorDescription: String? {
        switch self {
        case .missingKey: "Video library is unavailable right now."
        case .badResponse: "Couldn't load speeches. Pull to refresh."
        }
    }
}

/// Fetches motivational content from the YouTube Data API.
nonisolated struct YouTubeService: Sendable {
    static let shared = YouTubeService()

    private let channelId = "UCHmQDfB84rZecCY_ERM4eYQ"
    private let base = "https://www.googleapis.com/youtube/v3"

    private var apiKey: String { Config.EXPO_PUBLIC_YOUTUBE_API_KEY }

    // MARK: - Public API

    /// Latest uploads from the Motivation Fuel channel.
    func trending(limit: Int = 35) async throws -> [Speech] {
        let ids = try await searchIds(
            query: nil,
            channelId: channelId,
            order: "date",
            limit: limit
        )
        return try await details(for: ids)
    }

    /// Free-text search across YouTube.
    func search(_ query: String, limit: Int = 25) async throws -> [Speech] {
        let ids = try await searchIds(query: query, channelId: nil, order: "relevance", limit: limit)
        return try await details(for: ids)
    }

    /// Videos matching a category, using the category name as the search seed.
    func videos(forCategory category: String, limit: Int = 25) async throws -> [Speech] {
        let seed: String
        switch category {
        case "Christian Motivation": seed = "christian motivational sermon speech"
        case "Athlete Pump Up": seed = "athlete pump up motivational speech"
        default: seed = "\(category) motivational speech"
        }
        return try await search(seed, limit: limit)
    }

    // MARK: - Internals

    private func searchIds(query: String?, channelId: String?, order: String, limit: Int) async throws -> [String] {
        guard !apiKey.isEmpty else { throw YouTubeError.missingKey }

        var components = URLComponents(string: "\(base)/search")
        var items: [URLQueryItem] = [
            URLQueryItem(name: "part", value: "snippet"),
            URLQueryItem(name: "type", value: "video"),
            URLQueryItem(name: "maxResults", value: String(min(limit, 50))),
            URLQueryItem(name: "order", value: order),
            URLQueryItem(name: "key", value: apiKey),
        ]
        if let query { items.append(URLQueryItem(name: "q", value: query)) }
        if let channelId { items.append(URLQueryItem(name: "channelId", value: channelId)) }
        components?.queryItems = items

        guard let url = components?.url else { throw YouTubeError.badResponse(-1) }
        let payload: SearchResponse = try await get(url)
        return payload.items.compactMap(\.id.videoId)
    }

    private func details(for ids: [String]) async throws -> [Speech] {
        guard !ids.isEmpty else { return [] }

        var components = URLComponents(string: "\(base)/videos")
        components?.queryItems = [
            URLQueryItem(name: "part", value: "snippet,contentDetails"),
            URLQueryItem(name: "id", value: ids.joined(separator: ",")),
            URLQueryItem(name: "key", value: apiKey),
        ]
        guard let url = components?.url else { throw YouTubeError.badResponse(-1) }

        let payload: VideoResponse = try await get(url)
        return payload.items.map { item in
            let seconds = Self.parseISODuration(item.contentDetails.duration)
            let thumb = item.snippet.thumbnails.best
            return Speech(
                id: item.id,
                title: Self.decodeEntities(item.snippet.title),
                speaker: Self.decodeEntities(item.snippet.channelTitle),
                duration: seconds,
                category: AppData.classify(title: item.snippet.title, description: item.snippet.description),
                imageUrl: thumb,
                youtubeId: item.id,
                description: Self.decodeEntities(item.snippet.description)
            )
        }
    }

    private func get<T: Decodable>(_ url: URL) async throws -> T {
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw YouTubeError.badResponse(-1) }
        guard http.statusCode == 200 else { throw YouTubeError.badResponse(http.statusCode) }
        return try JSONDecoder().decode(T.self, from: data)
    }

    /// Converts an ISO-8601 duration such as `PT8M15S` into seconds.
    static func parseISODuration(_ value: String) -> Int {
        var total = 0
        var digits = ""
        for character in value.dropFirst() where character != "T" {
            if character.isNumber {
                digits.append(character)
            } else {
                let amount = Int(digits) ?? 0
                switch character {
                case "H": total += amount * 3600
                case "M": total += amount * 60
                case "S": total += amount
                default: break
                }
                digits = ""
            }
        }
        return total
    }

    static func decodeEntities(_ value: String) -> String {
        value
            .replacingOccurrences(of: "&amp;", with: "&")
            .replacingOccurrences(of: "&quot;", with: "\"")
            .replacingOccurrences(of: "&#39;", with: "'")
            .replacingOccurrences(of: "&lt;", with: "<")
            .replacingOccurrences(of: "&gt;", with: ">")
    }
}

// MARK: - Wire types

private nonisolated struct SearchResponse: Decodable {
    struct Item: Decodable {
        struct ID: Decodable { let videoId: String? }
        let id: ID
    }
    let items: [Item]
}

private nonisolated struct VideoResponse: Decodable {
    struct Item: Decodable {
        struct Snippet: Decodable {
            let title: String
            let description: String
            let channelTitle: String
            let thumbnails: Thumbnails
        }
        struct Thumbnails: Decodable {
            struct Image: Decodable { let url: String }
            let medium: Image?
            let high: Image?
            let maxres: Image?

            var best: String { (maxres ?? high ?? medium)?.url ?? "" }
        }
        struct ContentDetails: Decodable { let duration: String }

        let id: String
        let snippet: Snippet
        let contentDetails: ContentDetails
    }
    let items: [Item]
}
