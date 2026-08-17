import Foundation
import SwiftUI

/// User profile preferences: name, preferred voice, coach character, voice enabled toggle.
/// Persists to `UserDefaults` and syncs with `AuthManager` for the display name.
@MainActor
@Observable
final class UserProfileStore {
    var name: String = "" { didSet { persist() } }
    var preferredVoice: String = "alloy" { didSet { persist() } }
    var voiceEnabled: Bool = true { didSet { persist() } }
    var includeChurchMotivation: Bool = false { didSet { persist() } }
    var profileImageURI: String? { didSet { persist() } }
    var coachCharacter: CoachCharacter? { didSet { persist() } }

    private let defaults = UserDefaults.standard
    private let storageKey = "userProfile.v2"

    init() {
        load()
    }

    /// Updates the name from the authenticated user (falls back to local name).
    func syncWith(auth: AuthManager) {
        if name.isEmpty, let user = auth.user {
            name = user.displayName
        }
    }

    private func load() {
        guard let data = defaults.data(forKey: storageKey),
              let saved = try? JSONDecoder().decode(StoredProfile.self, from: data) else { return }
        name = saved.name
        preferredVoice = saved.preferredVoice
        voiceEnabled = saved.voiceEnabled
        includeChurchMotivation = saved.includeChurchMotivation
        profileImageURI = saved.profileImageURI
        coachCharacter = saved.coachCharacter
    }

    private func persist() {
        let profile = StoredProfile(
            name: name,
            preferredVoice: preferredVoice,
            voiceEnabled: voiceEnabled,
            includeChurchMotivation: includeChurchMotivation,
            profileImageURI: profileImageURI,
            coachCharacter: coachCharacter
        )
        guard let data = try? JSONEncoder().encode(profile) else { return }
        defaults.set(data, forKey: storageKey)
    }

    private struct StoredProfile: Codable {
        let name: String
        let preferredVoice: String
        let voiceEnabled: Bool
        let includeChurchMotivation: Bool
        let profileImageURI: String?
        let coachCharacter: CoachCharacter?
    }
}
