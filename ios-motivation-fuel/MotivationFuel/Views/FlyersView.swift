import SwiftUI

/// Grid of every motivational flyer.
struct FlyersView: View {
    @State private var selectedFlyer: Flyer?

    private let columns = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14),
    ]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 14) {
                ForEach(AppData.flyers) { flyer in
                    Button {
                        selectedFlyer = flyer
                    } label: {
                        GridFlyerCard(flyer: flyer)
                    }
                    .buttonStyle(PressableCardStyle())
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)
            .padding(.bottom, 130)
        }
        .scrollIndicators(.hidden)
        .background(AppTheme.screenGradient.ignoresSafeArea())
        .navigationTitle("Motivation Flyers")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $selectedFlyer) { flyer in
            FlyerPreview(flyer: flyer)
        }
    }
}

private struct GridFlyerCard: View {
    let flyer: Flyer

    var body: some View {
        let accent = Color(hexString: flyer.accentHex)

        Color.black
            .frame(height: 240)
            .overlay {
                AsyncImage(url: URL(string: flyer.imageUrl)) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    LinearGradient(colors: [accent.opacity(0.4), .black], startPoint: .top, endPoint: .bottom)
                }
                .allowsHitTesting(false)
            }
            .overlay(alignment: .bottom) {
                LinearGradient(colors: [.clear, .black.opacity(0.9)], startPoint: .center, endPoint: .bottom)
                    .allowsHitTesting(false)
            }
            .overlay(alignment: .bottomLeading) {
                VStack(alignment: .leading, spacing: 6) {
                    Rectangle()
                        .fill(accent)
                        .frame(width: 26, height: 3)
                        .clipShape(.capsule)
                    Text(flyer.title)
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
                .padding(12)
                .allowsHitTesting(false)
            }
            .clipShape(.rect(cornerRadius: 16))
    }
}
