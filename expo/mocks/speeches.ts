import { Speech, Category } from '@/types/speech';

export const categories: Category[] = [
  {
    id: '1',
    name: 'Motivation',
    icon: 'flame',
    color: '#FF6B6B',
    speechCount: 35,
  },
  {
    id: '2',
    name: 'Success',
    icon: 'trophy',
    color: '#4ECDC4',
    speechCount: 28,
  },
  {
    id: '3',
    name: 'Mindset',
    icon: 'brain',
    color: '#45B7D1',
    speechCount: 25,
  },
  {
    id: '4',
    name: 'Fitness',
    icon: 'zap',
    color: '#FF9F43',
    speechCount: 20,
  },
  {
    id: '5',
    name: 'Study',
    icon: 'book-open',
    color: '#DDA0DD',
    speechCount: 18,
  },
];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Motivation': ['motivat', 'inspire', 'dream', 'never give up', 'keep going', 'grind', 'hustle', 'push', 'fuel'],
  'Success': ['success', 'wealth', 'money', 'business', 'entrepreneur', 'rich', 'financial', 'leadership', 'win'],
  'Mindset': ['mindset', 'mental', 'psychology', 'think', 'brain', 'habit', 'attitude', 'belief', 'focus'],
  'Fitness': ['fitness', 'workout', 'gym', 'exercise', 'body', 'health', 'training', 'muscle', 'strength'],
  'Study': ['study', 'learn', 'education', 'read', 'knowledge', 'school', 'focus', 'concentration', 'productivity'],
  'Christian Motivation': ['christian', 'church', 'god', 'jesus', 'faith', 'prayer', 'sermon', 'gospel', 'bible', 'lord', 'scripture', 'worship', 'holy'],
  'Athlete Pump Up': ['athlete', 'sports', 'game day', 'pump up', 'pregame', 'championship', 'competition', 'team', 'football', 'basketball', 'soccer', 'training', 'beast mode', 'warrior', 'win', 'champion', 'mvp', 'playoff'],
};

export function classifyVideoToCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  let bestCategory = 'Motivation';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

export const churchCategory: Category = {
  id: 'church',
  name: 'Christian Motivation',
  icon: 'church',
  color: '#FFD700',
  speechCount: 30,
};

export const athleteCategory: Category = {
  id: 'athlete',
  name: 'Athlete Pump Up',
  icon: 'zap',
  color: '#EF4444',
  speechCount: 25,
};

export const speeches: Speech[] = [
  {
    id: '1',
    title: 'BEST MOTIVATIONAL SPEECH COMPILATION',
    speaker: 'Various Speakers',
    duration: 495,
    category: 'Motivation',
    imageUrl: 'https://i.ytimg.com/vi/ji5_MqicxSo/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'ji5_MqicxSo',
    description: 'Transform your life with this powerful motivational speech compilation featuring the best speakers.',
    playCount: 15420,
    tags: ['morning', 'purpose', 'discipline'],
  },
  {
    id: '2',
    title: 'WAKE UP AND WORK HARD',
    speaker: 'Motivational Speakers',
    duration: 505,
    category: 'Success',
    imageUrl: 'https://i.ytimg.com/vi/6vuetQSwFW8/hqdefault.jpg',
    audioUrl: '',
    youtubeId: '6vuetQSwFW8',
    description: 'Learn how discipline equals freedom and how to build unbreakable mental toughness.',
    playCount: 28350,
    tags: ['discipline', 'freedom', 'mindset'],
  },
  {
    id: '3',
    title: 'ONE OF THE BEST SPEECHES EVER',
    speaker: 'Les Brown',
    duration: 251,
    category: 'Mindset',
    imageUrl: 'https://i.ytimg.com/vi/R7vmHGAshi8/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'R7vmHGAshi8',
    description: 'An incredible speech that will change how you see life and help you achieve greatness.',
    playCount: 67800,
    tags: ['inspiration', 'life', 'excellence'],
  },
  {
    id: '4',
    title: 'THE SECRET TO SUCCESS',
    speaker: 'Eric Thomas',
    duration: 305,
    category: 'Mindset',
    imageUrl: 'https://i.ytimg.com/vi/hbkZrOU1Zag/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'hbkZrOU1Zag',
    description: 'Discover the real secret to success and what it takes to achieve your dreams.',
    playCount: 89200,
    tags: ['success', 'persistence', 'winning'],
  },
  {
    id: '5',
    title: 'CHANGE YOUR LIFE TODAY',
    speaker: 'Tony Robbins',
    duration: 545,
    category: 'Inspiration',
    imageUrl: 'https://i.ytimg.com/vi/F14z4BvL1Lg/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'F14z4BvL1Lg',
    description: 'Take action today and transform your life with this powerful motivational message.',
    playCount: 32100,
    tags: ['confidence', 'belief', 'potential'],
  },
  {
    id: '6',
    title: 'I AM A CHAMPION',
    speaker: 'Eric Thomas',
    duration: 347,
    category: 'Study',
    imageUrl: 'https://i.ytimg.com/vi/o8ejn_3LcQs/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'o8ejn_3LcQs',
    description: 'Develop the champion mindset and learn what it takes to be the best.',
    playCount: 19800,
    tags: ['mindfulness', 'champion', 'focus'],
  },
  {
    id: '7',
    title: 'POWERFUL MOTIVATIONAL VIDEO',
    speaker: 'Various Speakers',
    duration: 313,
    category: 'Success',
    imageUrl: 'https://i.ytimg.com/vi/rJj9S_s1YQw/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'rJj9S_s1YQw',
    description: 'An incredibly powerful motivational video that will inspire you to take action.',
    playCount: 45200,
    tags: ['leadership', 'responsibility', 'ownership'],
  },
  {
    id: '8',
    title: 'NEVER GIVE UP - BEST MOTIVATIONAL VIDEO',
    speaker: 'Les Brown',
    duration: 185,
    category: 'High Energy',
    imageUrl: 'https://i.ytimg.com/vi/lL_H2GiuM-E/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'lL_H2GiuM-E',
    description: 'Never give up on your dreams. This motivational video will push you to keep going.',
    playCount: 38900,
    tags: ['action', 'productivity', 'habits'],
  },
];

/**
 * Fallback speeches for categories that have no entries in the local speeches array.
 * These ensure every category page always shows content even if the YouTube API
 * returns nothing or quota is exhausted.
 */
export const christianSpeeches: Speech[] = [
  {
    id: 'church-1',
    title: 'POWERFUL Christian Motivation - Never Give Up',
    speaker: 'Christian Motivation',
    duration: 480,
    category: 'Christian Motivation',
    imageUrl: 'https://i.ytimg.com/vi/Q0oFggRGKDA/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'Q0oFggRGKDA',
    description: 'Faith-based motivation to strengthen your walk with God and keep pushing forward.',
    playCount: 125000,
    tags: ['faith', 'christian', 'encouragement', 'church'],
  },
  {
    id: 'church-2',
    title: 'Morning Christian Motivation - Start Your Day With God',
    speaker: 'Daily Faith',
    duration: 620,
    category: 'Christian Motivation',
    imageUrl: 'https://i.ytimg.com/vi/VLRFofppJDI/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'VLRFofppJDI',
    description: 'Begin each morning with faith, prayer, and encouragement from God\'s word.',
    playCount: 89000,
    tags: ['morning', 'prayer', 'faith', 'god'],
  },
  {
    id: 'church-3',
    title: 'When You Feel Like Quitting - Christian Encouragement',
    speaker: 'Inspire Faith',
    duration: 540,
    category: 'Christian Motivation',
    imageUrl: 'https://i.ytimg.com/vi/VLRFofppJDI/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'VLRFofppJDI',
    description: 'God has a plan for your life. Don\'t give up when things get hard — trust His timing.',
    playCount: 67000,
    tags: ['perseverance', 'trust', 'god', 'encouragement'],
  },
  {
    id: 'church-4',
    title: 'Sermon on Strength and Faith',
    speaker: 'Pastor Motivation',
    duration: 720,
    category: 'Christian Motivation',
    imageUrl: 'https://i.ytimg.com/vi/Q0oFggRGKDA/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'Q0oFggRGKDA',
    description: 'A powerful sermon about finding strength through faith in difficult times.',
    playCount: 45000,
    tags: ['sermon', 'strength', 'faith', 'bible'],
  },
  {
    id: 'church-5',
    title: 'God Will Make a Way - Christian Motivational Speech',
    speaker: 'Faith Journey',
    duration: 380,
    category: 'Christian Motivation',
    imageUrl: 'https://i.ytimg.com/vi/VLRFofppJDI/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'VLRFofppJDI',
    description: 'No matter what obstacle you face, God will open doors you never imagined.',
    playCount: 92000,
    tags: ['god', 'hope', 'faith', 'miracle'],
  },
];

export const athleteSpeeches: Speech[] = [
  {
    id: 'athlete-1',
    title: 'GAME DAY PUMP UP - Unleash the Beast',
    speaker: 'Sports Motivation',
    duration: 420,
    category: 'Athlete Pump Up',
    imageUrl: 'https://i.ytimg.com/vi/VLRFofppJDI/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'VLRFofppJDI',
    description: 'Get hyped before your game with this intense pump up motivation.',
    playCount: 234000,
    tags: ['athlete', 'pump up', 'game day', 'beast mode'],
  },
  {
    id: 'athlete-2',
    title: 'NO EXCUSES - Athlete Motivation',
    speaker: 'Beast Mode Sports',
    duration: 360,
    category: 'Athlete Pump Up',
    imageUrl: 'https://i.ytimg.com/vi/Q0oFggRGKDA/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'Q0oFggRGKDA',
    description: 'Champions don\'t make excuses. They put in the work and dominate.',
    playCount: 187000,
    tags: ['athlete', 'no excuses', 'training', 'champion'],
  },
  {
    id: 'athlete-3',
    title: 'PREGAME MOTIVATION - Leave It All On The Field',
    speaker: 'Sports Inspiration',
    duration: 300,
    category: 'Athlete Pump Up',
    imageUrl: 'https://i.ytimg.com/vi/VLRFofppJDI/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'VLRFofppJDI',
    description: 'The ultimate pregame speech to fire you up before competition.',
    playCount: 156000,
    tags: ['pregame', 'competition', 'sports', 'warrior'],
  },
  {
    id: 'athlete-4',
    title: 'CHAMPION MINDSET - Train Like a Pro',
    speaker: 'Elite Athlete',
    duration: 540,
    category: 'Athlete Pump Up',
    imageUrl: 'https://i.ytimg.com/vi/Q0oFggRGKDA/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'Q0oFggRGKDA',
    description: 'What separates champions from the rest? This mindset training video.',
    playCount: 143000,
    tags: ['champion', 'training', 'elite', 'mindset'],
  },
  {
    id: 'athlete-5',
    title: 'BEAST MODE ACTIVATED - Sports Motivation',
    speaker: 'Hype Sports',
    duration: 280,
    category: 'Athlete Pump Up',
    imageUrl: 'https://i.ytimg.com/vi/VLRFofppJDI/hqdefault.jpg',
    audioUrl: '',
    youtubeId: 'VLRFofppJDI',
    description: 'Tap into your inner beast and dominate your sport.',
    playCount: 198000,
    tags: ['beast mode', 'sports', 'dominate', 'intensity'],
  },
];

export const featuredSpeech = speeches[2]; // Kobe Bryant speech

export const popularSpeeches = speeches.slice(0, 4);
export const recentSpeeches = speeches.slice(4, 8);
export const mindsetSpeeches = speeches.filter(speech => speech.category === 'Mindset');