import Foundation

/// A single turn in the AI coach conversation.
nonisolated struct ChatMessage: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let text: String
    let isUser: Bool
    let timestamp: Date

    init(id: UUID = UUID(), text: String, isUser: Bool, timestamp: Date = .now) {
        self.id = id
        self.text = text
        self.isUser = isUser
        self.timestamp = timestamp
    }
}
