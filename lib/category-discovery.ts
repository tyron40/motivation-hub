// Centralized category discovery configuration (Part 17).
// ONE place defines per-category search queries, positive relevance signals
// and negative (deprioritized) signals. Both the category screen and the
// YouTubeContentManager read from here — no scattered per-category
// special cases anywhere else.

export interface DiscoveryProfile {
  /** Rotating YouTube discovery queries used for daily fresh discovery. */
  queries: string[];
  /** Relevance signals; each match (title+description) raises the score. */
  positiveTerms: string[];
  /** Deprioritized content; each match subtracts heavily from the score. */
  negativeTerms: string[];
}

export type DiscoveryKey =
  | 'motivation'
  | 'success'
  | 'mindset'
  | 'fitness'
  | 'study'
  | 'church'
  | 'athlete';

export const DISCOVERY_PROFILES: Record<DiscoveryKey, DiscoveryProfile> = {
  motivation: {
    queries: [
      'motivational speech inspiration discipline perseverance',
      'powerful motivation speech never give up',
      'best motivational speech discipline grind',
    ],
    positiveTerms: [
      'motivation', 'motivational', 'motivational speech', 'inspiration',
      'inspirational', 'discipline', 'perseverance', 'never give up',
    ],
    negativeTerms: [
      'meditation', 'sleep', 'calm', 'asmr', 'ambient', 'relaxing music',
      'study music', 'lofi', 'rain sounds',
    ],
  },

  success: {
    queries: [
      'success motivational speech entrepreneurship achievement goals',
      'business success leadership ambition motivational speech',
    ],
    positiveTerms: [
      'success', 'successful', 'achievement', 'goals', 'entrepreneur',
      'business', 'leadership', 'wealth', 'ambition', 'motivational',
    ],
    negativeTerms: [
      'meditation', 'sleep', 'calm', 'asmr', 'ambient', 'relaxing music',
      'subliminal',
    ],
  },

  mindset: {
    queries: [
      'mindset motivational speech mental toughness focus habits',
      'growth mindset discipline confidence motivational speech',
    ],
    positiveTerms: [
      'mindset', 'mental toughness', 'growth mindset', 'focus',
      'confidence', 'habits', 'psychology', 'self belief', 'motivational',
    ],
    negativeTerms: [
      'meditation', 'sleep', 'calm', 'asmr', 'ambient', 'relaxing music',
      'subliminal',
    ],
  },

  fitness: {
    queries: [
      'fitness motivation gym workout training strength speech',
      'workout motivation bodybuilding fitness discipline speech',
    ],
    positiveTerms: [
      'fitness', 'gym', 'workout', 'training', 'bodybuilding', 'strength',
      'exercise', 'muscle', 'motivation', 'discipline',
    ],
    negativeTerms: [
      'meditation', 'sleep', 'calm', 'asmr', 'ambient', 'yoga music',
      'relaxing music',
    ],
  },

  study: {
    queries: [
      'study motivation productivity focus student education speech',
      'exam study motivation concentration discipline students',
    ],
    positiveTerms: [
      'study', 'student', 'school', 'exam', 'education', 'productivity',
      'concentration', 'learning', 'motivation',
    ],
    negativeTerms: [
      'asmr', 'ambient', 'lofi', 'sleep', 'rain sounds', 'binaural',
    ],
  },

  // Church Motivation: primarily PREACHER + MOTIVATIONAL MESSAGE (Part 7/8).
  // Music-only / ambient worship content is actively deprioritized.
  church: {
    queries: [
      'motivational sermon powerful preaching',
      'Christian motivation sermon faith encouragement',
      "don't give up sermon overcoming adversity",
      'preacher motivational speech purpose God',
      'powerful church preaching inspiration',
      'discipline Christian sermon perseverance',
    ],
    positiveTerms: [
      'sermon', 'preacher', 'preaching', 'pastor', 'church', 'christian',
      'faith', 'god', 'jesus', 'christ', 'purpose', 'prayer', 'bible',
      'scripture', 'gospel', 'encouragement', 'motivation', 'inspirational',
      'motivational sermon', 'christian motivation', 'overcoming',
      'perseverance', 'holy spirit', 'ministry',
    ],
    negativeTerms: [
      'instrumental', 'instrumental worship', 'worship music', 'lyric video',
      'lyrics', 'ambient worship', 'soaking music', 'prayer music',
      'worship songs', 'harp', 'piano worship', 'sleep', '1 hour of music',
      'playlist', 'meditation music', 'cover song',
    ],
  },

  // Athlete Pump Up: HIGH-ENERGY sports/grind motivation (Part 5/6).
  // Eric Thomas is included as one strong energy signal, not the only one.
  athlete: {
    queries: [
      'Eric Thomas athlete motivation',
      'Eric Thomas sports motivation speech',
      'high energy motivational speech athletes',
      'intense sports motivation speech',
      'pregame motivational speech',
      'football motivation speech',
      'basketball motivation speech',
      'athlete mindset motivational speech',
      'championship mentality motivation',
      'workout pump up speech',
      'locker room motivational speech',
      'never give up sports motivation',
      'discipline grind sports motivation',
    ],
    positiveTerms: [
      'athlete', 'athletes', 'sports', 'football', 'basketball', 'soccer',
      'workout', 'training', 'championship', 'champion', 'game day',
      'pregame', 'pre-game', 'locker room', 'grind', 'discipline', 'pain',
      'winning', 'motivation', 'motivational speech', 'pump up', 'beast mode',
      'eric thomas', 'et the hip hop preacher', 'mindset', 'hard work',
      'no excuses',
    ],
    negativeTerms: [
      'meditation', 'sleep', 'calm', 'asmr', 'ambient', 'affirmations',
      'relaxing', 'relaxation', 'study music', 'lofi', 'rain sounds',
      'binaural', 'soothing', 'sleep music',
    ],
  },
};

export function getDiscoveryProfile(key: string): DiscoveryProfile {
  return (
    DISCOVERY_PROFILES[key as DiscoveryKey] ?? DISCOVERY_PROFILES.motivation
  );
}

/**
 * Maps a raw category id/name (e.g. "athlete", "Athlete Pump Up",
 * "Church Motivation") onto a DiscoveryKey. Single lookup point —
 * keep category special-casing HERE only.
 */
export function discoveryKeyForCategory(categoryIdOrName: string): DiscoveryKey {
  const value = String(categoryIdOrName || '').toLowerCase();

  if (value === 'athlete' || value.includes('athlete') || value.includes('pump')) {
    return 'athlete';
  }
  if (
    value === 'church' ||
    value.includes('church') ||
    value.includes('christian') ||
    value.includes('faith') ||
    value.includes('sermon')
  ) {
    return 'church';
  }
  if (value.includes('success') || value.includes('business')) return 'success';
  if (value.includes('mindset') || value.includes('mental')) return 'mindset';
  if (
    value.includes('fitness') ||
    value.includes('workout') ||
    value.includes('gym')
  ) {
    return 'fitness';
  }
  if (value.includes('study') || value.includes('student')) return 'study';
  return 'motivation';
}

/** Normalized-title dedup key: collapses punctuation/spacing/case. */
export function normalizeTitleForDedup(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Relevance score for one discovered video against a profile.
 * - positive terms: +3 multiword, +2 single word (matches title bias x2)
 * - negative terms: −5 per match ("strongly deprioritize")
 * - freshness: modest bonus so NEW content surfaces (Parts 10/11) but a
 *   fresh unrelated video can NEVER beat a highly relevant speech — the
 *   bonus (max +4) is smaller than a single positive-term match (+2..+3
 *   each, usually several).
 */
export function scoreDiscoveryVideo(
  video: { id?: string; title?: string; description?: string; publishedAt?: string },
  profile: DiscoveryProfile
): number {
  const title = String(video.title || '').toLowerCase();
  const description = String(video.description || '').toLowerCase();
  const haystack = `${title} ${description}`;

  let score = 0;

  for (const term of profile.positiveTerms) {
    if (haystack.includes(term)) {
      score += term.includes(' ') ? 3 : 2;
      if (title.includes(term)) score += 1;
    }
  }

  for (const term of profile.negativeTerms) {
    if (haystack.includes(term)) {
      score -= 5;
    }
  }

  const publishedAt = video.publishedAt ? Date.parse(video.publishedAt) : NaN;
  if (!Number.isNaN(publishedAt)) {
    const ageDays = (Date.now() - publishedAt) / 86_400_000;
    if (ageDays <= 14) score += 4;
    else if (ageDays <= 30) score += 3;
    else if (ageDays <= 90) score += 2;
    else if (ageDays <= 365) score += 1;
  }

  return score;
}

/** A discovered video is only usable if its metadata is real and it is on-topic. */
export function isDiscoverableVideo(video: {
  id?: string;
  title?: string;
  description?: string;
}): boolean {
  const id = String(video.id || '').trim();
  const title = String(video.title || '').trim();
  // 11 chars is the canonical YouTube id shape; accept >=8 for safety.
  if (id.length < 8 || id.length > 20) return false;
  if (!title || title === 'Private video' || title === 'Deleted video') {
    return false;
  }
  return true;
}

export interface RankedVideo<T> {
  video: T;
  score: number;
  isNew: boolean;
}

/**
 * Ranks + mixes a fresh discovery batch (Parts 10-13):
 * - dedupes by video id AND normalized title (reuploads)
 * - drops invalid/off-topic results (relevance threshold)
 * - keeps 60-75% proven (previously cached) content and fills the rest
 *   with the best NEW discoveries, so categories refresh daily without
 *   becoming unrecognizable.
 */
export function rankAndMixDiscovery<T extends {
  id?: string; title?: string; description?: string; publishedAt?: string;
}>(
  profile: DiscoveryProfile,
  videos: T[],
  previousIds: Set<string>,
  limit: number
): T[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const ranked: RankedVideo<T>[] = [];

  for (const video of videos) {
    if (!isDiscoverableVideo(video)) continue;

    const id = String(video.id);
    const titleKey = normalizeTitleForDedup(video.title || '');
    if (seenIds.has(id) || seenTitles.has(titleKey)) continue;

    const score = scoreDiscoveryVideo(video, profile);
    if (score < 2) continue; // relevance threshold — below this is off-topic

    seenIds.add(id);
    seenTitles.add(titleKey);
    ranked.push({ video, score, isNew: !previousIds.has(id) });
  }

  const byScore = (a: RankedVideo<T>, b: RankedVideo<T>) => b.score - a.score;

  const proven = ranked.filter((r) => !r.isNew).sort(byScore);
  const fresh = ranked.filter((r) => r.isNew).sort(byScore);

  // 60-75% proven anchor, remainder new discoveries (Part 11).
  const provenTarget = Math.min(proven.length, Math.ceil(limit * 0.7));

  const mixed: T[] = [];
  for (const r of proven.slice(0, provenTarget)) mixed.push(r.video);
  for (const r of fresh) {
    if (mixed.length >= limit) break;
    mixed.push(r.video);
  }
  for (const r of proven.slice(provenTarget)) {
    if (mixed.length >= limit) break;
    mixed.push(r.video);
  }

  return mixed.slice(0, limit);
}

/**
 * Daily rotation over a profile's query list: each day picks a different
 * 2-query window, so the discovery pool keeps finding NEW content daily
 * while bounding YouTube API usage (Part 14).
 */
export function pickDailyQueries(queries: string[], count: number = 2): string[] {
  if (queries.length <= count) return queries.slice();
  const now = new Date();
  const dayIndex = Math.floor(
    (now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000
  );
  const start = (dayIndex * count) % queries.length;
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(queries[(start + i) % queries.length]);
  }
  return picked;
}
