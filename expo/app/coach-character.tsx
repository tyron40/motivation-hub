import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Check } from 'lucide-react-native';
import { Stack, router } from 'expo-router';
import { useUserProfile } from '@/hooks/user-profile-context';
import { CoachCharacter } from '@/types/speech';
import { useTheme } from '@/hooks/theme-context';

/**
 * Preset coach characters with DiceBear avatars.
 * Each avatar uses explicit gender-appropriate style parameters so the
 * generated image matches the character's name and personality.
 * Valid DiceBear 'avataaars' style params are used to avoid broken images.
 */
const PRESET_CHARACTERS: CoachCharacter[] = [
  {
    id: 'alex',
    name: 'Coach Alex',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=AlexMotivatePro&backgroundColor=8b4513&style=circle&top=shortFlat&topColor=1a1a1a&accessories=round&clothingColor=1e3a8a&skinColor=c9a07a&eyes=default&eyebrows=default&mouth=default',
    description: 'Energetic and motivating, perfect for daily inspiration',
    isCustom: false,
  },
  {
    id: 'sophia',
    name: 'Coach Sophia',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=SophiaCalmWisdom&backgroundColor=10b981&style=circle&top=longHair&topColor=4a3520&accessories=none&clothingColor=065f46&skinColor=ffdfba&eyes=default&eyebrows=default&mouth=smile&facialHair=none',
    description: 'Calm and wise, great for mindfulness and reflection',
    isCustom: false,
  },
  {
    id: 'marcus',
    name: 'Coach Marcus',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=MarcusIronDiscipline&backgroundColor=3b82f6&style=circle&top=shortFlat&topColor=111111&accessories=none&clothingColor=1e3a8a&skinColor=b58a5a&eyes=squint&eyebrows=serious&mouth=serious&facialHair=beardLight&facialHairColor=111111',
    description: 'Strong and disciplined, ideal for fitness and goals',
    isCustom: false,
  },
  {
    id: 'emma',
    name: 'Coach Emma',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=EmmaWarmSupport&backgroundColor=ec4899&style=circle&top=longHair&topColor=2d1810&accessories=none&clothingColor=831843&skinColor=ffdfba&eyes=default&eyebrows=default&mouth=smile&facialHair=none',
    description: 'Friendly and supportive, perfect for personal growth',
    isCustom: false,
  },
  {
    id: 'david',
    name: 'Coach David',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=DavidStrategyPro&backgroundColor=8b5cf6&style=circle&top=shortFlat&topColor=1a1a1a&accessories=round&clothingColor=2e1065&skinColor=d4a373&eyes=default&eyebrows=default&mouth=default&facialHair=beardMajestic&facialHairColor=1a1a1a',
    description: 'Professional and strategic, great for career coaching',
    isCustom: false,
  },
  {
    id: 'maya',
    name: 'Coach Maya',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=MayaCreativeFire&backgroundColor=f59e0b&style=circle&top=longHairCurly&topColor=1a0d00&accessories=none&clothingColor=78350f&skinColor=ffdfba&eyes=default&eyebrows=default&mouth=smile&facialHair=none',
    description: 'Creative and inspiring, ideal for artistic pursuits',
    isCustom: false,
  },
  {
    id: 'dre',
    name: 'Coach Dre',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=DreBossHustle27&backgroundColor=2563eb&style=circle&top=shortFlat&topColor=1a1a1a&accessories=round&clothingColor=1e3a8a&skinColor=7b4f3a&eyes=squint&eyebrows=serious&mouth=serious&facialHair=beardLight&facialHairColor=1a1a1a',
    description: 'Relentless and real, pushes you to dominate every goal',
    isCustom: false,
  },
  {
    id: 'malik',
    name: 'Coach Malik',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=MalikHustleGrind42&backgroundColor=1d4ed8&style=circle&top=shortFlat&topColor=111111&accessories=round&clothingColor=1e40af&skinColor=6b4533&eyes=squint&eyebrows=serious&mouth=serious&facialHair=beardMajestic&facialHairColor=111111',
    description: 'No-nonsense accountability coach who turns talk into action',
    isCustom: false,
  }
];

export default function CoachCharacterScreen() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useUserProfile();
  const [selectedCharacter, setSelectedCharacter] = useState<CoachCharacter | null>(
    profile.coachCharacter || PRESET_CHARACTERS[0]
  );

  const handleSelectCharacter = async (character: CoachCharacter) => {
    setSelectedCharacter(character);
    await updateProfile({ coachCharacter: character });
    Alert.alert('Success', `${character.name} is now your coach!`);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[colors.background, colors.card]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.headerIcon}
              >
                <Sparkles color="white" size={20} />
              </LinearGradient>
              <Text style={[styles.title, { color: colors.text }]}>Choose Your Coach</Text>
            </View>
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
              onPress={() => router.back()}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Preset Characters</Text>
            <View style={styles.charactersGrid}>
              {PRESET_CHARACTERS.map((character) => (
                <TouchableOpacity
                  key={character.id}
                  style={[
                    styles.characterCard,
                    { backgroundColor: colors.cardBackground },
                    selectedCharacter?.id === character.id && { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
                  ]}
                  onPress={() => handleSelectCharacter(character)}
                >
                  <Image
                    source={{ uri: character.imageUrl }}
                    style={styles.characterImage}
                  />
                  {selectedCharacter?.id === character.id && (
                    <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                      <Check color="white" size={16} />
                    </View>
                  )}
                  <Text style={[styles.characterName, { color: colors.text }]}>{character.name}</Text>
                  <Text style={[styles.characterDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {character.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginTop: 24,
    marginBottom: 8,
  },
  charactersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  characterCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  characterImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  selectedBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  characterName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
    textAlign: 'center' as const,
  },
  characterDescription: {
    fontSize: 12,
    textAlign: 'center' as const,
    lineHeight: 16,
  },
});
