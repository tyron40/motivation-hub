import SwiftUI

/// Async image that fills its container without breaking the parent layout.
struct RemoteImage: View {
    let url: URL?
    var cornerRadius: CGFloat = 0

    var body: some View {
        Color(.secondarySystemBackground)
            .opacity(0.25)
            .overlay {
                AsyncImage(url: url, transaction: Transaction(animation: .easeOut(duration: 0.25))) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        placeholder
                    case .empty:
                        placeholder
                    @unknown default:
                        placeholder
                    }
                }
                .allowsHitTesting(false)
            }
            .clipShape(.rect(cornerRadius: cornerRadius))
    }

    private var placeholder: some View {
        ZStack {
            LinearGradient(
                colors: [AppTheme.card, AppTheme.background],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            Image(systemName: "waveform")
                .font(.title2)
                .foregroundStyle(AppTheme.textSecondary.opacity(0.5))
        }
    }
}
