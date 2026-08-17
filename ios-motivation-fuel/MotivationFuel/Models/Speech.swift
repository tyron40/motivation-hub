import Foundation

/// A motivational speech or talk backed by a YouTube video.
nonisolated struct Speech: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let title: String
    let speaker: String
    let duration: Int
    var category: String
    let imageUrl: String
    let youtubeId: String?
    let description: String

    var thumbnailURL: URL? {
        if let youtubeId, !youtubeId.isEmpty {
            return URL(string: "https://i.ytimg.com/vi/\(youtubeId)/hqdefault.jpg")
        }
        return URL(string: imageUrl)
    }

    var durationLabel: String {
        let minutes = duration / 60
        return minutes > 0 ? "\(minutes) min" : "\(duration)s"
    }

    var shareURL: URL? {
        guard let youtubeId, !youtubeId.isEmpty else { return nil }
        return URL(string: "https://youtube.com/watch?v=\(youtubeId)")
    }
}
