-- Give accounts that predate the wallet migration the same 2-credit
-- welcome balance. Existing wallets and balances remain unchanged.
BEGIN;

WITH inserted_accounts AS (
  INSERT INTO public.user_credit_accounts (
    user_id,
    balance
  )
  SELECT
    users.id,
    2
  FROM auth.users AS users
  ON CONFLICT (user_id) DO NOTHING
  RETURNING user_id, balance
)
INSERT INTO public.user_credit_events (
  user_id,
  operation_key,
  kind,
  amount,
  balance_after
)
SELECT
  user_id,
  'welcome',
  'welcome',
  2,
  balance
FROM inserted_accounts
ON CONFLICT (user_id, operation_key) DO NOTHING;

COMMIT;
