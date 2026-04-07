import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Animated,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Share2, Heart, Quote, Plus, Trash2, X, ImagePlus, Camera, Upload, Download } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/theme-context';
import { motivationalFlyers, MotivationalFlyer } from '@/mocks/motivationalFlyers';
import { useAdmin } from '@/hooks/admin-context';
import { API_ENDPOINTS } from '@/lib/config';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 52) / 2);
const CARD_HEIGHT = Math.floor(CARD_WIDTH * 1.45);

const LIKED_FLYERS_KEY = 'liked_flyers';

export default function FlyersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAdmin, customFlyers, addFlyer, removeFlyer } = useAdmin();
  const [selectedFlyer, setSelectedFlyer] = useState<MotivationalFlyer | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuote, setNewQuote] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [supabaseFlyers, setSupabaseFlyers] = useState<MotivationalFlyer[]>([]);
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadLikedIds = async () => {
      try {
        const stored = await AsyncStorage.getItem(LIKED_FLYERS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          setLikedIds(new Set(parsed));
        }
      } catch (error) {
        console.error('Error loading liked flyers:', error);
      }
    };
    void loadLikedIds();
  }, []);

  useEffect(() => {
    const fetchSupabaseFlyers = async () => {
      try {
        console.log('📡 Fetching flyers from Supabase via Rork backend...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(API_ENDPOINTS.flyers, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn('⚠️ Flyers API returned:', response.status);
          return;
        }

        const data = await response.json();
        if (data.flyers && Array.isArray(data.flyers) && data.flyers.length > 0) {
          console.log(`✅ Fetched ${data.flyers.length} flyers from Supabase (source: ${data.source})`);
          setSupabaseFlyers(data.flyers);
        } else {
          console.log('📦 No additional flyers from Supabase');
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.warn('⚠️ Flyers fetch timed out');
        } else {
          console.warn('⚠️ Failed to fetch flyers from Supabase:', error?.message);
        }
      }
    };
    void fetchSupabaseFlyers();
  }, []);

  const saveLikedIds = useCallback(async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem(LIKED_FLYERS_KEY, JSON.stringify(Array.from(ids)));
    } catch (error) {
      console.error('Error saving liked flyers:', error);
    }
  }, []);

  const pickImageFromGallery = useCallback(async () => {
    try {
      setIsPickingImage(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        console.log('Image picked:', result.assets[0].uri);
        setNewImageUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    } finally {
      setIsPickingImage(false);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      setIsPickingImage(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        console.log('Photo taken:', result.assets[0].uri);
        setNewImageUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsPickingImage(false);
    }
  }, []);

  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((flyerId: string) => {
    console.log('Image failed to load for flyer:', flyerId);
    setFailedImages(prev => {
      const next = new Set(prev);
      next.add(flyerId);
      return next;
    });
  }, []);

  const handleImageLoadStart = useCallback((flyerId: string) => {
    setLoadingImages(prev => {
      const next = new Set(prev);
      next.add(flyerId);
      return next;
    });
  }, []);

  const handleImageLoadEnd = useCallback((flyerId: string) => {
    setLoadingImages(prev => {
      const next = new Set(prev);
      next.delete(flyerId);
      return next;
    });
  }, []);

  const allFlyers = React.useMemo(() => {
    const combined = [...motivationalFlyers, ...supabaseFlyers, ...customFlyers];
    const seen = new Set<string>();
    return combined.filter(f => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
  }, [supabaseFlyers, customFlyers]);

  const openFlyer = useCallback((flyer: MotivationalFlyer) => {
    setSelectedFlyer(flyer);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [scaleAnim]);

  const closeFlyer = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedFlyer(null));
  }, [scaleAnim]);

  const toggleLike = useCallback((id: string) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      void saveLikedIds(next);
      return next;
    });
  }, [saveLikedIds]);

  const handleAddFlyer = useCallback(async () => {
    if (!newTitle.trim() || !newImageUrl.trim()) {
      Alert.alert('Missing Fields', 'Please fill in the title and image.');
      return;
    }

    const accentColors = ['#FF8A00', '#00B894', '#0984E3', '#E84393', '#6C5CE7', '#FDCB6E'];
    const accent = accentColors[Math.floor(Math.random() * accentColors.length)];

    await addFlyer({
      id: `custom-flyer-${Date.now()}`,
      title: newTitle.trim(),
      quote: newQuote.trim() || '',
      imageUrl: newImageUrl.trim(),
      accent,
    });

    setNewTitle('');
    setNewQuote('');
    setNewImageUrl('');
    setShowAddModal(false);
  }, [newTitle, newQuote, newImageUrl, addFlyer]);

  const handleDownloadFlyer = useCallback(async (flyer: MotivationalFlyer) => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = flyer.imageUrl;
        link.target = '_blank';
        link.download = `${flyer.title.replace(/\s+/g, '_')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Downloaded', 'Flyer download started.');
        return;
      }

      const FileSystem = require('expo-file-system');
      const Sharing = require('expo-sharing');

      console.log('Downloading flyer to cache...');
      const fileName = `flyer_${flyer.id}_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(flyer.imageUrl, fileUri);
      console.log('Download complete:', downloadResult.uri);

      if (!downloadResult.uri) {
        throw new Error('Download failed - no URI returned');
      }

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'image/jpeg',
          dialogTitle: `Save "${flyer.title}"`,
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Error downloading flyer:', error);
      Alert.alert('Error', 'Failed to save flyer to photos. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading]);

  const handleShareFlyer = useCallback(async (flyer: MotivationalFlyer) => {
    try {
      const message = `Check out this motivational flyer: "${flyer.title}"${flyer.quote ? `\n\n"${flyer.quote}"` : ''}`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: flyer.title,
            text: message,
            url: flyer.imageUrl,
          });
        } else {
          await navigator.clipboard.writeText(message);
          Alert.alert('Copied', 'Flyer info copied to clipboard.');
        }
      } else {
        await Share.share({
          message,
          url: flyer.imageUrl,
        });
      }
    } catch (error) {
      console.error('Error sharing flyer:', error);
    }
  }, []);

  const handleDeleteFlyer = useCallback((id: string) => {
    Alert.alert('Delete Flyer', 'Are you sure you want to remove this flyer?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeFlyer(id) },
    ]);
  }, [removeFlyer]);

  const styles = getStyles(colors);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Motivation Flyers</Text>
          {isAdmin ? (
            <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn} activeOpacity={0.7}>
              <Plus size={22} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
        >
          {allFlyers.map((flyer, index) => (
            <TouchableOpacity
              key={flyer.id}
              activeOpacity={0.88}
              onPress={() => openFlyer(flyer)}
              style={[styles.card, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}
              testID={`flyer-grid-${flyer.id}`}
            >
              {failedImages.has(flyer.id) ? (
                <View style={[styles.cardImage, styles.cardImageFallback, { backgroundColor: flyer.accent + '30' }]}>
                  <Quote size={28} color={flyer.accent} />
                </View>
              ) : (
                <Image
                  source={{ uri: flyer.imageUrl }}
                  style={styles.cardImage}
                  resizeMode="cover"
                  onLoadStart={() => handleImageLoadStart(flyer.id)}
                  onLoadEnd={() => handleImageLoadEnd(flyer.id)}
                  onError={() => handleImageError(flyer.id)}
                />
              )}
              {loadingImages.has(flyer.id) && (
                <View style={styles.cardLoadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
              {flyer.quote ? (
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.9)']}
                  style={styles.cardGradient}
                >
                  <View style={[styles.accentDot, { backgroundColor: flyer.accent }]} />
                  <Text style={styles.cardQuote} numberOfLines={3}>{flyer.quote}</Text>
                  <Text style={styles.cardTitle}>{flyer.title}</Text>
                </LinearGradient>
              ) : (
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.3)']}
                  style={styles.cardGradient}
                >
                  <View style={[styles.accentDot, { backgroundColor: flyer.accent }]} />
                  <Text style={styles.cardTitle}>{flyer.title}</Text>
                </LinearGradient>
              )}
              {likedIds.has(flyer.id) && (
                <View style={styles.likedBadge}>
                  <Heart size={12} color="#E84393" fill="#E84393" />
                </View>
              )}
              {isAdmin && flyer.id.startsWith('custom-') && (
                <TouchableOpacity
                  style={styles.deleteOverlay}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleDeleteFlyer(flyer.id);
                  }}
                >
                  <Trash2 size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Modal visible={!!selectedFlyer} transparent animationType="fade" onRequestClose={closeFlyer}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeFlyer}>
            <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
              {selectedFlyer && (
                <View style={styles.modalCard}>
                  <Image source={{ uri: selectedFlyer.imageUrl }} style={styles.modalImage} resizeMode="cover" />
                  <LinearGradient
                    colors={selectedFlyer.quote ? ['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)'] : ['transparent', 'rgba(0,0,0,0.35)']}
                    style={styles.modalGradient}
                  >
                    {selectedFlyer.quote ? (
                      <>
                        <Quote size={24} color={selectedFlyer.accent} fill={selectedFlyer.accent} />
                        <Text style={styles.modalQuote}>{selectedFlyer.quote}</Text>
                      </>
                    ) : null}
                    <View style={[styles.modalAccentLine, { backgroundColor: selectedFlyer.accent }]} />
                    <Text style={styles.modalTitle}>{selectedFlyer.title}</Text>
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalActionBtn, likedIds.has(selectedFlyer.id) && { backgroundColor: '#E84393' + '30' }]}
                        onPress={() => toggleLike(selectedFlyer.id)}
                        activeOpacity={0.7}
                      >
                        <Heart
                          size={20}
                          color={likedIds.has(selectedFlyer.id) ? '#E84393' : '#fff'}
                          fill={likedIds.has(selectedFlyer.id) ? '#E84393' : 'transparent'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalActionBtn}
                        onPress={() => handleDownloadFlyer(selectedFlyer)}
                        activeOpacity={0.7}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Download size={20} color="#fff" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalActionBtn}
                        onPress={() => handleShareFlyer(selectedFlyer)}
                        activeOpacity={0.7}
                      >
                        <Share2 size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
          <View style={styles.addModalOverlay}>
            <View style={[styles.addModalContent, { backgroundColor: colors.card }]}>
              <View style={styles.addModalHeader}>
                <Text style={[styles.addModalTitle, { color: colors.text }]}>Add New Flyer</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.addModalBody}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.textSecondary + '30' }]}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="e.g. Rise & Grind"
                  placeholderTextColor={colors.textSecondary + '60'}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Quote (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.textSecondary + '30' }]}
                  value={newQuote}
                  onChangeText={setNewQuote}
                  placeholder="Motivational quote text (leave blank if on image)..."
                  placeholderTextColor={colors.textSecondary + '60'}
                  multiline
                  numberOfLines={3}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Image</Text>
                <View style={styles.imagePickerRow}>
                  <TouchableOpacity
                    style={[styles.imagePickerBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}
                    onPress={pickImageFromGallery}
                    activeOpacity={0.7}
                    disabled={isPickingImage}
                  >
                    {isPickingImage ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Upload size={18} color={colors.primary} />
                    )}
                    <Text style={[styles.imagePickerBtnText, { color: colors.primary }]}>Gallery</Text>
                  </TouchableOpacity>
                  {Platform.OS !== 'web' && (
                    <TouchableOpacity
                      style={[styles.imagePickerBtn, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}
                      onPress={takePhoto}
                      activeOpacity={0.7}
                      disabled={isPickingImage}
                    >
                      <Camera size={18} color={colors.accent || colors.primary} />
                      <Text style={[styles.imagePickerBtnText, { color: colors.accent || colors.primary }]}>Camera</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={[styles.orText, { color: colors.textSecondary }]}>or paste URL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.textSecondary + '30' }]}
                  value={newImageUrl}
                  onChangeText={setNewImageUrl}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor={colors.textSecondary + '60'}
                  autoCapitalize="none"
                  keyboardType="url"
                />

                {newImageUrl.trim().length > 0 && (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: newImageUrl }} style={styles.previewImage} />
                  </View>
                )}

                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleAddFlyer} activeOpacity={0.8}>
                  <ImagePlus size={18} color="#fff" />
                  <Text style={styles.addButtonText}>Add Flyer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.primary + '25',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden' as const,
    marginBottom: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardLeft: {
    marginRight: 7,
  },
  cardRight: {
    marginLeft: 7,
  },
  cardImage: {
    width: '100%' as const,
    height: '100%' as const,
    position: 'absolute' as const,
    backgroundColor: '#1a1a1a',
  },
  cardImageFallback: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  cardLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  cardGradient: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    padding: 14,
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  cardQuote: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    fontStyle: 'italic' as const,
    marginBottom: 8,
  },
  cardTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  likedBadge: {
    position: 'absolute' as const,
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  deleteOverlay: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.85)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalContent: {
    width: SCREEN_WIDTH - 48,
    maxHeight: SCREEN_WIDTH * 1.6,
  },
  modalCard: {
    width: '100%' as const,
    aspectRatio: 0.65,
    borderRadius: 24,
    overflow: 'hidden' as const,
  },
  modalImage: {
    width: '100%' as const,
    height: '100%' as const,
    position: 'absolute' as const,
  },
  modalGradient: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    padding: 24,
  },
  modalQuote: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
    fontStyle: 'italic' as const,
    marginTop: 12,
    marginBottom: 14,
  },
  modalAccentLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginBottom: 10,
  },
  modalTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  modalActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  addModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end' as const,
  },
  addModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  addModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  addModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  addModalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  previewContainer: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden' as const,
    marginBottom: 16,
  },
  previewImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  imagePickerRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 12,
  },
  imagePickerBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  imagePickerBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  orText: {
    fontSize: 12,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
