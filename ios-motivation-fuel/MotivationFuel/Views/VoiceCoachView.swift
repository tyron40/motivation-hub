import AVFoundation
import SwiftUI

/// Full-screen AI voice coach: press-and-hold to record, transcribes via Gateway STT,
/// gets an AI reply, and speaks it back via Gateway TTS.
struct VoiceCoachView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(UserProfileStore.self) private var profile
    @Environment(StoreManager.self) private var store

    @State private var audioRecorder = VoiceCoachRecorder()
    @State private var statusText = "Ready to listen"
    @State private var isRecording = false
    @State private var isProcessing = false
    @State private var isPlaying = false
    @State private var messages: [ChatMessage] = []
    @State private var hasGreeted = false
    @State private var showVoicePicker = false
    @State private var audioPlayer: AVAudioPlayer?
    @State private var pulseScale: CGFloat = 1.0
    @State private var avatarScale: CGFloat = 1.0
    @State private var alertMessage = ""
    @State private var showAlert = false

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                avatarSection
                statusSection
                recordButton
                instructionsSection
                if !messages.isEmpty { messagePreview }
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 130)
        }
        .scrollIndicators(.hidden)
        .background(AppTheme.screenGradient.ignoresSafeArea())
        .navigationTitle("Voice Coach")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showVoicePicker = true } label: {
                    Image(systemName: "waveform")
                        .foregroundStyle(AppTheme.primary)
                }
            }
        }
        .sheet(isPresented: $showVoicePicker) {
            VoicePickerSheet()
                .presentationDetents([.medium])
        }
        .alert("Voice Coach", isPresented: $showAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage)
        }
        .task {
            await greetIfNeeded()
        }
        .onChange(of: isRecording) { _, recording in
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                pulseScale = recording ? 1.15 : 1.0
            }
        }
        .onChange(of: isPlaying) { _, playing in
            withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                avatarScale = playing ? 1.08 : 1.0
            }
        }
    }

    // MARK: - Avatar

    private var avatarSection: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(AppTheme.primary.opacity(0.12))
                    .frame(width: 140, height: 140)
                    .scaleEffect(pulseScale)

                Circle()
                    .stroke(AppTheme.primary.opacity(0.4), lineWidth: 3)
                    .frame(width: 120, height: 120)
                    .scaleEffect(avatarScale)

                if let imageUrl = profile.coachCharacter?.imageUrl, let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Image(systemName: "person.fill")
                            .font(.system(size: 44))
                            .foregroundStyle(AppTheme.primary)
                    }
                    .frame(width: 108, height: 108)
                    .clipShape(.circle)
                } else {
                    Image(systemName: "person.fill")
                        .font(.system(size: 44))
                        .foregroundStyle(AppTheme.primary)
                        .frame(width: 108, height: 108)
                        .background(AppTheme.primary.opacity(0.1), in: .circle)
                }
            }

            VStack(spacing: 4) {
                Text(profile.coachCharacter?.name ?? "Coach Alex")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(AppTheme.text)

                Text(profile.coachCharacter?.description ?? "Your Personal Motivation Coach")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)

                Text("Speaking as: \(VoiceCharacters.find(profile.preferredVoice).name)")
                    .font(.caption2.italic())
                    .foregroundStyle(AppTheme.primary)
                    .padding(.top, 2)
            }
        }
    }

    // MARK: - Status

    private var statusSection: some View {
        VStack(spacing: 12) {
            Text(statusText)
                .font(.title3.weight(.semibold))
                .foregroundStyle(AppTheme.primary)
                .multilineTextAlignment(.center)

            if isPlaying {
                Button { stopSpeaking() } label: {
                    Text("Stop Speaking")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color(hex: 0xE74C3C))
                        .padding(.horizontal, 24)
                        .padding(.vertical, 10)
                        .background(Color(hex: 0xE74C3C).opacity(0.15), in: .capsule)
                        .overlay {
                            Capsule().stroke(Color(hex: 0xE74C3C), lineWidth: 2)
                        }
                }
            }
        }
    }

    // MARK: - Record Button

    private var recordButton: some View {
        VStack(spacing: 16) {
            Button {
                if isRecording { stopRecording() } else { startRecording() }
            } label: {
                Image(systemName: isRecording ? "stop.fill" : "mic.fill")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 100, height: 100)
                    .background(isRecording ? Color(hex: 0xE74C3C) : AppTheme.primary, in: .circle)
                    .shadow(color: (isRecording ? Color(hex: 0xE74C3C) : AppTheme.primary).opacity(0.4),
                            radius: 12, y: 4)
            }
            .disabled(isProcessing || isPlaying)
            .scaleEffect(pulseScale)

            // Status indicator
            HStack(spacing: 6) {
                if isRecording {
                    Circle().fill(Color(hex: 0xE74C3C)).frame(width: 8, height: 8)
                    Text("Listening...")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color(hex: 0xE74C3C))
                } else if isProcessing {
                    ProgressView().scaleEffect(0.8)
                    Text("Processing...")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(AppTheme.primary)
                } else if isPlaying {
                    Text("Speaking...")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(AppTheme.primary)
                }
            }
            .frame(height: 24)
        }
    }

    private var instructionsSection: some View {
        Text("Tap the microphone to speak with your coach")
            .font(.footnote)
            .foregroundStyle(AppTheme.textSecondary)
            .multilineTextAlignment(.center)
    }

    private var messagePreview: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Latest Exchange")
                .font(.caption.weight(.bold))
                .foregroundStyle(AppTheme.textSecondary)
                .textCase(.uppercase)

            ForEach(messages.suffix(4)) { message in
                MessageBubble(message: message)
            }
        }
    }

    // MARK: - Logic

    private func greetIfNeeded() async {
        guard !hasGreeted else { return }
        hasGreeted = true

        let userName = profile.name.isEmpty ? "friend" : profile.name
        let coachName = profile.coachCharacter?.name ?? "Coach Alex"
        let hour = Calendar.current.component(.hour, from: Date())
        let greeting = hour < 12 ? "Good morning" : (hour < 17 ? "Good afternoon" : "Good evening")

        let greetingText = "\(greeting), \(userName)! I'm \(coachName). I'm ready to help you win today. What's on your mind?"

        messages.append(ChatMessage(text: greetingText, isUser: false))
        statusText = "Coach is greeting you..."

        if profile.voiceEnabled {
            await speak(greetingText)
        }
        statusText = "Ready to listen"
    }

    private func startRecording() {
        guard audioRecorder.hasPermission else {
            audioRecorder.requestPermission { granted in
                if !granted {
                    alertMessage = "Microphone access is required to use voice chat. Please enable it in Settings → Privacy → Microphone."
                    showAlert = true
                }
            }
            return
        }

        do {
            try audioRecorder.start()
            isRecording = true
            statusText = "Listening... Speak now!"
        } catch {
            alertMessage = "Failed to start recording: \(error.localizedDescription)"
            showAlert = true
        }
    }

    private func stopRecording() {
        isRecording = false
        isProcessing = true
        statusText = "Processing..."

        Task {
            do {
                let url = try await audioRecorder.stop()
                guard let audioURL = url else {
                    isProcessing = false
                    statusText = "Ready to listen"
                    return
                }

                // Transcribe
                let transcript = try await AudioService.shared.transcribe(audioURL: audioURL)
                let cleaned = transcript.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !cleaned.isEmpty, cleaned.count >= 1 else {
                    isProcessing = false
                    statusText = "Ready to listen"
                    alertMessage = "I couldn't detect any speech. Please speak clearly and try again."
                    showAlert = true
                    return
                }

                messages.append(ChatMessage(text: cleaned, isUser: true))
                isProcessing = false
                await getAIResponse(for: cleaned)
            } catch {
                isProcessing = false
                statusText = "Ready to listen"
                alertMessage = "Failed to process your voice: \(error.localizedDescription)"
                showAlert = true
            }
        }
    }

    private func getAIResponse(for text: String) async {
        // Check credits
        guard store.canUseAI else {
            let noCredits = "I'm sorry, but you've run out of credits. You can purchase more credits in Settings."
            messages.append(ChatMessage(text: noCredits, isUser: false))
            statusText = "Ready to listen"
            return
        }

        statusText = "Coach is thinking..."

        let userName = profile.name.isEmpty ? "friend" : profile.name
        let coachName = profile.coachCharacter?.name ?? "Coach Alex"
        let coachDesc = profile.coachCharacter?.description ?? "Energetic and motivating, perfect for daily inspiration"
        let systemPrompt = """
        You are an AI motivation coach named "\(coachName)". \(coachDesc). \
        You provide personalized, inspiring advice to help people overcome challenges and achieve their goals. \
        Key traits: warm, encouraging, empathetic. Use the user's name when provided (\(userName)). \
        Provide actionable, practical advice. Keep responses conversational and natural (2-3 sentences max). \
        Focus on building confidence, resilience, and positive mindset. Ask follow-up questions. \
        Always end with encouragement.
        """

        let turns = messages.suffix(10).map {
            AIService.Turn(role: $0.isUser ? "user" : "assistant", content: $0.text)
        }

        do {
            let reply = try await AIService.shared.complete(system: systemPrompt, turns: turns)
            _ = store.useCredit()
            messages.append(ChatMessage(text: reply, isUser: false))

            if profile.voiceEnabled {
                statusText = "Coach is speaking..."
                await speak(reply)
            }
            statusText = "Ready to listen"
        } catch {
            let fallback = "I'm having trouble connecting right now, but I'm still here to help! Could you try saying that again?"
            messages.append(ChatMessage(text: fallback, isUser: false))
            statusText = "Ready to listen"

            if profile.voiceEnabled {
                await speak(fallback)
            }
        }
    }

    private func speak(_ text: String) async {
        do {
            let player = try await AudioService.shared.synthesize(text: text, voice: profile.preferredVoice)

            await MainActor.run {
                audioPlayer = player
                player.delegate = VoiceCoachPlayerDelegate.shared
                VoiceCoachPlayerDelegate.shared.onFinish = {
                    Task { @MainActor in
                        isPlaying = false
                        statusText = "Ready to listen"
                    }
                }
                player.play()
                isPlaying = true
            }
        } catch {
            #if DEBUG
            print("[VoiceCoach] TTS failed: \(error.localizedDescription)")
            #endif
            await MainActor.run {
                alertMessage = "Voice not available. The coach response is shown as text only."
                showAlert = true
            }
        }
    }

    private func stopSpeaking() {
        audioPlayer?.stop()
        isPlaying = false
        statusText = "Ready to listen"
    }
}

// MARK: - Player Delegate

@MainActor
final class VoiceCoachPlayerDelegate: NSObject, AVAudioPlayerDelegate {
    static let shared = VoiceCoachPlayerDelegate()
    var onFinish: (() -> Void)?

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            onFinish?()
        }
    }
}

// MARK: - Recorder

/// AVFoundation audio recorder wrapper with permission handling.
@MainActor
final class VoiceCoachRecorder: NSObject, AVAudioRecorderDelegate {
    private var recorder: AVAudioRecorder?
    private(set) var hasPermission = false

    override init() {
        super.init()
        let session = AVAudioSession.sharedInstance()
        hasPermission = session.recordPermission == .granted
    }

    func requestPermission(completion: @escaping (Bool) -> Void) {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            Task { @MainActor in
                self.hasPermission = granted
                completion(granted)
            }
        }
    }

    func start() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true)

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
            AVEncoderBitRateKey: 128000,
        ]

        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("voice_coach_\(UUID().uuidString).m4a")

        recorder = try AVAudioRecorder(url: tempURL, settings: settings)
        recorder?.delegate = self
        recorder?.record()
    }

    func stop() async throws -> URL? {
        recorder?.stop()
        let url = recorder?.url
        recorder = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        return url
    }
}
