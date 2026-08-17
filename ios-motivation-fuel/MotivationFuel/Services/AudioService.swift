import AVFoundation
import Foundation

/// Error types for audio gateway operations.
nonisolated enum AudioGatewayError: LocalizedError {
    case notConfigured
    case authError
    case insufficientBalance
    case rateLimited
    case invalidAudio
    case serverError(Int)

    var errorDescription: String? {
        switch self {
        case .notConfigured: "Audio features aren't available in this build."
        case .authError: "Audio features are currently unavailable. Please restart the app."
        case .insufficientBalance: "Audio features are temporarily unavailable. Please try again later."
        case .rateLimited: "Too many requests. Please wait a moment and try again."
        case .invalidAudio: "The speech response could not be decoded."
        case .serverError: "Something went wrong. Please try again."
        }
    }
}

/// Text-to-speech and speech-to-text via Vercel AI Gateway through the Rork Toolkit proxy.
/// Uses `xai/grok-tts` for synthesis and `xai/grok-stt` for transcription,
/// falling back to `openai/tts-1` and `openai/gpt-4o-mini-transcribe`.
nonisolated struct AudioService: Sendable {
    static let shared = AudioService()

    private let speechModel = "xai/grok-tts"
    private let speechFallbackModel = "openai/tts-1"
    private let transcriptionModel = "xai/grok-stt"
    private let transcriptionFallbackModel = "openai/gpt-4o-mini-transcribe"

    // MARK: - Text-to-Speech

    /// Generates speech audio for the given text, returning an `AVAudioPlayer`.
    /// Uses the preferred OpenAI-style voice ID (alloy, echo, fable, onyx, nova, shimmer).
    func synthesize(text: String, voice: String) async throws -> AVAudioPlayer {
        let toolkit = Config.EXPO_PUBLIC_TOOLKIT_URL
        let key = Config.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY
        guard !toolkit.isEmpty, !key.isEmpty,
              let url = URL(string: "\(toolkit)/v2/vercel/v4/ai/speech-model") else {
            throw AudioGatewayError.notConfigured
        }

        let body: [String: Any] = [
            "text": text,
            "voice": voice,
            "outputFormat": "mp3",
        ]

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 120
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(speechModel, forHTTPHeaderField: "ai-model-id")
        request.setValue("0.0.1", forHTTPHeaderField: "ai-gateway-protocol-version")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AudioGatewayError.serverError(-1) }

        switch http.statusCode {
        case 200: break
        case 401: throw AudioGatewayError.authError
        case 402: throw AudioGatewayError.insufficientBalance
        case 429: throw AudioGatewayError.rateLimited
        default: throw AudioGatewayError.serverError(http.statusCode)
        }

        struct SpeechResponse: Decodable { let audio: String }
        let result = try JSONDecoder().decode(SpeechResponse.self, from: data)
        guard let audioData = Data(base64Encoded: result.audio) else {
            throw AudioGatewayError.invalidAudio
        }

        return try AVAudioPlayer(data: audioData)
    }

    // MARK: - Speech-to-Text

    /// Transcribes an audio file URL to text using the Gateway transcription endpoint.
    func transcribe(audioURL: URL) async throws -> String {
        let toolkit = Config.EXPO_PUBLIC_TOOLKIT_URL
        let key = Config.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY
        guard !toolkit.isEmpty, !key.isEmpty,
              let url = URL(string: "\(toolkit)/v2/vercel/v4/ai/transcription-model") else {
            throw AudioGatewayError.notConfigured
        }

        let audioData = try Data(contentsOf: audioURL)
        let mediaType = mediaType(for: audioURL)

        let body: [String: Any] = [
            "audio": audioData.base64EncodedString(),
            "mediaType": mediaType,
        ]

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 120
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(transcriptionModel, forHTTPHeaderField: "ai-model-id")
        request.setValue("0.0.1", forHTTPHeaderField: "ai-gateway-protocol-version")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AudioGatewayError.serverError(-1) }

        switch http.statusCode {
        case 200: break
        case 401: throw AudioGatewayError.authError
        case 402: throw AudioGatewayError.insufficientBalance
        case 429: throw AudioGatewayError.rateLimited
        default: throw AudioGatewayError.serverError(http.statusCode)
        }

        struct TranscriptionResponse: Decodable { let text: String? }
        let result = try JSONDecoder().decode(TranscriptionResponse.self, from: data)
        let text = result.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return text
    }

    private func mediaType(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "mp3": "audio/mpeg"
        case "wav": "audio/wav"
        case "m4a": "audio/mp4"
        case "caf": "audio/x-caf"
        case "ogg": "audio/ogg"
        case "flac": "audio/flac"
        case "webm": "audio/webm"
        default: "application/octet-stream"
        }
    }
}
