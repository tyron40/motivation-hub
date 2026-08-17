import SwiftUI

/// Section title with an optional trailing "see all" action.
struct SectionHeader: View {
    let title: String
    var symbol: String?
    var symbolTint: Color = AppTheme.primary
    var actionLabel: String?
    var action: (() -> Void)?

    var body: some View {
        HStack(spacing: 8) {
            if let symbol {
                Image(systemName: symbol)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(symbolTint)
            }

            Text(title)
                .font(.headline)
                .foregroundStyle(AppTheme.text)

            Spacer()

            if let actionLabel, let action {
                Button(action: action) {
                    HStack(spacing: 3) {
                        Text(actionLabel)
                            .font(.subheadline.weight(.semibold))
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.bold))
                    }
                    .foregroundStyle(AppTheme.primary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal)
    }
}

/// Centered section title used for the featured / categories rows.
struct CenteredSectionTitle: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.headline)
            .foregroundStyle(AppTheme.text)
            .frame(maxWidth: .infinity)
            .padding(.horizontal)
    }
}
