import AVFoundation
import RevenueCat
import SwiftUI

@main
struct MotivationFuelApp: App {
    @State private var library = LibraryStore()
    @State private var content = ContentStore()
    @State private var player = PlayerStore()
    @State private var chat = ChatStore()
    @State private var auth = AuthManager()
    @State private var store = StoreManager()
    @State private var profile = UserProfileStore()

    init() {
        configureAudioSession()
        configureAppearance()
        store.configure()
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if auth.isLoading {
                    LaunchScreen()
                } else if auth.user == nil {
                    AuthView()
                } else {
                    ContentView()
                }
            }
            .environment(library)
            .environment(content)
            .environment(player)
            .environment(chat)
            .environment(auth)
            .environment(store)
            .environment(profile)
            .task {
                profile.syncWith(auth: auth)
                player.attach(library: library)
            }
            .preferredColorScheme(.dark)
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

/// Simple launch screen shown while auth state is being determined.
private struct LaunchScreen: View {
    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(hex: 0x0F0F23), Color(hex: 0x1A1A2E)],
                           startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()

            VStack(spacing: 16) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(AppTheme.primary)
                ProgressView()
                    .tint(AppTheme.primary)
            }
        }
    }
}
