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

/**
 * Preset coach characters using DiceBear avataaars API with explicit
 * style parameters for reliable, casual rendering.
 * Mix of male and female coaches, multiple Black male options (Malik, Andre).
 * Descriptions focus only on coaching personality/style.
 */
const PRESET_CHARACTERS: CoachCharacter[] = [
  {
    id: 'marcus',
    name: 'Marcus',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=MarcusMF&skin=darkBrown&top=dreads01&topChance=100&facialHair=beardMagestic&facialHairChance=100&facialHairColor=2c1b18&clothing=hoodie&clothingColor=3b82f6&mouth=smile&eyes=happy&backgroundColor=1f2937',
    description: 'High-energy hype coach. Pushes you past your limits.',
    isCustom: false,
  },
  {
    id: 'sophia',
    name: 'Sophia',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=SophiaMF&skin=light&top=longHairStraight&topChance=100&hairColor=8d5524&clothing=hoodie&clothingColor=ec4899&mouth=smile&eyes=happy&backgroundColor=1f2937',
    description: 'Calm and thoughtful. Great for mindful daily habits.',
    isCustom: false,
  },
  {
    id: 'andre',
    name: 'Andre',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=AndreMF&skin=black&top=shortHairDreads01&topChance=100&facialHair=beardLight&facialHairChance=100&facialHairColor=2c1b18&clothing=hoodie&clothingColor=0ea5e9&mouth=smile&eyes=happy&backgroundColor=1f2937',
    description: 'Steady and consistent. Keeps you accountable day by day.',
    isCustom: false,
  },
  {
    id: 'emma',
    name: 'Emma',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=EmmaMF&skin=light&top=longHairCurly&topChance=100&hairColor=a52a2a&clothing=hoodie&clothingColor=8b5cf6&mouth=smile&eyes=happy&backgroundColor=1f2937',
    description: 'Warm and supportive. Perfect for building new routines.',
    isCustom: false,
  },
  {
    id: 'malik',
    name: 'Malik',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=MalikMF&skin=black&top=dreads01&topChance=100&facialHair=beardMagestic&facialHairChance=100&facialHairColor=2c1b18&clothing=hoodie&clothingColor=f59e0b&mouth=smile&eyes=happy&backgroundColor=1f2937',
    description: 'Powerful and focused. Built for discipline and performance.',
    isCustom: false,
  },
  {
    id: 'maya',
    name: 'Maya',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=MayaMF&skin=brown&top=longHairStraight&topChance=100&hairColor=2c1b18&clothing=hoodie&clothingColor=14b8a6&mouth=smile&eyes=happy&backgroundColor=1f2937',
    description: 'Creative and inspiring. Great for finding your purpose.',
    isCustom: false,
  },
  {
    id: 'dre',
    name: 'Dre',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=DreMF&skin=darkBrown&top=shortHairCurly&topChance=100&facialHair=beardMedium&facialHairChance=100&facialHairColor=2c1b18&clothing=hoodie&clothingColor=10b981&mouth=smile&eyes=happy&backgroundColor=1f2937',
    description: 'Laid-back but relentless. Steady drive, no excuses.',
    isCustom: false,
  },
  {
    id: 'alex',
    name: 'Alex',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=AlexMF&skin=light&top=shortHairShortFlat&topChance=100&hairColor=3a3027&clothing=hoodie&clothingColor=ef4444&mouth=smile&eyes=happy&backgroundColor=1f2937',
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
    () => 'https://api.dicebear.com/7.x/avataaars/png?seed=CoachFallback&backgroundColor=1f2937',
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
    paddingBottom: 60,
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
