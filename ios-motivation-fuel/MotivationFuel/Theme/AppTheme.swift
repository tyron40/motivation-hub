import SwiftUI

/// Color palette mirroring the Motivation Fuel design system.
enum AppTheme {
    static let primary = Color(hex: 0x3B82F6)
    static let secondary = Color(hex: 0x60A5FA)
    static let accent = Color(hex: 0x93C5FD)
    static let background = Color(hex: 0x0A0E1A)
    static let card = Color(hex: 0x1E293B)
    static let text = Color.white
    static let textSecondary = Color(hex: 0x94A3B8)

    static let gradientStart = Color(hex: 0x1E40AF)
    static let gradientEnd = Color(hex: 0x60A5FA)

    /// Background wash used on every primary screen.
    static var screenGradient: LinearGradient {
        LinearGradient(
            colors: [background, card],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    static var featuredGradient: LinearGradient {
        LinearGradient(
            colors: [gradientStart, gradientEnd],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    /// Accent color assigned to a scripture category.
    static func scriptureColor(_ category: String) -> Color {
        switch category {
        case "Strength": Color(hex: 0x10B981)
        case "Hope": Color(hex: 0x3B82F6)
        case "Courage": Color(hex: 0xF59E0B)
        case "Faith": Color(hex: 0x8B5CF6)
        case "Love": Color(hex: 0xEC4899)
        case "Peace": Color(hex: 0x06B6D4)
        case "Wisdom": Color(hex: 0xA855F7)
        default: primary
        }
    }

    static func scriptureGradient(_ category: String) -> LinearGradient {
        let base = scriptureColor(category)
        return LinearGradient(
            colors: [base, base.opacity(0.72)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }

    /// Creates a color from a `#RRGGBB` string, falling back to the app primary.
    init(hexString: String) {
        var cleaned = hexString.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleaned.hasPrefix("#") { cleaned.removeFirst() }
        guard cleaned.count == 6, let value = UInt32(cleaned, radix: 16) else {
            self = AppTheme.primary
            return
        }
        self.init(hex: value)
    }
}
