import SwiftUI

struct PlaylistsView: View {
    @Environment(LibraryStore.self) private var library

    @State private var showCreateSheet = false
    @State private var newName = ""

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                if library.playlists.isEmpty {
                    emptyState
                } else {
                    ForEach(library.playlists) { playlist in
                        NavigationLink {
                            PlaylistDetailView(playlist: playlist)
                        } label: {
                            playlistRow(playlist)
                        }
                        .buttonStyle(PressableCardStyle())
                        .contextMenu {
                            Button(role: .destructive) {
                                library.deletePlaylist(playlist)
                            } label: {
                                Label("Delete Playlist", systemImage: "trash")
                            }
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)
            .padding(.bottom, 130)
        }
        .scrollIndicators(.hidden)
        .background(AppTheme.screenGradient.ignoresSafeArea())
        .navigationTitle("My Playlists")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showCreateSheet = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .alert("New Playlist", isPresented: $showCreateSheet) {
            TextField("Playlist name", text: $newName)
            Button("Cancel", role: .cancel) { newName = "" }
            Button("Create") {
                let name = newName.trimmingCharacters(in: .whitespaces)
                if !name.isEmpty { library.createPlaylist(named: name) }
                newName = ""
            }
        }
    }

    private func playlistRow(_ playlist: Playlist) -> some View {
        HStack(spacing: 14) {
            Image(systemName: "music.note.list")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 46, height: 46)
                .background(Color(hexString: playlist.colorHex), in: .rect(cornerRadius: 14))

            VStack(alignment: .leading, spacing: 3) {
                Text(playlist.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(AppTheme.text)
                Text("\(playlist.speechIds.count) \(playlist.speechIds.count == 1 ? "speech" : "speeches")")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(AppTheme.textSecondary)
        }
        .padding(14)
        .background(AppTheme.card.opacity(0.55), in: .rect(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.06), lineWidth: 1)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "music.note.list")
                .font(.system(size: 40))
                .foregroundStyle(AppTheme.primary)
                .frame(width: 96, height: 96)
                .background(AppTheme.primary.opacity(0.14), in: .circle)

            Text("No Playlists Yet")
                .font(.title3.weight(.bold))
                .foregroundStyle(AppTheme.text)

            Text("Create a playlist and save the speeches that move you.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button {
                showCreateSheet = true
            } label: {
                Text("Create Playlist")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(AppTheme.primary, in: .capsule)
            }
        }
        .padding(.top, 70)
    }
}

struct PlaylistDetailView: View {
    let playlist: Playlist

    @Environment(LibraryStore.self) private var library
    @Environment(PlayerStore.self) private var player

    private var speeches: [Speech] {
        library.speeches(in: playlist)
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                if speeches.isEmpty {
                    ContentUnavailableView(
                        "Playlist is empty",
                        systemImage: "music.note",
                        description: Text("Add speeches from the player's Playlist button.")
                    )
                    .padding(.top, 60)
                } else {
                    ForEach(speeches) { speech in
                        SpeechRow(
                            speech: speech,
                            isFavorite: library.isFavorite(speech),
                            onPlay: { player.play(speech, in: speeches) },
                            onFavorite: { library.toggleFavorite(speech) }
                        )
                        .contextMenu {
                            Button(role: .destructive) {
                                library.removeFromPlaylist(playlist.id, speechId: speech.id)
                            } label: {
                                Label("Remove", systemImage: "minus.circle")
                            }
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)
            .padding(.bottom, 130)
        }
        .scrollIndicators(.hidden)
        .background(AppTheme.screenGradient.ignoresSafeArea())
        .navigationTitle(playlist.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
