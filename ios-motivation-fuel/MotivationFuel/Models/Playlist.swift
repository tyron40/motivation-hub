import Foundation

/// A user-created collection of speeches.
nonisolated struct Playlist: Identifiable, Codable, Hashable, Sendable {
    let id: String
    var name: String
    var speechIds: [String]
    var createdAt: Date
    var updatedAt: Date
    var colorHex: String
}
