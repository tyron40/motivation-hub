import React, { useMemo, useState } from 'react';
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

function buildAvatarUrl({
  seed,
  backgroundColor,
  skin,
  top,
  topColor,
  facialHair = 'none',
  facialHairColor = '1a1a1a',
  clothing,
  clothingColor,
  accessories = 'none',
  eyes = 'default',
  eyebrows = 'default',
  mouth = 'smile',
}: {
  seed: string;
  backgroundColor: string;
  skin: string;
  top: string;
  topColor: string;
  facialHair?: string;
  facialHairColor?: string;
  clothing: string;
  clothingColor: string;
  accessories?: string;
  eyes?: string;
  eyebrows?: string;
  mouth?: string;
}) {
  const params = new URLSearchParams({
    seed,
    backgroundColor,
    style: 'circle',
    skin,
    top,
    topColor,
    facialHair,
    facialHairColor,
    clothing,
    clothingColor,
    accessories,
    eyes,
    eyebrows,
    mouth,
  });
  return `https://api.dicebear.com/7.x/avataaars/png?${params.toString()}`;
}

/**
 * Preset coach characters — casual, everyday-looking avatars.
 * Includes black male coaches and clear male/female presentation.
 */
const PRESET_CHARACTERS: CoachCharacter[] = [
  {
    id: 'alex',
    name: 'Coach Alex',
    imageUrl: buildAvatarUrl({
      seed: 'AlexCasual2024',
      backgroundColor: '1e3a8a',
      skin: 'light',
      top: 'shortHairShortFlat',
      topColor: '1a1a1a',
      clothing: 'hoodie',
      clothingColor: '2563eb',
      mouth: 'smile',
      eyes: 'happy',
    }),
    description: 'Laid-back and motivating, perfect for daily inspiration',
    isCustom: false,
  },
  {
    id: 'sophia',
    name: 'Coach Sophia',
    imageUrl: buildAvatarUrl({
      seed: 'SophiaCasual2024',
      backgroundColor: '065f46',
      skin: 'tanned',
      top: 'longHairStraight',
      topColor: '3f2e22',
      clothing: 'hoodie',
      clothingColor: '10b981',
      mouth: 'smile',
      eyes: 'default',
    }),
    description: 'Calm and wise, great for mindfulness and reflection',
    isCustom: false,
  },
  {
    id: 'marcus',
    name: 'Coach Marcus',
    imageUrl: buildAvatarUrl({
      seed: 'MarcusCasual2024',
      backgroundColor: '3b82f6',
      skin: 'darkBrown',
      top: 'shortHairDreads',
      topColor: '111111',
      facialHair: 'beardLight',
      clothing: 'shirtCrewNeck',
      clothingColor: '1e3a8a',
      mouth: 'serious',
      eyes: 'squint',
    }),
    description: 'Strong and disciplined, ideal for fitness and goals',
    isCustom: false,
  },
  {
    id: 'emma',
    name: 'Coach Emma',
    imageUrl: buildAvatarUrl({
      seed: 'EmmaCasual2024',
      backgroundColor: '831843',
      skin: 'pale',
      top: 'longHairBob',
      topColor: '2d1810',
      clothing: 'shirtScoopNeck',
      clothingColor: 'db2777',
      mouth: 'smile',
      eyes: 'happy',
    }),
    description: 'Friendly and supportive, perfect for personal growth',
    isCustom: false,
  },
  {
    id: 'david',
    name: 'Coach David',
    imageUrl: buildAvatarUrl({
      seed: 'DavidCasual2024',
      backgroundColor: '5b21b6',
      skin: 'brown',
      top: 'shortHairShortCurly',
      topColor: '1a1a1a',
      facialHair: 'beardMedium',
      clothing: 'hoodie',
      clothingColor: '4c1d95',
      mouth: 'smile',
      eyes: 'default',
    }),
    description: 'Professional and strategic, great for career coaching',
    isCustom: false,
  },
  {
    id: 'maya',
    name: 'Coach Maya',
    imageUrl: buildAvatarUrl({
      seed: 'MayaCasual2024',
      backgroundColor: '78350f',
      skin: 'brown',
      top: 'longHairCurly',
      topColor: '1a0d00',
      clothing: 'hoodie',
      clothingColor: 'd97706',
      mouth: 'smile',
      eyes: 'happy',
    }),
    description: 'Creative and inspiring, ideal for artistic pursuits',
    isCustom: false,
  },
  {
    id: 'dre',
    name: 'Coach Dre',
    imageUrl: buildAvatarUrl({
      seed: 'DreCasual2024',
      backgroundColor: '0f766e',
      skin: 'black',
      top: 'shortHairShortCurly',
      topColor: '111111',
      facialHair: 'beardLight',
      clothing: 'hoodie',
      clothingColor: '115e59',
      mouth: 'smile',
      eyes: 'squint',
    }),
    description: 'Relentless and real, pushes you to dominate every goal',
    isCustom: false,
  },
  {
    id: 'malik',
    name: 'Coach Malik',
    imageUrl: buildAvatarUrl({
      seed: 'MalikCasual2024',
      backgroundColor: '1d4ed8',
      skin: 'black',
      top: 'shortHairDreads',
      topColor: '111111',
      facialHair: 'beardMajestic',
      clothing: 'shirtCrewNeck',
      clothingColor: '1e40af',
      mouth: 'serious',
      eyes: 'default',
    }),
    description: 'No-nonsense accountability coach who turns talk into action',
    isCustom: false,
  },
];

export default function CoachCharacterScreen() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useUserProfile();
  const [selectedCharacter, setSelectedCharacter] = useState<CoachCharacter | null>(
    profile.coachCharacter || PRESET_CHARACTERS[0]
  );
  const [imageFallbacks, setImageFallbacks] = useState<Record<string, boolean>>({});

  const fallbackAvatarUri = useMemo(
    () =>
      'https://api.dicebear.com/7.x/avataaars/png?seed=CoachFallback&backgroundColor=1f2937&style=circle&top=shortHairShortFlat&clothing=hoodie&skin=light',
    []
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
                    selectedCharacter?.id === character.id && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '20',
                    },
                  ]}
                  onPress={() => handleSelectCharacter(character)}
                >
                  <Image
                    source={{
                      uri: imageFallbacks[character.id] ? fallbackAvatarUri : character.imageUrl,
                    }}
                    onError={() =>
                      setImageFallbacks((prev) =>
                        prev[character.id] ? prev : { ...prev, [character.id]: true }
                      )
                    }
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
