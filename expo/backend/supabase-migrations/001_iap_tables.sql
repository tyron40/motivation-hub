-- In-App Purchase Tables for Motivation Hub

-- 1. IAP Transactions Table
-- Stores all purchase transactions from Apple/Google
CREATE TABLE IF NOT EXISTS iap_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  receipt_data TEXT,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  INDEX idx_iap_transactions_user_id (user_id),
  INDEX idx_iap_transactions_transaction_id (transaction_id),
  INDEX idx_iap_transactions_product_id (product_id)
);

-- 2. Credit Ledger Table
-- Tracks all credit additions and deductions
CREATE TABLE IF NOT EXISTS credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  transaction_id TEXT REFERENCES iap_transactions(transaction_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  INDEX idx_credit_ledger_user_id (user_id),
  INDEX idx_credit_ledger_created_at (created_at)
);

-- 3. Subscriptions Table
-- Manages premium subscription status
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'grace_period', 'billing_retry')),
  expires_at TIMESTAMPTZ NOT NULL,
  latest_transaction_id TEXT REFERENCES iap_transactions(transaction_id),
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, product_id),
  INDEX idx_subscriptions_user_id (user_id),
  INDEX idx_subscriptions_status (status),
  INDEX idx_subscriptions_expires_at (expires_at)
);

-- 4. User Entitlements Table
-- Denormalized view of user's current entitlements for fast access
CREATE TABLE IF NOT EXISTS user_entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  premium_expires_at TIMESTAMPTZ,
  daily_chat_count INTEGER NOT NULL DEFAULT 0,
  daily_tts_count INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RPC Functions

-- Function: Get current credit balance
CREATE OR REPLACE FUNCTION get_credit_balance(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(delta) FROM credit_ledger WHERE user_id = p_user_id),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Grant credits to user
CREATE OR REPLACE FUNCTION grant_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_transaction_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO credit_ledger (user_id, delta, reason, transaction_id)
  VALUES (p_user_id, p_amount, p_reason, p_transaction_id);
  
  -- Update entitlements
  INSERT INTO user_entitlements (user_id, credits)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET credits = user_entitlements.credits + p_amount,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Deduct credits from user
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  current_balance := get_credit_balance(p_user_id);
  
  IF current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO credit_ledger (user_id, delta, reason)
  VALUES (p_user_id, -p_amount, p_reason);
  
  -- Update entitlements
  UPDATE user_entitlements
  SET credits = credits - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check and activate subscription
CREATE OR REPLACE FUNCTION activate_subscription(
  p_user_id UUID,
  p_product_id TEXT,
  p_expires_at TIMESTAMPTZ,
  p_transaction_id TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO subscriptions (
    user_id,
    product_id,
    status,
    expires_at,
    latest_transaction_id
  )
  VALUES (
    p_user_id,
    p_product_id,
    'active',
    p_expires_at,
    p_transaction_id
  )
  ON CONFLICT (user_id, product_id) DO UPDATE
  SET status = 'active',
      expires_at = p_expires_at,
      latest_transaction_id = p_transaction_id,
      updated_at = NOW();
  
  -- Update entitlements
  INSERT INTO user_entitlements (user_id, is_premium, premium_expires_at)
  VALUES (p_user_id, TRUE, p_expires_at)
  ON CONFLICT (user_id) DO UPDATE
  SET is_premium = TRUE,
      premium_expires_at = p_expires_at,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user entitlements
CREATE OR REPLACE FUNCTION get_user_entitlements(p_user_id UUID)
RETURNS TABLE (
  credits INTEGER,
  is_premium BOOLEAN,
  premium_expires_at TIMESTAMPTZ,
  daily_chat_count INTEGER,
  daily_tts_count INTEGER
) AS $$
BEGIN
  -- Ensure entitlements row exists
  INSERT INTO user_entitlements (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Reset daily counters if needed
  UPDATE user_entitlements
  SET daily_chat_count = 0,
      daily_tts_count = 0,
      last_reset_date = CURRENT_DATE
  WHERE user_id = p_user_id
    AND last_reset_date < CURRENT_DATE;
  
  -- Check if premium expired
  UPDATE user_entitlements
  SET is_premium = FALSE
  WHERE user_id = p_user_id
    AND is_premium = TRUE
    AND premium_expires_at < NOW();
  
  RETURN QUERY
  SELECT
    e.credits,
    e.is_premium,
    e.premium_expires_at,
    e.daily_chat_count,
    e.daily_tts_count
  FROM user_entitlements e
  WHERE e.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment usage counter
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_type TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Ensure entitlements row exists
  INSERT INTO user_entitlements (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Reset daily counters if needed
  UPDATE user_entitlements
  SET daily_chat_count = 0,
      daily_tts_count = 0,
      last_reset_date = CURRENT_DATE
  WHERE user_id = p_user_id
    AND last_reset_date < CURRENT_DATE;
  
  -- Increment appropriate counter
  IF p_type = 'chat' THEN
    UPDATE user_entitlements
    SET daily_chat_count = daily_chat_count + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSIF p_type = 'tts' THEN
    UPDATE user_entitlements
    SET daily_tts_count = daily_tts_count + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security Policies

-- Users can only see their own transactions
ALTER TABLE iap_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY iap_transactions_select ON iap_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own credit ledger
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY credit_ledger_select ON credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_select ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own entitlements
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_entitlements_select ON user_entitlements
  FOR SELECT USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE iap_transactions IS 'Stores all in-app purchase transactions';
COMMENT ON TABLE credit_ledger IS 'Ledger of all credit additions and deductions';
COMMENT ON TABLE subscriptions IS 'Premium subscription management';
COMMENT ON TABLE user_entitlements IS 'Denormalized user entitlements for fast access';
COMMENT ON FUNCTION get_credit_balance IS 'Get current credit balance for user';
COMMENT ON FUNCTION grant_credits IS 'Add credits to user account';
COMMENT ON FUNCTION deduct_credits IS 'Deduct credits from user account';
COMMENT ON FUNCTION activate_subscription IS 'Activate or renew premium subscription';
COMMENT ON FUNCTION get_user_entitlements IS 'Get all entitlements for user with auto-reset';
COMMENT ON FUNCTION increment_usage IS 'Increment daily usage counter (chat or tts)';
