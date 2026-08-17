import Foundation

nonisolated enum AIError: LocalizedError {
    case notConfigured
    case authError
    case insufficientBalance
    case rateLimited
    case serverError(Int)
    case emptyResponse

    var errorDescription: String? {
        switch self {
        case .notConfigured: "The AI coach isn't available in this build."
        case .authError: "AI features are currently unavailable. Please restart the app."
        case .insufficientBalance: "AI features are temporarily unavailable. Please try again later."
        case .rateLimited: "Too many requests. Give it a moment and try again."
        case .serverError: "Something went wrong. Please try again."
        case .emptyResponse: "The coach didn't have a reply. Try rephrasing."
        }
    }
}

/// Talks to the Rork Toolkit AI proxy (OpenAI-compatible) for coaching replies.
nonisolated struct AIService: Sendable {
    static let shared = AIService()

    private let model = "openai/gpt-4o-mini"

    static let coachSystemPrompt = """
    You are the Motivation Fuel coach: a warm, direct, high-energy motivational \
    mentor. Speak like a trusted coach, not a therapist or a chatbot. Keep replies \
    under 150 words, use short punchy sentences, and always close with one concrete \
    action the person can take today. Be encouraging and non-denominational unless \
    the user brings up faith first.
    """

    struct Turn: Sendable {
        let role: String
        let content: String
    }

    /// Sends a conversation and returns the assistant's reply text.
    func complete(system: String, turns: [Turn]) async throws -> String {
        let toolkit = Config.EXPO_PUBLIC_TOOLKIT_URL
        let key = Config.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY
        guard !toolkit.isEmpty, !key.isEmpty,
              let url = URL(string: "\(toolkit)/v2/vercel/v1/chat/completions") else {
            throw AIError.notConfigured
        }

        var messages: [[String: String]] = [["role": "system", "content": system]]
        messages.append(contentsOf: turns.map { ["role": $0.role, "content": $0.content] })

        let body: [String: Any] = [
            "model": model,
            "messages": messages,
            "temperature": 0.8,
        ]

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AIError.serverError(-1) }

        switch http.statusCode {
        case 200: break
        case 401: throw AIError.authError
        case 402: throw AIError.insufficientBalance
        case 429: throw AIError.rateLimited
        default: throw AIError.serverError(http.statusCode)
        }

        let decoded = try JSONDecoder().decode(CompletionResponse.self, from: data)
        let text = decoded.choices.first?.message.content?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !text.isEmpty else { throw AIError.emptyResponse }
        return text
    }

    /// Generates a short motivational application for a bible verse.
    func scriptureInsight(for scripture: Scripture) async throws -> String {
        let prompt = """
        Using the following Bible verse, write a concise, uplifting motivational \
        application (3-5 sentences) that helps someone apply it today. Avoid quoting \
        the verse again. Keep it warm, practical, and non-denominational. \
        Verse: "\(scripture.verse)" (\(scripture.reference)).
        """
        return try await complete(
            system: "You write brief, practical, encouraging reflections.",
            turns: [Turn(role: "user", content: prompt)]
        )
    }

    /// Generates additional verses for a category, returned as scriptures.
    func generateScriptures(category: String) async throws -> [Scripture] {
        let prompt = """
        Generate 5 inspiring Bible verses about \(category). Respond with JSON only, \
        an array with this structure: \
        [{"id":"unique-id","verse":"the verse text","reference":"Book Chapter:Verse","category":"\(category)"}]
        """
        let raw = try await complete(
            system: "You return valid JSON and nothing else.",
            turns: [Turn(role: "user", content: prompt)]
        )

        guard let start = raw.firstIndex(of: "["), let end = raw.lastIndex(of: "]") else {
            return []
        }
        let json = String(raw[start...end])
        guard let data = json.data(using: .utf8) else { return [] }
        let decoded = (try? JSONDecoder().decode([Scripture].self, from: data)) ?? []
        return decoded.map {
            Scripture(id: "ai-\(UUID().uuidString)", verse: $0.verse, reference: $0.reference, category: category)
        }
    }
}

private nonisolated struct CompletionResponse: Decodable {
    struct Choice: Decodable {
        struct Message: Decodable { let content: String? }
        let message: Message
    }
    let choices: [Choice]
}
