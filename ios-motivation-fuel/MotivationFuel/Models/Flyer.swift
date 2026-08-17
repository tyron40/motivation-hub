import Foundation

/// A motivational poster displayed in the flyers carousel.
nonisolated struct Flyer: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let title: String
    let quote: String
    let imageUrl: String
    let accentHex: String
}
