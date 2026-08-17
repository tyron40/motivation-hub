import AVFoundation
import SwiftUI

@main
struct MotivationFuelApp: App {
    @State private var library = LibraryStore()
    @State private var content = ContentStore()
    @State private var player = PlayerStore()
    @State private var chat = ChatStore()

    init() {
        configureAudioSession()
        configureAppearance()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(library)
                .environment(content)
                .environment(player)
                .environment(chat)
                .task { player.attach(library: library) }
        }
    }

    /// Allows speech audio to keep playing when the device is muted or locked.
    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        } catch {
            #if DEBUG
            print("[App] audio session setup failed: \(error.localizedDescription)")
            #endif
        }
    }

    private func configureAppearance() {
        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithOpaqueBackground()
        tabAppearance.backgroundColor = UIColor(AppTheme.card)
        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance
    }
}
