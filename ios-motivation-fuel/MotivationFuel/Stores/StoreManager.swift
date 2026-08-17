import Foundation
import RevenueCat
import SwiftUI

/// Manages in-app purchases via RevenueCat and tracks credits locally.
/// Mirrors the Expo IAP context: credits start at 10, premium removes ads.
@MainActor
@Observable
final class StoreManager {
    var credits: Int = 10
    var isPremium: Bool = false
    var premiumExpiresAt: Date?
    var isPurchasing = false
    var isRestoring = false
    var isConfigured = false
    var errorMessage: String?

    private let defaults = UserDefaults.standard
    private let entitlementID = "premium"

    private enum Key {
        static let credits = "iap.credits"
        static let premium = "iap.isPremium"
        static let premiumExpiry = "iap.premiumExpiry"
    }

    init() {
        loadEntitlements()
    }

    /// Configures RevenueCat. Called from the App entry point.
    func configure() {
        let apiKey = Config.EXPO_PUBLIC_REVENUECAT_IOS_KEY
        guard !apiKey.isEmpty else {
            #if DEBUG
            print("[Store] RevenueCat API key is empty — purchases disabled")
            #endif
            isConfigured = false
            return
        }

        #if DEBUG
        Purchases.logLevel = .debug
        Purchases.configure(withAPIKey: apiKey)
        #else
        Purchases.configure(withAPIKey: apiKey)
        #endif
        isConfigured = true

        Task { await listenForUpdates() }
        Task { await fetchOfferings() }
    }

    /// Listen for real-time customer info updates.
    private func listenForUpdates() async {
        for await info in Purchases.shared.customerInfoStream {
            let active = info.entitlements[entitlementID]?.isActive == true
            if active != isPremium {
                isPremium = active
                saveEntitlements()
            }
        }
    }

    /// Fetches the current offering for paywall display.
    private func fetchOfferings() async {
        do {
            _ = try await Purchases.shared.offerings()
        } catch {
            #if DEBUG
            print("[Store] Failed to fetch offerings: \(error.localizedDescription)")
            #endif
        }
    }

    // MARK: - Purchase

    func purchase(productID: String) async {
        guard isConfigured else {
            errorMessage = "In-app purchases are not configured for this environment."
            return
        }

        isPurchasing = true
        defer { isPurchasing = false }

        do {
            let offerings = try await Purchases.shared.offerings()
            guard let current = offerings.current else {
                errorMessage = "No current offering found"
                return
            }

            guard let pkg = current.availablePackages.first(where: { $0.storeProduct.productIdentifier == productID }) else {
                errorMessage = "Product not found: \(productID)"
                return
            }

            let result = try await Purchases.shared.purchase(package: pkg)
            if result.userCancelled { return }

            let premiumActive = result.customerInfo.entitlements[entitlementID]?.isActive == true
            if premiumActive {
                isPremium = true
            }

            // Add credits for consumable purchases
            switch productID {
            case IAPProductID.credits100: credits += 100
            case IAPProductID.credits500: credits += 500
            case IAPProductID.credits1000: credits += 1000
            default: break
            }

            saveEntitlements()
        } catch let error as ErrorCode where error == .purchaseCancelledError {
            // StoreKit cancellation — not an error
        } catch let error as ErrorCode where error == .paymentPendingError {
            // Awaiting parental approval — not a failure
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func restore() async {
        guard isConfigured else {
            errorMessage = "Purchase restoration is not configured for this environment."
            return
        }

        isRestoring = true
        defer { isRestoring = false }

        do {
            let info = try await Purchases.shared.restorePurchases()
            isPremium = info.entitlements[entitlementID]?.isActive == true
            saveEntitlements()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Credits

    @discardableResult
    func useCredit() -> Bool {
        guard credits > 0 else { return false }
        credits -= 1
        saveEntitlements()
        return true
    }

    func addCredits(_ amount: Int) {
        credits += amount
        saveEntitlements()
    }

    var canUseAI: Bool { credits > 0 || isPremium }
    var isAdFree: Bool { isPremium }

    // MARK: - Persistence

    private func loadEntitlements() {
        credits = defaults.integer(forKey: Key.credits)
        if credits == 0 { credits = 10 } // Default for new users

        let storedPremium = defaults.bool(forKey: Key.premium)
        isPremium = storedPremium

        if let expiry = defaults.object(forKey: Key.premiumExpiry) as? Date {
            premiumExpiresAt = expiry
            if expiry < Date() {
                isPremium = false
                premiumExpiresAt = nil
                saveEntitlements()
            }
        }
    }

    private func saveEntitlements() {
        defaults.set(credits, forKey: Key.credits)
        defaults.set(isPremium, forKey: Key.premium)
        defaults.set(premiumExpiresAt, forKey: Key.premiumExpiry)
    }
}
