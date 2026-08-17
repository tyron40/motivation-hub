import SwiftUI

/// Square category tile shown in the home carousel.
struct CategoryTileView: View {
    let category: SpeechCategory

    var body: some View {
        let tint = Color(hexString: category.colorHex)

        VStack(spacing: 10) {
            Image(systemName: category.symbol)
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
                .background(tint, in: .circle)

            Text(category.name)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(AppTheme.text)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.85)
        }
        .frame(width: 112, height: 118)
        .padding(8)
        .background(tint.opacity(0.16), in: .rect(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18)
                .stroke(tint.opacity(0.28), lineWidth: 1)
        }
    }
}
