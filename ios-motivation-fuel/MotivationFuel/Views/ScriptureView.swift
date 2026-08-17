import SwiftUI

struct ScriptureView: View {
    @Environment(LibraryStore.self) private var library

    @State private var searchText = ""
    @State private var selectedCategory = "All"
    @State private var favoritesOnly = false
    @State private var generated: [Scripture] = []
    @State private var isGenerating = false
    @State private var insights: [String: InsightState] = [:]

    private struct InsightState {
        var text: String = ""
        var isLoading = false
        var errorMessage: String?
    }

    private var filtered: [Scripture] {
        let pool = ScriptureData.all + generated
        return pool.filter { scripture in
            let matchesSearch = searchText.isEmpty
                || scripture.verse.localizedStandardContains(searchText)
                || scripture.reference.localizedStandardContains(searchText)
            let matchesCategory = selectedCategory == "All" || scripture.category == selectedCategory
            let matchesFavorites = !favoritesOnly || library.isFavoriteScripture(scripture)
            return matchesSearch && matchesCategory && matchesFavorites
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                header
                searchBar
                categoryChips

                if filtered.isEmpty {
                    emptyState
                } else {
                    scriptureList
                }
            }
            .background(AppTheme.screenGradient.ignoresSafeArea())
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            HStack(spacing: 12) {
                Image(systemName: "book.fill")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(
                        LinearGradient(colors: [Color(hex: 0x8B5CF6), Color(hex: 0xEC4899)],
                                       startPoint: .topLeading, endPoint: .bottomTrailing),
                        in: .circle
                    )

                Text("Sacred Words")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(AppTheme.text)
            }

            Spacer()

            Button {
                favoritesOnly.toggle()
            } label: {
                Image(systemName: "line.3.horizontal.decrease.circle\(favoritesOnly ? ".fill" : "")")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(favoritesOnly ? AppTheme.primary : AppTheme.textSecondary)
                    .frame(width: 44, height: 44)
            }
        }
        .padding(.horizontal)
    }

    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(AppTheme.primary)

            TextField("Search verses, references...", text: $searchText)
                .foregroundStyle(AppTheme.text)
                .autocorrectionDisabled()

            if !searchText.isEmpty {
                Button {
                    searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(AppTheme.textSecondary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(.white.opacity(0.1), in: .rect(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.18), lineWidth: 1)
        }
        .padding(.horizontal)
    }

    private var categoryChips: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 10) {
                ForEach(ScriptureData.categories, id: \.self) { category in
                    let isActive = selectedCategory == category
                    Button {
                        withAnimation(.easeOut(duration: 0.2)) { selectedCategory = category }
                    } label: {
                        Text(category)
                            .font(.subheadline.weight(isActive ? .bold : .semibold))
                            .foregroundStyle(isActive ? .white : AppTheme.textSecondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background {
                                if isActive {
                                    AppTheme.scriptureGradient(category)
                                } else {
                                    Color.white.opacity(0.1)
                                }
                            }
                            .clipShape(.capsule)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .scrollIndicators(.hidden)
        .contentMargins(.horizontal, 16, for: .scrollContent)
    }

    private var scriptureList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(filtered) { scripture in
                    scriptureCard(scripture)
                }

                if selectedCategory != "All" {
                    generateMoreButton
                }
            }
            .padding(.horizontal)
            .padding(.top, 4)
            .padding(.bottom, 130)
        }
        .scrollIndicators(.hidden)
    }

    private func scriptureCard(_ scripture: Scripture) -> some View {
        let tint = AppTheme.scriptureColor(scripture.category)
        let isFavorite = library.isFavoriteScripture(scripture)
        let insight = insights[scripture.id]

        return VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 14) {
                Image(systemName: "quote.opening")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(AppTheme.scriptureGradient(scripture.category), in: .circle)

                Text(scripture.reference)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(AppTheme.text)

                Circle()
                    .fill(tint)
                    .frame(width: 6, height: 6)

                Spacer()

                Button {
                    library.toggleFavoriteScripture(scripture)
                } label: {
                    Image(systemName: isFavorite ? "star.fill" : "heart")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(isFavorite ? AppTheme.accent : AppTheme.textSecondary)
                        .frame(width: 38, height: 38)
                        .background(.white.opacity(0.08), in: .rect(cornerRadius: 12))
                }
                .buttonStyle(.plain)

                ShareLink(item: "\"\(scripture.verse)\"\n\n\(scripture.reference)\n\nShared from Motivation Fuel") {
                    Image(systemName: "square.and.arrow.up")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(width: 38, height: 38)
                        .background(.white.opacity(0.08), in: .rect(cornerRadius: 12))
                }
            }

            HStack(alignment: .top, spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.caption)
                    .foregroundStyle(tint.opacity(0.75))
                    .padding(.top, 4)

                Text("\"\(scripture.verse)\"")
                    .font(.system(size: 17, design: .serif))
                    .italic()
                    .foregroundStyle(AppTheme.text)
                    .lineSpacing(5)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack {
                Text(scripture.category)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(AppTheme.scriptureGradient(scripture.category), in: .capsule)

                Spacer()

                Button {
                    Task { await loadInsight(for: scripture) }
                } label: {
                    HStack(spacing: 6) {
                        if insight?.isLoading == true {
                            ProgressView().controlSize(.small).tint(AppTheme.primary)
                        } else {
                            Image(systemName: "wand.and.stars")
                                .font(.footnote)
                            Text("Inspire")
                                .font(.footnote.weight(.semibold))
                        }
                    }
                    .foregroundStyle(AppTheme.text)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(.white.opacity(0.08), in: .rect(cornerRadius: 14))
                    .overlay {
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(AppTheme.primary.opacity(0.4), lineWidth: 1)
                    }
                }
                .buttonStyle(.plain)
                .disabled(insight?.isLoading == true)
            }

            if let text = insight?.text, !text.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Motivational Insight")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(AppTheme.text)
                    Text(text)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.text.opacity(0.9))
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.white.opacity(0.06), in: .rect(cornerRadius: 16))
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            if let error = insight?.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(Color(hex: 0xEF4444))
            }
        }
        .padding(20)
        .background(
            LinearGradient(colors: [.white.opacity(0.12), .white.opacity(0.04)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(.rect(cornerRadius: 24))
        .overlay {
            RoundedRectangle(cornerRadius: 24).stroke(.white.opacity(0.14), lineWidth: 1)
        }
    }

    private var generateMoreButton: some View {
        Button {
            Task { await generateMore() }
        } label: {
            VStack(spacing: 4) {
                if isGenerating {
                    ProgressView().tint(.white)
                } else {
                    Image(systemName: "chevron.down")
                        .font(.body.weight(.bold))
                    Text("Generate More Scriptures")
                        .font(.subheadline.weight(.semibold))
                    Text("Powered by AI • \(selectedCategory)")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.8))
                }
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(
                LinearGradient(colors: [AppTheme.primary, AppTheme.accent],
                               startPoint: .leading, endPoint: .trailing)
            )
            .clipShape(.rect(cornerRadius: 20))
        }
        .buttonStyle(PressableCardStyle())
        .disabled(isGenerating)
        .padding(.top, 6)
    }

    private var emptyState: some View {
        VStack(spacing: 18) {
            Spacer()
            Image(systemName: "book.closed.fill")
                .font(.system(size: 42))
                .foregroundStyle(AppTheme.primary)
                .frame(width: 88, height: 88)
                .background(
                    LinearGradient(colors: [Color(hex: 0x8B5CF6).opacity(0.2), Color(hex: 0xEC4899).opacity(0.2)],
                                   startPoint: .topLeading, endPoint: .bottomTrailing),
                    in: .circle
                )

            Text("No verses found")
                .font(.title3.weight(.bold))
                .foregroundStyle(AppTheme.text)

            Text(favoritesOnly
                 ? "You haven't favorited any verses yet"
                 : "Try adjusting your search or category filter")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
            Spacer()
        }
    }

    // MARK: - AI actions

    private func loadInsight(for scripture: Scripture) async {
        insights[scripture.id, default: InsightState()].isLoading = true
        insights[scripture.id]?.errorMessage = nil
        do {
            let text = try await AIService.shared.scriptureInsight(for: scripture)
            withAnimation(.easeOut(duration: 0.25)) {
                insights[scripture.id] = InsightState(text: text, isLoading: false)
            }
        } catch {
            insights[scripture.id]?.isLoading = false
            insights[scripture.id]?.errorMessage = error.localizedDescription
        }
    }

    private func generateMore() async {
        isGenerating = true
        defer { isGenerating = false }
        let created = (try? await AIService.shared.generateScriptures(category: selectedCategory)) ?? []
        withAnimation(.easeOut(duration: 0.25)) {
            generated.append(contentsOf: created)
        }
    }
}
