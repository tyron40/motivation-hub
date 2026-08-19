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
 * Preset coach characters — casual, approachable, everyday-looking avatars.
 * Mix of male and female coaches, multiple Black male options (Marcus, Dre, Malik, Andre).
 * Descriptions focus only on coaching personality and style.
 */
const PRESET_CHARACTERS: CoachCharacter[] = [
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
      mouth: 'smile',
      eyes: 'squint',
    }),
    description: 'High-energy hype coach. Pushes you past your limits.',
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
    description: 'Calm and thoughtful. Great for mindful daily habits.',
    isCustom: false,
  },
  {
    id: 'andre',
    name: 'Coach Andre',
    imageUrl: buildAvatarUrl({
      seed: 'AndreCasual2024',
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
    description: 'Steady and consistent. Keeps you accountable day by day.',
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
    description: 'Warm and supportive. Perfect for building new routines.',
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
      mouth: 'smile',
      eyes: 'default',
    }),
    description: 'Powerful and focused. Built for discipline and performance.',
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
    description: 'Creative and inspiring. Great for finding your purpose.',
    isCustom: false,
  },
  {
    id: 'dre',
    name: 'Coach Dre',
    imageUrl: buildAvatarUrl({
      seed: 'DreCasual2024',
      backgroundColor: '451a03',
      skin: 'black',
      top: 'shortHairShortCurly',
      topColor: '111111',
      facialHair: 'beardMedium',
      clothing: 'hoodie',
      clothingColor: '78350f',
      mouth: 'smile',
      eyes: 'squint',
    }),
    description: 'Laid-back but relentless. Steady drive, no excuses.',
    isCustom: false,
  },
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
    description: 'Bold and direct. Cuts through doubt with straight talk.',
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
                      <Check color="white" size={14} />
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
    gap: 12,
    marginTop: 16,
  },
  characterCard: {
    width: '47%',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  characterImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 10,
  },
  selectedBadge: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  characterName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
    textAlign: 'center' as const,
  },
  characterDescription: {
    fontSize: 12,
    textAlign: 'center' as const,
    lineHeight: 15,
  },
});
