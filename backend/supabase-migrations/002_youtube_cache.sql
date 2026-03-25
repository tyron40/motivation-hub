-- YouTube video cache table
CREATE TABLE IF NOT EXISTS youtube_video_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  published_at TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL,
  view_count BIGINT DEFAULT 0,
  category TEXT NOT NULL,
  query TEXT NOT NULL,
  fetched_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups by category and expiration
CREATE INDEX IF NOT EXISTS idx_youtube_cache_category_expires 
ON youtube_video_cache(category, expires_at);

-- Index for fast lookups by query and expiration
CREATE INDEX IF NOT EXISTS idx_youtube_cache_query_expires 
ON youtube_video_cache(query, expires_at);

-- Index for cleaning up expired videos
CREATE INDEX IF NOT EXISTS idx_youtube_cache_expires 
ON youtube_video_cache(expires_at);

-- Daily batch fetch log
CREATE TABLE IF NOT EXISTS youtube_batch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_date DATE NOT NULL UNIQUE,
  total_videos_fetched INTEGER DEFAULT 0,
  categories_processed TEXT[] DEFAULT '{}',
  queries_used TEXT[] DEFAULT '{}',
  api_calls_made INTEGER DEFAULT 0,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for batch log lookups by date
CREATE INDEX IF NOT EXISTS idx_batch_logs_date 
ON youtube_batch_logs(batch_date DESC);

-- Function to clean up expired videos
CREATE OR REPLACE FUNCTION cleanup_expired_youtube_videos()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM youtube_video_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
