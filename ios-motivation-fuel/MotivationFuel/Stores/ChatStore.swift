import Foundation
import SwiftUI

/// Conversation state for the AI motivational coach.
@MainActor
@Observable
final class ChatStore {
    private(set) var messages: [ChatMessage] = []
    private(set) var isThinking = false
    var errorMessage: String?

    private let defaults = UserDefaults.standard
    private let storageKey = "chat.messages"

    static let suggestions = [
        "How can I stay motivated when facing challenges?",
        "What are some morning habits for success?",
        "How do I build unshakeable confidence?",
        "Help me overcome procrastination today",
    ]

    init() {
        if let data = defaults.data(forKey: storageKey),
           let saved = try? JSONDecoder().decode([ChatMessage].self, from: data) {
            messages = saved
        }
    }

    func send(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isThinking else { return }

        errorMessage = nil
        messages.append(ChatMessage(text: trimmed, isUser: true))
        persist()
        isThinking = true
        defer { isThinking = false }

        // Keep the last few turns for context without sending the whole history.
        let turns = messages.suffix(10).map {
            AIService.Turn(role: $0.isUser ? "user" : "assistant", content: $0.text)
        }

        do {
            let reply = try await AIService.shared.complete(
                system: AIService.coachSystemPrompt,
                turns: turns
            )
            messages.append(ChatMessage(text: reply, isUser: false))
        } catch {
            errorMessage = error.localizedDescription
        }
        persist()
    }

    func startNewConversation() {
        messages.removeAll()
        errorMessage = nil
        persist()
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(messages) else { return }
        defaults.set(data, forKey: storageKey)
    }
}
