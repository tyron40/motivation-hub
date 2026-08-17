import Foundation

/// Product IDs matching RevenueCat configuration.
enum IAPProductID {
    static let credits100 = "mh_credits_100"
    static let credits500 = "mh_credits_500"
    static let credits1000 = "mh_credits_1000"
    static let premiumMonthly = "mh_premium_monthly"
    static let premiumAnnual = "mh_premium_annual"
}

/// Catalog of purchasable products, mirroring the Expo IAP constants.
struct IAPProduct: Identifiable, Sendable {
    let id: String
    let title: String
    let description: String
    let credits: Int?
    let isPremium: Bool
    let badge: String?
    let popular: Bool
    let price: String

    var productID: String { id }
}

enum IAPCatalog {
    static let products: [IAPProduct] = [
        IAPProduct(id: IAPProductID.credits100, title: "100 AI Credits",
                   description: "Get 100 AI credits for chat and voice interactions.",
                   credits: 100, isPremium: false, badge: nil, popular: false, price: "$4.99"),
        IAPProduct(id: IAPProductID.credits500, title: "500 AI Credits",
                   description: "Get 500 AI credits for extended AI conversations.",
                   credits: 500, isPremium: false, badge: "BEST VALUE", popular: true, price: "$19.99"),
        IAPProduct(id: IAPProductID.credits1000, title: "1000 AI Credits",
                   description: "Maximum credits for unlimited AI interactions.",
                   credits: 1000, isPremium: false, badge: nil, popular: false, price: "$34.99"),
        IAPProduct(id: IAPProductID.premiumMonthly, title: "Premium — Ad-Free",
                   description: "Remove all ads and enjoy an uninterrupted experience.",
                   credits: nil, isPremium: true, badge: "AD-FREE", popular: false, price: "$9.99/mo"),
        IAPProduct(id: IAPProductID.premiumAnnual, title: "Premium Annual",
                   description: "Ad-free for a year. Save 20% compared to monthly.",
                   credits: nil, isPremium: true, badge: "SAVE 20%", popular: false, price: "$99.99/yr"),
    ]

    static let creditProducts = products.filter { !$0.isPremium }
    static let premiumProducts = products.filter { $0.isPremium }

    static let allVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
}
