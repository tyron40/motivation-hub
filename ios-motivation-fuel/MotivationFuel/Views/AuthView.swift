import AuthenticationServices
import SwiftUI

/// Landing page with Google / Apple sign-in buttons.
/// Shown when the user is not authenticated.
struct AuthView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        @Bindable var auth = auth

        ScrollView {
            VStack(spacing: 32) {
                // Hero
                VStack(spacing: 16) {
                    // App icon
                    if let icon = UIImage(named: "AppIcon") ?? UIImage(named: "icon") {
                        Image(uiImage: icon)
                            .resizable()
                            .frame(width: 120, height: 120)
                            .clipShape(.circle)
                            .overlay {
                                Circle().stroke(Color(hex: 0xFFD700), lineWidth: 4)
                                    .shadow(color: Color(hex: 0xFFD700).opacity(0.5), radius: 20)
                            }
                    } else {
                        LinearGradient(colors: [AppTheme.primary, AppTheme.secondary],
                                       startPoint: .topLeading, endPoint: .bottomTrailing)
                            .frame(width: 120, height: 120)
                            .clipShape(.circle)
                            .overlay {
                                Image(systemName: "flame.fill")
                                    .font(.system(size: 52))
                                    .foregroundStyle(.white)
                            }
                            .overlay {
                                Circle().stroke(Color(hex: 0xFFD700), lineWidth: 4)
                                    .shadow(color: Color(hex: 0xFFD700).opacity(0.5), radius: 20)
                            }
                    }

                    Text("Motivation Fuel")
                        .font(.title.weight(.heavy))
                        .foregroundStyle(.white)

                    Text("Transform your life with powerful motivational speeches, AI coaching, and scripture wisdom")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.top, 20)

                // Feature cards
                VStack(spacing: 14) {
                    featureCard(icon: "mic.fill", title: "Inspiring Speeches",
                                text: "Access thousands of motivational talks", tint: Color(hex: 0x6C5CE7))
                    featureCard(icon: "message.fill", title: "AI Voice Coach",
                                text: "Get personalized guidance anytime", tint: Color(hex: 0x00D9FF))
                    featureCard(icon: "book.fill", title: "Scripture Wisdom",
                                text: "Daily inspiration from sacred texts", tint: Color(hex: 0xFF6B6B))
                }
                .padding(.horizontal, 24)

                // Sign-in buttons
                VStack(spacing: 14) {
                    if auth.isSigningIn {
                        ProgressView()
                            .scaleEffect(1.2)
                            .tint(AppTheme.primary)
                            .frame(height: 56)
                    }

                    // Google
                    Button {
                        Task { await auth.signIn(provider: "google") }
                    } label: {
                        signInButtonContent(icon: "globe", title: "Continue with Google", tint: .white)
                    }
                    .disabled(auth.isSigningIn)

                    // Apple
                    SignInWithAppleButton(.signIn) { request in
                        request.requestedScopes = [.email, .fullName]
                    } onCompletion: { _ in
                        Task { await auth.signIn(provider: "apple") }
                    }
                    .frame(height: 56)
                    .clipShape(.rect(cornerRadius: 16))
                    .disabled(auth.isSigningIn)

                    Text("By continuing you agree to our Terms of Service and Privacy Policy")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
        .scrollIndicators(.hidden)
        .background(
            LinearGradient(colors: [Color(hex: 0x0F0F23), Color(hex: 0x1A1A2E), Color(hex: 0x16213E)],
                           startPoint: .top, endPoint: .bottom)
            .ignoresSafeArea()
        )
        .alert("Authentication Error", isPresented: $auth.showError) {
            Button("OK") {}
        } message: {
            Text(auth.errorMessage)
        }
    }

    private func featureCard(icon: String, title: String, text: String, tint: Color) -> some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(tint)
                .frame(width: 56, height: 56)
                .background(tint.opacity(0.15), in: .circle)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(.white)
                Text(text)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
            }
            Spacer()
        }
        .padding(20)
        .background(.white.opacity(0.05), in: .rect(cornerRadius: 20))
        .overlay {
            RoundedRectangle(cornerRadius: 20).stroke(.white.opacity(0.08), lineWidth: 1)
        }
    }

    private func signInButtonContent(icon: String, title: String, tint: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.body.weight(.semibold))
            Text(title)
                .font(.body.weight(.semibold))
        }
        .foregroundStyle(tint)
        .frame(maxWidth: .infinity)
        .frame(height: 56)
        .background(.white.opacity(0.08), in: .rect(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.15), lineWidth: 1)
        }
    }
}
