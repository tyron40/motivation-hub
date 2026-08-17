import SwiftUI

struct SettingsView: View {
    @Environment(LibraryStore.self) private var library
    @Environment(ChatStore.self) private var chat

    @State private var draftName = ""
    @State private var showNameEditor = false

    var body: some View {
        @Bindable var library = library

        List {
            Section("Profile") {
                Button {
                    draftName = library.displayName
                    showNameEditor = true
                } label: {
                    settingRow(symbol: "person.fill", title: "Name", value: library.displayName)
                }
            }

            Section("Content") {
                Toggle(isOn: $library.includeChurchMotivation) {
                    settingLabel(symbol: "building.columns.fill", title: "Christian Motivation",
                                 subtitle: "Show the faith-based category")
                }
                .tint(AppTheme.primary)
            }

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

            Section("Your Stats") {
                settingRow(symbol: "headphones", title: "Time Listened", value: library.listeningTimeLabel)
                settingRow(symbol: "flame.fill", title: "Day Streak", value: "\(library.streak)")
                settingRow(symbol: "heart.fill", title: "Favorites", value: "\(library.favorites.count)")
            }

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
                if !trimmed.isEmpty { library.displayName = trimmed }
            }
        }
    }

    private var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        return version
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
