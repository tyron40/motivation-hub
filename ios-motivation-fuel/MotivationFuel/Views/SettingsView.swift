import SwiftUI

struct SettingsView: View {
    @Environment(LibraryStore.self) private var library
    @Environment(ChatStore.self) private var chat
    @Environment(AuthManager.self) private var auth
    @Environment(StoreManager.self) private var store
    @Environment(UserProfileStore.self) private var profile

    @State private var draftName = ""
    @State private var showNameEditor = false
    @State private var showVoicePicker = false
    @State private var showPaywall = false
    @State private var showSignOutConfirm = false

    var body: some View {
        @Bindable var library = library
        @Bindable var profile = profile

        List {
            // MARK: - Profile
            Section("Profile") {
                Button {
                    draftName = profile.name.isEmpty ? library.displayName : profile.name
                    showNameEditor = true
                } label: {
                    settingRow(symbol: "person.fill", title: "Name",
                               value: profile.name.isEmpty ? library.displayName : profile.name)
                }

                if let email = auth.user?.email {
                    settingRow(symbol: "envelope.fill", title: "Email", value: email)
                }
            }

            // MARK: - AI Credits
            Section("AI Credits") {
                Button {
                    showPaywall = true
                } label: {
                    settingRow(symbol: "bolt.fill", title: "Credits Balance",
                               value: "\(store.credits) credits")
                }

                settingRow(symbol: "crown.fill", title: "Premium Status",
                           value: store.isPremium ? "Active" : "Not Premium")
            }

            // MARK: - Voice Coach
            Section("Voice Coach") {
                Button {
                    showVoicePicker = true
                } label: {
                    settingRow(symbol: "waveform", title: "Coach Voice",
                               value: VoiceCharacters.find(profile.preferredVoice).name)
                }

                Toggle(isOn: $profile.voiceEnabled) {
                    settingLabel(symbol: "speaker.wave.2.fill", title: "Voice Enabled",
                                 subtitle: profile.voiceEnabled ? "On" : "Off")
                }
                .tint(AppTheme.primary)
            }

            // MARK: - Content
            Section("Content") {
                Toggle(isOn: $library.includeChurchMotivation) {
                    settingLabel(symbol: "building.columns.fill", title: "Christian Motivation",
                                 subtitle: library.includeChurchMotivation ? "Showing on home page" : "Hidden")
                }
                .tint(AppTheme.primary)
            }

            // MARK: - App Settings
            Section("App Settings") {
                Toggle(isOn: $library.notificationsEnabled) {
                    settingLabel(symbol: "bell.fill", title: "Notifications",
                                 subtitle: library.notificationsEnabled ? "Enabled" : "Disabled")
                }
                .tint(AppTheme.primary)

                Button {
                    chat.startNewConversation()
                } label: {
                    settingLabel(symbol: "trash.fill", title: "Clear AI Chat History",
                                 subtitle: "Start fresh with your coach")
                }
            }

            // MARK: - Your Stats
            Section("Your Stats") {
                settingRow(symbol: "headphones", title: "Time Listened", value: library.listeningTimeLabel)
                settingRow(symbol: "flame.fill", title: "Day Streak", value: "\(library.streak)")
                settingRow(symbol: "heart.fill", title: "Favorites", value: "\(library.favorites.count)")
            }

            // MARK: - Account
            Section("Account") {
                Button(role: .destructive) {
                    showSignOutConfirm = true
                } label: {
                    settingLabel(symbol: "rectangle.portrait.and.arrow.right", title: "Sign Out",
                                 subtitle: "Log out of your account")
                }
            }

            // MARK: - About
            Section("About") {
                settingRow(symbol: "info.circle.fill", title: "Version", value: appVersion)
                Link(destination: URL(string: "https://www.youtube.com/@MotivationFuel")!) {
                    settingLabel(symbol: "play.rectangle.fill", title: "Content Source",
                                 subtitle: "Speeches streamed from YouTube")
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(AppTheme.screenGradient.ignoresSafeArea())
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Your Name", isPresented: $showNameEditor) {
            TextField("Name", text: $draftName)
            Button("Cancel", role: .cancel) {}
            Button("Save") {
                let trimmed = draftName.trimmingCharacters(in: .whitespaces)
                if !trimmed.isEmpty { profile.name = trimmed; library.displayName = trimmed }
            }
        }
        .confirmationDialog("Sign Out?", isPresented: $showSignOutConfirm) {
            Button("Sign Out", role: .destructive) {
                Task { await auth.signOut() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to sign out?")
        }
        .sheet(isPresented: $showVoicePicker) {
            VoicePickerSheet()
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView()
        }
    }

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }

    private func settingRow(symbol: String, title: String, value: String) -> some View {
        HStack {
            Image(systemName: symbol)
                .foregroundStyle(AppTheme.primary)
                .frame(width: 26)
            Text(title)
                .foregroundStyle(AppTheme.text)
            Spacer()
            Text(value)
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
        }
    }

    private func settingLabel(symbol: String, title: String, subtitle: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: symbol)
                .foregroundStyle(AppTheme.primary)
                .frame(width: 26)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .foregroundStyle(AppTheme.text)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
    }
}

// MARK: - Voice Picker Sheet (shared with VoiceCoachView)

struct VoicePickerSheet: View {
    @Environment(UserProfileStore.self) private var profile

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(VoiceCharacters.all) { voice in
                        Button {
                            profile.preferredVoice = voice.id
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(voice.name)
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(profile.preferredVoice == voice.id ? AppTheme.primary : AppTheme.text)
                                    Text(voice.description)
                                        .font(.caption)
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                                Spacer()
                                if profile.preferredVoice == voice.id {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(AppTheme.primary)
                                }
                            }
                            .padding(16)
                            .background(profile.preferredVoice == voice.id ? AppTheme.primary.opacity(0.12) : AppTheme.card.opacity(0.5),
                                        in: .rect(cornerRadius: 14))
                            .overlay {
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(profile.preferredVoice == voice.id ? AppTheme.primary.opacity(0.4) : .clear, lineWidth: 2)
                            }
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }
            .scrollIndicators(.hidden)
            .background(AppTheme.screenGradient.ignoresSafeArea())
            .navigationTitle("Choose Voice")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
