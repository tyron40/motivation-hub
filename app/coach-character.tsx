import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Check, Wand2 } from 'lucide-react-native';
import { Stack, router } from 'expo-router';
import { useUserProfile } from '@/hooks/user-profile-context';
import { CoachCharacter } from '@/types/speech';
import { useTheme } from '@/hooks/theme-context';
import { generateImageViaBackend } from '@/lib/api-client';

const PRESET_CHARACTERS: CoachCharacter[] = [
  {
    id: 'alex',
    name: 'Coach Alex',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=Alex&backgroundColor=8b4513',
    description: 'Energetic and motivating, perfect for daily inspiration',
    isCustom: false,
  },
  {
    id: 'sophia',
    name: 'Coach Sophia',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=Sophia&backgroundColor=10b981',
    description: 'Calm and wise, great for mindfulness and reflection',
    isCustom: false,
  },
  {
    id: 'marcus',
    name: 'Coach Marcus',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=Marcus&backgroundColor=3b82f6',
    description: 'Strong and disciplined, ideal for fitness and goals',
    isCustom: false,
  },
  {
    id: 'emma',
    name: 'Coach Emma',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=Emma&backgroundColor=ec4899',
    description: 'Friendly and supportive, perfect for personal growth',
    isCustom: false,
  },
  {
    id: 'david',
    name: 'Coach David',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=David&backgroundColor=8b5cf6',
    description: 'Professional and strategic, great for career coaching',
    isCustom: false,
  },
  {
    id: 'maya',
    name: 'Coach Maya',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=Maya&backgroundColor=f59e0b',
    description: 'Creative and inspiring, ideal for artistic pursuits',
    isCustom: false,
  },
];

export default function CoachCharacterScreen() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useUserProfile();
  const [selectedCharacter, setSelectedCharacter] = useState<CoachCharacter | null>(
    profile.coachCharacter || PRESET_CHARACTERS[0]
  );
  const [customDescription, setCustomDescription] = useState('');
  const [customName, setCustomName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCharacter, setGeneratedCharacter] = useState<CoachCharacter | null>(null);

  const handleSelectCharacter = async (character: CoachCharacter) => {
    setSelectedCharacter(character);
    await updateProfile({ coachCharacter: character });
    Alert.alert('Success', `${character.name} is now your coach!`);
  };

  const handleGenerateCustomCharacter = async () => {
    if (!customDescription.trim()) {
      Alert.alert('Error', 'Please describe your ideal coach');
      return;
    }

    if (!customName.trim()) {
      Alert.alert('Error', 'Please enter a name for your coach');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🎨 Generating custom coach character...');
      
      const result = await generateImageViaBackend(
        `A professional, friendly coach avatar with these characteristics: ${customDescription}. Style: modern, clean, professional headshot, warm and approachable expression, suitable for a motivation coach app`,
        '1024x1024'
      );
      const imageUrl = result.imageUrl;

      const customCharacter: CoachCharacter = {
        id: `custom-${Date.now()}`,
        name: customName.trim(),
        imageUrl,
        description: customDescription,
        isCustom: true,
      };

      setGeneratedCharacter(customCharacter);
      Alert.alert(
        'Character Generated!',
        'Your custom coach has been created. Tap to select it.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Select',
            onPress: () => handleSelectCharacter(customCharacter),
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error generating character:', error);
      Alert.alert(
        'Generation Failed',
        'Failed to generate custom character. Please try again or choose a preset character.'
      );
    } finally {
      setIsGenerating(false);
    }
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
            style={styles.content}
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

            <View style={styles.divider} />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Create Custom Character</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Describe your ideal coach and we will generate a unique character using AI
            </Text>

            <View style={styles.customSection}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Coach Name</Text>
              <TextInput
                style={[styles.customNameInput, { color: colors.text }]}
                placeholder="E.g., Coach Sarah, Mentor John, etc."
                placeholderTextColor={colors.textSecondary}
                value={customName}
                onChangeText={setCustomName}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Character Description</Text>
              <TextInput
                style={[styles.customInput, { color: colors.text }]}
                placeholder="E.g., A wise elderly mentor with gray hair and glasses, wearing professional attire..."
                placeholderTextColor={colors.textSecondary}
                value={customDescription}
                onChangeText={setCustomDescription}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: colors.primary }, isGenerating && styles.generateButtonDisabled]}
                onPress={handleGenerateCustomCharacter}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Wand2 color="white" size={20} />
                    <Text style={styles.generateButtonText}>Generate Character</Text>
                  </>
                )}
              </TouchableOpacity>

              {generatedCharacter && (
                <View style={styles.generatedPreview}>
                  <Text style={[styles.previewTitle, { color: colors.text }]}>Generated Character</Text>
                  <TouchableOpacity
                    style={[
                      styles.characterCard,
                      { backgroundColor: colors.cardBackground },
                      selectedCharacter?.id === generatedCharacter.id && { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
                    ]}
                    onPress={() => handleSelectCharacter(generatedCharacter)}
                  >
                    <Image
                      source={{ uri: generatedCharacter.imageUrl }}
                      style={styles.characterImage}
                    />
                    {selectedCharacter?.id === generatedCharacter.id && (
                      <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                        <Check color="white" size={16} />
                      </View>
                    )}
                    <Text style={[styles.characterName, { color: colors.text }]}>{generatedCharacter.name}</Text>
                    <Text style={[styles.characterDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                      {generatedCharacter.description}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 32,
  },
  customSection: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
    marginTop: 8,
  },
  customNameInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  customInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top' as const,
    marginBottom: 16,
  },
  generateButton: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  generatedPreview: {
    marginTop: 24,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
});
