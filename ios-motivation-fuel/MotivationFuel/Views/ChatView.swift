import SwiftUI

struct ChatView: View {
    @Environment(ChatStore.self) private var chat
    @Environment(LibraryStore.self) private var library

    @State private var draft = ""
    @FocusState private var isInputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 14) {
                            if chat.messages.isEmpty {
                                welcomeCard
                                suggestionCards
                            }

                            ForEach(chat.messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }

                            if chat.isThinking {
                                thinkingBubble
                                    .id("thinking")
                            }

                            if let error = chat.errorMessage {
                                Text(error)
                                    .font(.caption)
                                    .foregroundStyle(Color(hex: 0xEF4444))
                                    .padding(.horizontal, 4)
                            }
                        }
                        .padding(.horizontal)
                        .padding(.top, 8)
                        .padding(.bottom, 20)
                    }
                    .scrollIndicators(.hidden)
                    .onChange(of: chat.messages.count) { _, _ in
                        withAnimation(.easeOut(duration: 0.25)) {
                            proxy.scrollTo(chat.messages.last?.id, anchor: .bottom)
                        }
                    }
                    .onChange(of: chat.isThinking) { _, thinking in
                        if thinking {
                            withAnimation { proxy.scrollTo("thinking", anchor: .bottom) }
                        }
                    }
                }

                inputBar
            }
            .background(AppTheme.screenGradient.ignoresSafeArea())
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            Image(systemName: "bolt.heart.fill")
                .font(.footnote.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(
                    LinearGradient(colors: [AppTheme.primary, Color(hex: 0x8B5CF6)],
                                   startPoint: .topLeading, endPoint: .bottomTrailing),
                    in: .circle
                )

            VStack(alignment: .leading, spacing: 1) {
                Text("AI Coach")
                    .font(.headline)
                    .foregroundStyle(AppTheme.text)
                Text(chat.isThinking ? "Thinking…" : "Ready when you are")
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
            }

            Spacer()

            Button {
                chat.startNewConversation()
            } label: {
                Image(systemName: "square.and.pencil")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(AppTheme.primary)
                    .frame(width: 44, height: 44)
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 6)
    }

    private var welcomeCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Hey \(library.displayName) 👋")
                .font(.title3.weight(.bold))
                .foregroundStyle(AppTheme.text)
            Text("I'm your motivation coach. Tell me what you're working on, what's holding you back, or ask for a push. I'll keep it short and give you one thing to do today.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.card.opacity(0.6), in: .rect(cornerRadius: 20))
        .overlay {
            RoundedRectangle(cornerRadius: 20).stroke(AppTheme.primary.opacity(0.2), lineWidth: 1)
        }
    }

    private var suggestionCards: some View {
        VStack(spacing: 10) {
            ForEach(ChatStore.suggestions, id: \.self) { suggestion in
                Button {
                    Task { await chat.send(suggestion) }
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "sparkles")
                            .font(.footnote)
                            .foregroundStyle(AppTheme.primary)
                        Text(suggestion)
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.text)
                            .multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                    }
                    .padding(14)
                    .background(.white.opacity(0.06), in: .rect(cornerRadius: 16))
                    .overlay {
                        RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.08), lineWidth: 1)
                    }
                }
                .buttonStyle(PressableCardStyle())
            }
        }
    }

    private var thinkingBubble: some View {
        HStack(spacing: 6) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(AppTheme.textSecondary)
                    .frame(width: 7, height: 7)
                    .phaseAnimator([0.4, 1.0]) { view, phase in
                        view.opacity(phase)
                    } animation: { _ in
                        .easeInOut(duration: 0.5).delay(Double(index) * 0.15)
                    }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(AppTheme.card, in: .rect(cornerRadius: 18))
    }

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Ask your coach anything…", text: $draft, axis: .vertical)
                .lineLimit(1...4)
                .focused($isInputFocused)
                .foregroundStyle(AppTheme.text)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(.white.opacity(0.08), in: .rect(cornerRadius: 22))
                .overlay {
                    RoundedRectangle(cornerRadius: 22).stroke(.white.opacity(0.12), lineWidth: 1)
                }

            Button {
                let text = draft
                draft = ""
                isInputFocused = false
                Task { await chat.send(text) }
            } label: {
                Image(systemName: "arrow.up")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(canSend ? AppTheme.primary : AppTheme.card, in: .circle)
            }
            .disabled(!canSend)
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
    }

    private var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !chat.isThinking
    }
}

private struct MessageBubble: View {
    let message: ChatMessage

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if message.isUser { Spacer(minLength: 44) }

            Text(message.text)
                .font(.subheadline)
                .foregroundStyle(message.isUser ? .white : AppTheme.text)
                .padding(.horizontal, 15)
                .padding(.vertical, 12)
                .background {
                    if message.isUser {
                        LinearGradient(colors: [AppTheme.primary, AppTheme.gradientStart],
                                       startPoint: .topLeading, endPoint: .bottomTrailing)
                    } else {
                        AppTheme.card
                    }
                }
                .clipShape(.rect(cornerRadius: 18))
                .frame(maxWidth: .infinity, alignment: message.isUser ? .trailing : .leading)
                .textSelection(.enabled)

            if !message.isUser { Spacer(minLength: 44) }
        }
        .transition(.opacity.combined(with: .move(edge: .bottom)))
    }
}
