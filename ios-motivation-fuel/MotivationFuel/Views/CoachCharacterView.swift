import SwiftUI

/// Coach character selection grid with DiceBear avatars.
struct CoachCharacterView: View {
    @Environment(UserProfileStore.self) private var profile
    @Environment(\.dismiss) private var dismiss

    @State private var selectedID: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header card
                HStack(spacing: 12) {
                    LinearGradient(colors: [AppTheme.primary, AppTheme.secondary],
                                   startPoint: .topLeading, endPoint: .bottomTrailing)
                        .frame(width: 40, height: 40)
                        .clipShape(.circle)
                        .overlay {
                            Image(systemName: "sparkles")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(.white)
                        }

                    Text("Choose Your Coach")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(AppTheme.text)

                    Spacer()

                    Button {
                        dismiss()
                    } label: {
                        Text("Done")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(AppTheme.primary, in: .capsule)
                    }
                }
                .padding(.horizontal, 4)

                // Character grid
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 16), GridItem(.flexible(), spacing: 16)],
                          spacing: 16) {
                    ForEach(CoachCharacters.presets) { character in
                        characterCard(character)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 130)
        }
        .scrollIndicators(.hidden)
        .background(AppTheme.screenGradient.ignoresSafeArea())
        .onAppear {
            selectedID = profile.coachCharacter?.id ?? CoachCharacters.default.id
        }
    }

    private func characterCard(_ character: CoachCharacter) -> some View {
        let isSelected = selectedID == character.id

        return Button {
            selectedID = character.id
            profile.coachCharacter = character
        } label: {
            VStack(spacing: 12) {
                ZStack(alignment: .topTrailing) {
                    if let url = URL(string: character.imageUrl) {
                        AsyncImage(url: url) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Circle().fill(AppTheme.card)
                                .overlay {
                                    Image(systemName: "person.fill")
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                        }
                        .frame(width: 80, height: 80)
                        .clipShape(.circle)
                        .overlay {
                            Circle().stroke(isSelected ? AppTheme.primary : .clear, lineWidth: 3)
                        }
                    }

                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(AppTheme.primary)
                            .background(Circle().fill(AppTheme.background).frame(width: 22, height: 22))
                            .offset(x: 4, y: -4)
                    }
                }

                Text(character.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(isSelected ? AppTheme.primary : AppTheme.text)
                    .multilineTextAlignment(.center)

                Text(character.description)
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(16)
            .frame(maxWidth: .infinity)
            .background(
                isSelected ? AppTheme.primary.opacity(0.12) : AppTheme.card.opacity(0.5),
                in: .rect(cornerRadius: 16)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isSelected ? AppTheme.primary.opacity(0.4) : .white.opacity(0.06), lineWidth: 2)
            }
        }
        .buttonStyle(PressableCardStyle())
    }
}
