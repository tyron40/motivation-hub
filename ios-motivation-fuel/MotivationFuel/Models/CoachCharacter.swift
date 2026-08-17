import Foundation

/// A selectable coach character with a DiceBear avatar.
struct CoachCharacter: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let name: String
    let imageUrl: String
    let description: String
    let isCustom: Bool
}

enum CoachCharacters {
    static let presets: [CoachCharacter] = [
        CoachCharacter(id: "alex", name: "Coach Alex",
            imageUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=AlexMotivatePro&backgroundColor=8b4513&style=circle&top=shortFlat&topColor=1a1a1a&accessories=round&clothingColor=1e3a8a&skinColor=c9a07a&eyes=default&eyebrows=default&mouth=default",
            description: "Energetic and motivating, perfect for daily inspiration", isCustom: false),
        CoachCharacter(id: "sophia", name: "Coach Sophia",
            imageUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=SophiaCalmWisdom&backgroundColor=10b981&style=circle&top=longHair&topColor=4a3520&accessories=none&clothingColor=065f46&skinColor=ffdfba&eyes=default&eyebrows=default&mouth=smile&facialHair=none",
            description: "Calm and wise, great for mindfulness and reflection", isCustom: false),
        CoachCharacter(id: "marcus", name: "Coach Marcus",
            imageUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=MarcusIronDiscipline&backgroundColor=3b82f6&style=circle&top=shortFlat&topColor=111111&accessories=none&clothingColor=1e3a8a&skinColor=b58a5a&eyes=squint&eyebrows=serious&mouth=serious&facialHair=beardLight&facialHairColor=111111",
            description: "Strong and disciplined, ideal for fitness and goals", isCustom: false),
        CoachCharacter(id: "emma", name: "Coach Emma",
            imageUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=EmmaWarmSupport&backgroundColor=ec4899&style=circle&top=longHair&topColor=2d1810&accessories=none&clothingColor=831843&skinColor=ffdfba&eyes=default&eyebrows=default&mouth=smile&facialHair=none",
            description: "Friendly and supportive, perfect for personal growth", isCustom: false),
        CoachCharacter(id: "david", name: "Coach David",
            imageUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=DavidStrategyPro&backgroundColor=8b5cf6&style=circle&top=shortFlat&topColor=1a1a1a&accessories=round&clothingColor=2e1065&skinColor=d4a373&eyes=default&eyebrows=default&mouth=default&facialHair=beardMajestic&facialHairColor=1a1a1a",
            description: "Professional and strategic, great for career coaching", isCustom: false),
        CoachCharacter(id: "maya", name: "Coach Maya",
            imageUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=MayaCreativeFire&backgroundColor=f59e0b&style=circle&top=longHairCurly&topColor=1a0d00&accessories=none&clothingColor=78350f&skinColor=ffdfba&eyes=default&eyebrows=default&mouth=smile&facialHair=none",
            description: "Creative and inspiring, ideal for artistic pursuits", isCustom: false),
        CoachCharacter(id: "dre", name: "Coach Dre",
            imageUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=DreBossHustle27&backgroundColor=2563eb&style=circle&top=shortFlat&topColor=1a1a1a&accessories=round&clothingColor=1e3a8a&skinColor=7b4f3a&eyes=squint&eyebrows=serious&mouth=serious&facialHair=beardLight&facialHairColor=1a1a1a",
            description: "Relentless and real, pushes you to dominate every goal", isCustom: false),
        CoachCharacter(id: "malik", name: "Coach Malik",
            imageUrl: "https://api.dicebear.com/7.x/avataaars/png?seed=MalikHustleGrind42&backgroundColor=1d4ed8&style=circle&top=shortFlat&topColor=111111&accessories=round&clothingColor=1e40af&skinColor=6b4533&eyes=squint&eyebrows=serious&mouth=serious&facialHair=beardMajestic&facialHairColor=111111",
            description: "No-nonsense accountability coach who turns talk into action", isCustom: false),
    ]

    static let `default` = presets[0]

    static func find(_ id: String?) -> CoachCharacter {
        if let id, let match = presets.first(where: { $0.id == id }) { return match }
        return `default`
    }
}

/// Built-in TTS voice characters for the voice picker.
struct VoiceCharacter: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let description: String
}

enum VoiceCharacters {
    static let all: [VoiceCharacter] = [
        VoiceCharacter(id: "alloy", name: "Alloy", description: "Neutral and balanced voice"),
        VoiceCharacter(id: "echo", name: "Echo", description: "Warm and engaging male voice"),
        VoiceCharacter(id: "fable", name: "Fable", description: "Expressive British accent"),
        VoiceCharacter(id: "onyx", name: "Onyx", description: "Deep and authoritative male voice"),
        VoiceCharacter(id: "nova", name: "Nova", description: "Energetic female voice"),
        VoiceCharacter(id: "shimmer", name: "Shimmer", description: "Soft and gentle female voice"),
    ]

    static func find(_ id: String?) -> VoiceCharacter {
        if let id, let match = all.first(where: { $0.id == id }) { return match }
        return all[0]
    }
}
