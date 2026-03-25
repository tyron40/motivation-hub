/**
 * YouTube API Compliance Guard
 * 
 * This module enforces YouTube API Terms of Service compliance by:
 * 1. Preventing unauthorized video downloads/caching
 * 2. Ensuring official player usage only
 * 3. Blocking monetization of YouTube content
 * 4. Validating player domains
 */

const ALLOWED_YOUTUBE_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'm.youtube.com',
] as const;

const YOUTUBE_PLAYER_PATTERNS = [
  /youtube\.com\/embed\//,
  /youtube-nocookie\.com\/embed\//,
  /youtu\.be\//,
] as const;

export class YouTubeComplianceError extends Error {
  constructor(message: string) {
    super(`[YouTube Compliance Violation] ${message}`);
    this.name = 'YouTubeComplianceError';
  }
}

export const YouTubeCompliance = {
  validatePlayerUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      
      const isDomainAllowed = ALLOWED_YOUTUBE_DOMAINS.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      );
      
      if (!isDomainAllowed) {
        console.error('❌ YouTube Compliance: Invalid domain', hostname);
        return false;
      }
      
      const isPatternValid = YOUTUBE_PLAYER_PATTERNS.some(pattern => 
        pattern.test(url)
      );
      
      if (!isPatternValid) {
        console.error('❌ YouTube Compliance: Invalid player pattern', url);
        return false;
      }
      
      console.log('✅ YouTube Compliance: Valid player URL', url);
      return true;
    } catch (error) {
      console.error('❌ YouTube Compliance: Invalid URL format', url, error);
      return false;
    }
  },

  validateApiEndpoint(endpoint: string): boolean {
    const allowedEndpoints = [
      'videos.list',
      'search.list',
      'playlistItems.list',
      'channels.list',
      'playlists.list',
    ];
    
    const isValid = allowedEndpoints.some(allowed => endpoint.includes(allowed));
    
    if (!isValid) {
      console.error('❌ YouTube Compliance: Disallowed API endpoint', endpoint);
    }
    
    return isValid;
  },

  assertNoDownload(operation: string): void {
    const bannedOperations = [
      'download',
      'cache',
      'save',
      'store',
      'record',
      'capture',
      'extract',
      'rip',
      'offline',
    ];
    
    const operationLower = operation.toLowerCase();
    const hasBannedKeyword = bannedOperations.some(banned => 
      operationLower.includes(banned)
    );
    
    if (hasBannedKeyword) {
      throw new YouTubeComplianceError(
        `Operation "${operation}" violates YouTube ToS. Video downloads/caching are not permitted.`
      );
    }
  },

  assertNoMonetization(feature: string): void {
    console.log(`📹 YouTube Compliance Check: Feature "${feature}" must not monetize YouTube content`);
    
    const monetizationKeywords = [
      'paywall',
      'subscription',
      'premium',
      'unlock',
      'paid',
    ];
    
    const featureLower = feature.toLowerCase();
    const hasMonetizationKeyword = monetizationKeywords.some(keyword => 
      featureLower.includes(keyword) && featureLower.includes('youtube')
    );
    
    if (hasMonetizationKeyword) {
      throw new YouTubeComplianceError(
        `Feature "${feature}" appears to monetize YouTube content, which violates YouTube ToS.`
      );
    }
  },

  validateBackgroundPlayback(isYouTubeContent: boolean, isPremiumUser: boolean): boolean {
    if (isYouTubeContent && !isPremiumUser) {
      console.warn('⚠️ YouTube Compliance: Background playback not allowed for non-YouTube Premium users');
      return false;
    }
    return true;
  },

  logComplianceCheck(feature: string, passed: boolean): void {
    if (passed) {
      console.log(`✅ YouTube Compliance: ${feature} - PASS`);
    } else {
      console.error(`❌ YouTube Compliance: ${feature} - FAIL`);
    }
  },

  getEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
  },

  getWatchUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  },

  assertOnlyMetadataUsage(data: any): void {
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      const hasStreamData = keys.some(key => 
        ['stream', 'url', 'downloadUrl', 'directUrl', 'formats', 'adaptiveFormats'].includes(key)
      );
      
      if (hasStreamData) {
        throw new YouTubeComplianceError(
          'Detected attempt to access video stream data. Only metadata usage is permitted.'
        );
      }
    }
  },

  enforceBuildTimeCheck(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 YouTube Compliance: Build-time checks active');
    }
    
    const dangerousFunctions = [
      'downloadVideo',
      'cacheVideo',
      'extractAudio',
      'saveStream',
    ];
    
    dangerousFunctions.forEach(fnName => {
      if (typeof global[fnName as keyof typeof global] === 'function') {
        throw new YouTubeComplianceError(
          `Detected banned function "${fnName}" in codebase. Remove immediately.`
        );
      }
    });
  },
};

YouTubeCompliance.enforceBuildTimeCheck();

export default YouTubeCompliance;
