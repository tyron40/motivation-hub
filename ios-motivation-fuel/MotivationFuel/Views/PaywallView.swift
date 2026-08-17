import RevenueCat
import SwiftUI

/// Full-screen paywall with credit packs and premium subscriptions.
struct PaywallView: View {
    @Environment(StoreManager.self) private var store
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 28) {
                    statusCard

                    // AI Credits section
                    sectionHeader(icon: "sparkles", title: "AI Credits",
                                  subtitle: "Use credits for AI chat and voice interactions") {
                        VStack(spacing: 12) {
                            ForEach(IAPCatalog.creditProducts) { product in
                                creditCard(product)
                            }
                        }
                    }

                    // Premium section
                    sectionHeader(icon: "shield.fill", title: "Premium — Ad Free",
                                  subtitle: "Remove all ads for a seamless experience") {
                        VStack(spacing: 12) {
                            ForEach(IAPCatalog.premiumProducts) { product in
                                premiumCard(product)
                            }
                        }
                    }

                    // Disclaimer
                    VStack(alignment: .leading, spacing: 6) {
                        Text("How It Works")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(AppTheme.text)
                        Text("• Credits are used for AI chat and voice interactions\n• Premium removes all ads from the app\n• All content remains freely accessible\n• YouTube videos remain unchanged")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                    .padding(16)
                    .background(AppTheme.card.opacity(0.5), in: .rect(cornerRadius: 14))
                    .overlay {
                        RoundedRectangle(cornerRadius: 14).stroke(.white.opacity(0.06), lineWidth: 1)
                    }

                    // Restore
                    Button {
                        Task { await store.restore() }
                    } label: {
                        HStack(spacing: 8) {
                            if store.isRestoring {
                                ProgressView().scaleEffect(0.8)
                            } else {
                                Image(systemName: "arrow.clockwise")
                            }
                            Text("Restore Purchases")
                                .font(.subheadline.weight(.semibold))
                        }
                        .foregroundStyle(auth.user != nil ? AppTheme.primary : AppTheme.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(AppTheme.card.opacity(0.5), in: .rect(cornerRadius: 12))
                    }
                    .disabled(store.isRestoring || auth.user == nil)

                    // Footer links
                    HStack(spacing: 8) {
                        Link("Terms of Service", destination: URL(string: "https://rork.com/terms")!)
                        Text("•").foregroundStyle(AppTheme.textSecondary)
                        Link("Privacy Policy", destination: URL(string: "https://rork.com/privacy")!)
                    }
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
                    .padding(.bottom, 20)
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
            }
            .scrollIndicators(.hidden)
            .background(AppTheme.screenGradient.ignoresSafeArea())
            .navigationTitle("Upgrade")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }
            }
            .alert("Purchase Error", isPresented: .init(
                get: { store.errorMessage != nil },
                set: { if !$0 { store.errorMessage = nil } }
            )) {
                Button("OK") { store.errorMessage = nil }
            } message: {
                Text(store.errorMessage ?? "")
            }
        }
    }

    // MARK: - Status Card

    private var statusCard: some View {
        HStack {
            VStack(spacing: 6) {
                Image(systemName: "bolt.fill")
                    .font(.title2)
                    .foregroundStyle(AppTheme.primary)
                Text("AI Credits")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(AppTheme.textSecondary)
                Text("\(store.credits)")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(AppTheme.text)
            }
            .frame(maxWidth: .infinity)

            if store.isPremium {
                Divider().frame(height: 50)
                VStack(spacing: 6) {
                    Image(systemName: "shield.fill")
                        .font(.title2)
                        .foregroundStyle(Color(hex: 0x10B981))
                    Text("Status")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(AppTheme.textSecondary)
                    Text("Premium")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(AppTheme.text)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(20)
        .background(AppTheme.card.opacity(0.55), in: .rect(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.08), lineWidth: 1)
        }
    }

    // MARK: - Section Builder

    private func sectionHeader<Content: View>(icon: String, title: String, subtitle: String,
                                              @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(AppTheme.primary)
                Text(title)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(AppTheme.text)
            }
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)

            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Product Cards

    private func creditCard(_ product: IAPProduct) -> some View {
        let requiresAuth = auth.user == nil
        return Button {
            Task { await store.purchase(productID: product.id) }
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                if let badge = product.badge {
                    Text(badge)
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(AppTheme.primary, in: .capsule)
                        .aligning(.topTrailing)
                }

                HStack(spacing: 14) {
                    Image(systemName: "bolt.fill")
                        .font(.title2)
                        .foregroundStyle(AppTheme.primary)
                        .frame(width: 44, height: 44)
                        .background(AppTheme.primary.opacity(0.12), in: .rect(cornerRadius: 12))

                    VStack(alignment: .leading, spacing: 3) {
                        Text(product.title)
                            .font(.headline)
                            .foregroundStyle(AppTheme.text)
                        Text(product.price)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(AppTheme.primary)
                    }
                    Spacer()
                }

                Text(product.description)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)

                if requiresAuth {
                    HStack(spacing: 4) {
                        Image(systemName: "person.crop.circle.badge.questionmark")
                        Text("Sign in required")
                    }
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
                }
            }
            .padding(18)
            .background(product.popular ? AppTheme.primary.opacity(0.06) : AppTheme.card.opacity(0.5),
                        in: .rect(cornerRadius: 16))
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .stroke(product.popular ? AppTheme.primary : .white.opacity(0.06), lineWidth: product.popular ? 2 : 1)
            }
        }
        .buttonStyle(PressableCardStyle())
        .disabled(store.isPurchasing || requiresAuth)
    }

    private func premiumCard(_ product: IAPProduct) -> some View {
        let requiresAuth = auth.user == nil
        let isActive = store.isPremium
        return Button {
            Task { await store.purchase(productID: product.id) }
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                if let badge = product.badge {
                    Text(badge)
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color(hex: 0x10B981), in: .capsule)
                        .aligning(.topTrailing)
                }

                HStack(spacing: 14) {
                    Image(systemName: "shield.fill")
                        .font(.title2)
                        .foregroundStyle(Color(hex: 0x10B981))
                        .frame(width: 44, height: 44)
                        .background(Color(hex: 0x10B981).opacity(0.12), in: .rect(cornerRadius: 12))

                    VStack(alignment: .leading, spacing: 3) {
                        Text(product.title)
                            .font(.headline)
                            .foregroundStyle(AppTheme.text)
                        Text(product.price)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color(hex: 0x10B981))
                    }
                    Spacer()
                }

                Text(product.description)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)

                if isActive {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Active")
                    }
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Color(hex: 0x10B981))
                } else if requiresAuth {
                    HStack(spacing: 4) {
                        Image(systemName: "person.crop.circle.badge.questionmark")
                        Text("Sign in required")
                    }
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
                }

                if store.isPurchasing {
                    HStack(spacing: 4) {
                        ProgressView().scaleEffect(0.7)
                        Text("Processing...")
                    }
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
                }
            }
            .padding(18)
            .background(isActive ? Color(hex: 0x10B981).opacity(0.06) : AppTheme.card.opacity(0.5),
                        in: .rect(cornerRadius: 16))
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color(hex: 0x10B981).opacity(isActive ? 0.4 : 0.2), lineWidth: 2)
            }
        }
        .buttonStyle(PressableCardStyle())
        .disabled(store.isPurchasing || requiresAuth || isActive)
    }
}

// MARK: - Alignment Helper

private extension View {
    func aligning(_ alignment: Alignment) -> some View {
        frame(maxWidth: .infinity, alignment: alignment)
    }
}
