import SwiftUI

struct ContentView: View {
    @Environment(PlayerStore.self) private var player

    var body: some View {
        @Bindable var player = player

        TabView {
            Tab("Home", systemImage: "house.fill") {
                HomeView()
            }
            Tab("Scripture", systemImage: "book.fill") {
                ScriptureView()
            }
            Tab("AI Chat", systemImage: "message.fill") {
                ChatView()
            }
            Tab("Profile", systemImage: "person.fill") {
                ProfileView()
            }
        }
        .tint(AppTheme.primary)
        .safeAreaInset(edge: .bottom) {
            MiniPlayerView()
                .animation(.spring(response: 0.35, dampingFraction: 0.85), value: player.currentSpeech)
        }
        .fullScreenCover(isPresented: $player.isPlayerPresented) {
            PlayerView()
        }
        .preferredColorScheme(.dark)
    }
}

#Preview {
    ContentView()
        .environment(ContentStore())
        .environment(LibraryStore())
        .environment(PlayerStore())
        .environment(ChatStore())
        .environment(AuthManager())
        .environment(StoreManager())
        .environment(UserProfileStore())
}
