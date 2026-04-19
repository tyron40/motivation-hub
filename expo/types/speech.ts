export interface Speech {
  id: string;
  title: string;
  speaker: string;
  duration: number;
  category: string;
  imageUrl: string;
  audioUrl?: string;
  youtubeId?: string;
  description: string;
  isFavorite?: boolean;
  playCount?: number;
  tags?: string[];
  playlistIds?: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  speechCount: number;
}

export interface ListeningHistory {
  speechId: string;
  listenedAt: Date;
  progress: number; // percentage
}

export interface UserProfile {
  name: string;
  avatar?: string;
  profileImageUri?: string;
  totalListeningTime: number;
  favoriteCount: number;
  streak: number;
  coachCharacter?: CoachCharacter;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  speechIds: string[];
  createdAt: number;
  updatedAt: number;
  color?: string;
}

export interface FavoriteScripture {
  id: string;
  text: string;
  reference: string;
  category: string;
  savedAt: number;
  notes?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface CoachCharacter {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  isCustom: boolean;
}