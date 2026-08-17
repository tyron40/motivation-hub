import Foundation

/// A browsable content category shown on the home screen.
nonisolated struct SpeechCategory: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let name: String
    /// SF Symbol name used for the category tile.
    let symbol: String
    let colorHex: String
    let speechCount: Int
}
