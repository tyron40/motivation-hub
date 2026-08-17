import Foundation

/// A bible verse shown in the Sacred Words tab.
nonisolated struct Scripture: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let verse: String
    let reference: String
    let category: String
}
