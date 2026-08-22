import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, ListMusic, Trash2, Edit3, Music, ArrowLeft } from 'lucide-react-native';
import { Stack, router } from 'expo-router';
import { usePlaylists } from '@/hooks/playlist-context';
import { useTheme } from '@/hooks/theme-context';


const PRESET_COLORS = [
  '#8B4513', '#10B981', '#3B82F6', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#EF4444'
];

function PlaylistsContent() {
  const { colors } = useTheme();
  const { playlists, createPlaylist, deletePlaylist, updatePlaylist } = usePlaylists();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const styles = getStyles(colors);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    try {
      if (editingPlaylist) {
        await updatePlaylist(editingPlaylist, {
          name: newPlaylistName,
          description: newPlaylistDescription,
          color: selectedColor,
        });
      } else {
        await createPlaylist(newPlaylistName, newPlaylistDescription, selectedColor);
      }

      setShowCreateModal(false);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setSelectedColor(PRESET_COLORS[0]);
      setEditingPlaylist(null);
    } catch {
      Alert.alert('Error', 'Failed to save playlist');
    }
  };

  const handleEditPlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      setNewPlaylistName(playlist.name);
      setNewPlaylistDescription(playlist.description || '');
      setSelectedColor(playlist.color || PRESET_COLORS[0]);
      setEditingPlaylist(playlistId);
      setShowCreateModal(true);
    }
  };

  const handleDeletePlaylist = (playlistId: string) => {
    Alert.alert(
      'Delete Playlist',
      'Are you sure you want to delete this playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePlaylist(playlistId),
        },
      ]
    );
  };

  const getPlaylistSpeechCount = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist?.speechIds.length || 0;
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.headerIcon}
              >
                <ListMusic color="white" size={20} />
              </LinearGradient>
              <Text style={styles.title}>My Playlists</Text>
            </View>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                setEditingPlaylist(null);
                setNewPlaylistName('');
                setNewPlaylistDescription('');
                setSelectedColor(PRESET_COLORS[0]);
                setShowCreateModal(true);
              }}
            >
              <Plus color={colors.background} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {playlists.length === 0 ? (
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={['rgba(139, 69, 19, 0.2)', 'rgba(139, 69, 19, 0.1)']}
                  style={styles.emptyIcon}
                >
                  <Music color={colors.primary} size={48} />
                </LinearGradient>
                <Text style={styles.emptyTitle}>No Playlists Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create your first playlist to organize your favorite speeches
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.emptyButtonText}>Create Playlist</Text>
                </TouchableOpacity>
              </View>
            ) : (
              playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={styles.playlistCard}
                  onPress={() => router.push(`/playlist/${playlist.id}`)}
                >
                  <LinearGradient
                    colors={[playlist.color || colors.primary, colors.cardBackground]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.playlistGradient}
                  >
                    <View style={styles.playlistContent}>
                      <View style={styles.playlistInfo}>
                        <Text style={styles.playlistName}>{playlist.name}</Text>
                        {playlist.description && (
                          <Text style={styles.playlistDescription} numberOfLines={2}>
                            {playlist.description}
                          </Text>
                        )}
                        <Text style={styles.playlistCount}>
                          {getPlaylistSpeechCount(playlist.id)} speeches
                        </Text>
                      </View>
                      <View style={styles.playlistActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleEditPlaylist(playlist.id);
                          }}
                        >
                          <Edit3 color={colors.text} size={18} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeletePlaylist(playlist.id);
                          }}
                        >
                          <Trash2 color="#EF4444" size={18} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>

        <Modal
          visible={showCreateModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingPlaylist ? 'Edit Playlist' : 'Create Playlist'}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Playlist Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter playlist name"
                  placeholderTextColor={colors.textSecondary}
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter description"
                  placeholderTextColor={colors.textSecondary}
                  value={newPlaylistDescription}
                  onChangeText={setNewPlaylistDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Color</Text>
                <View style={styles.colorPicker}>
                  {PRESET_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => setSelectedColor(color)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowCreateModal(false);
                    setEditingPlaylist(null);
                    setNewPlaylistName('');
                    setNewPlaylistDescription('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleCreatePlaylist}
                >
                  <Text style={styles.saveButtonText}>
                    {editingPlaylist ? 'Save' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </>
  );
}

export default function PlaylistsScreen() {
  return <PlaylistsContent />;
}

const getStyles = (colors: any) => StyleSheet.create({
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  playlistCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  playlistGradient: {
    padding: 20,
  },
  playlistContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playlistDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  playlistCount: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  playlistActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 20,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.text,
    borderWidth: 3,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
