export interface Speech {
  id: string;
  title: string;
  speaker: string;
  duration: number; // in seconds
  category: string;
  imageUrl: string;
  audioUrl?: string;
  youtubeId?: string;
  description: string;
  isFavorite?: boolean;
  playCount?: number;
  tags?: string[];
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
  totalListeningTime: number;
  favoriteCount: number;
  streak: number;
}