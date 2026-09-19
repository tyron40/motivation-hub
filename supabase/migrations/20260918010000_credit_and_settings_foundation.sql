-- Account credit foundation. Existing device balances are NOT imported here.
-- Accounts created after this migration receive 2 credits exactly once.
-- Older accounts return initialized=false until a reviewed migration imports them.
BEGIN;

CREATE TABLE public.user_credit_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL CHECK (balance >= 0),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_credit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_credit_accounts(user_id) ON DELETE CASCADE,
  operation_key text NOT NULL CHECK (length(operation_key) BETWEEN 1 AND 300),
  kind text NOT NULL CHECK (kind IN ('welcome', 'spend', 'purchase', 'migration', 'legacy_receipt')),
  amount integer NOT NULL,
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  store text,
  environment text,
  transaction_id text,
  product_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, operation_key),
  UNIQUE (store, environment, transaction_id),
  CHECK (
    (kind = 'welcome' AND amount = 2) OR
    (kind = 'spend' AND amount < 0) OR
    (kind = 'purchase' AND amount > 0) OR
    (kind = 'migration' AND amount >= 0) OR
    (kind = 'legacy_receipt' AND amount = 0)
  ),
  CHECK (
    (kind IN ('purchase', 'legacy_receipt') AND
      store IS NOT NULL AND store IN ('APP_STORE', 'PLAY_STORE') AND
      environment IS NOT NULL AND environment IN ('PRODUCTION', 'SANDBOX') AND
      transaction_id IS NOT NULL AND length(btrim(transaction_id)) BETWEEN 1 AND 150 AND
      product_id IS NOT NULL AND product_id IN ('mh_credits_100', 'mh_credits_500', 'mh_credits_1000')) OR
    (kind NOT IN ('purchase', 'legacy_receipt') AND
      store IS NULL AND environment IS NULL AND transaction_id IS NULL AND product_id IS NULL)
  )
);

ALTER TABLE public.user_credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_credit_accounts, public.user_credit_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_credit_accounts, public.user_credit_events TO authenticated;
GRANT ALL ON public.user_credit_accounts, public.user_credit_events TO service_role;

CREATE POLICY credit_accounts_read_own ON public.user_credit_accounts
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY credit_events_read_own ON public.user_credit_events
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE FUNCTION public.initialize_new_user_credits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.user_credit_accounts (user_id, balance)
  VALUES (NEW.id, 2);
  INSERT INTO public.user_credit_events (user_id, operation_key, kind, amount, balance_after)
  VALUES (NEW.id, 'welcome', 'welcome', 2, 2);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.initialize_new_user_credits() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER initialize_new_user_credits
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.initialize_new_user_credits();

CREATE FUNCTION public.get_my_credit_wallet()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_account public.user_credit_accounts%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_account FROM public.user_credit_accounts WHERE user_id = v_user;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('initialized', false, 'balance', NULL, 'revision', NULL);
  END IF;
  RETURN jsonb_build_object('initialized', true, 'balance', v_account.balance, 'revision', v_account.revision);
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_credit_wallet() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_credit_wallet() TO authenticated;

CREATE FUNCTION public.spend_my_credits(p_amount integer, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_account public.user_credit_accounts%ROWTYPE;
  v_event public.user_credit_events%ROWTYPE;
  v_key text := 'spend:' || p_request_id::text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'A positive amount and request ID are required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_account FROM public.user_credit_accounts
  WHERE user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Existing credit balance needs migration' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v_event FROM public.user_credit_events
  WHERE user_id = v_user AND operation_key = v_key;
  IF FOUND THEN
    IF v_event.kind <> 'spend' OR v_event.amount <> -p_amount THEN
      RAISE EXCEPTION 'Request ID was reused with a different amount' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object('spent', true, 'duplicate', true, 'balance', v_account.balance, 'revision', v_account.revision);
  END IF;
  IF v_account.balance < p_amount THEN
    RETURN jsonb_build_object('spent', false, 'duplicate', false, 'balance', v_account.balance, 'revision', v_account.revision);
  END IF;
  UPDATE public.user_credit_accounts
  SET balance = balance - p_amount, revision = revision + 1, updated_at = now()
  WHERE user_id = v_user RETURNING * INTO v_account;
  INSERT INTO public.user_credit_events (user_id, operation_key, kind, amount, balance_after)
  VALUES (v_user, v_key, 'spend', -p_amount, v_account.balance);
  RETURN jsonb_build_object('spent', true, 'duplicate', false, 'balance', v_account.balance, 'revision', v_account.revision);
END;
$$;
REVOKE ALL ON FUNCTION public.spend_my_credits(integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_my_credits(integer, uuid) TO authenticated;

-- Callable ONLY by the server after it verifies the purchase with RevenueCat.
-- No client-supplied amount, balance, or verified=true flag is accepted.
CREATE FUNCTION public.apply_verified_credit_purchase(
  p_user_id uuid, p_product_id text, p_store text,
  p_environment text, p_transaction_id text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_account public.user_credit_accounts%ROWTYPE;
  v_event public.user_credit_events%ROWTYPE;
  v_amount integer;
  v_inserted uuid;
BEGIN
  v_amount := CASE p_product_id
    WHEN 'mh_credits_100' THEN 100
    WHEN 'mh_credits_500' THEN 500
    WHEN 'mh_credits_1000' THEN 1000
    ELSE NULL END;
  IF p_user_id IS NULL OR v_amount IS NULL OR
     p_store IS NULL OR p_store NOT IN ('APP_STORE', 'PLAY_STORE') OR
     p_environment IS NULL OR p_environment NOT IN ('PRODUCTION', 'SANDBOX') OR
     p_transaction_id IS NULL OR length(btrim(p_transaction_id)) NOT BETWEEN 1 AND 150 OR
     p_transaction_id <> btrim(p_transaction_id) THEN
    RAISE EXCEPTION 'Invalid purchase data' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_account FROM public.user_credit_accounts
  WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Existing credit balance needs migration' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.user_credit_events (
    user_id, operation_key, kind, amount, balance_after,
    store, environment, transaction_id, product_id
  ) VALUES (
    p_user_id, 'purchase:' || p_store || ':' || p_environment || ':' || p_transaction_id,
    'purchase', v_amount, v_account.balance + v_amount,
    p_store, p_environment, p_transaction_id, p_product_id
  ) ON CONFLICT (store, environment, transaction_id) DO NOTHING
  RETURNING id INTO v_inserted;
  IF v_inserted IS NULL THEN
    SELECT * INTO v_event FROM public.user_credit_events
    WHERE store = p_store AND environment = p_environment AND transaction_id = p_transaction_id;
    IF v_event.user_id IS DISTINCT FROM p_user_id OR v_event.product_id IS DISTINCT FROM p_product_id THEN
      RAISE EXCEPTION 'Purchase is already associated with another account or product' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('credited', false, 'duplicate', true, 'balance', v_account.balance, 'revision', v_account.revision);
  END IF;
  UPDATE public.user_credit_accounts
  SET balance = balance + v_amount, revision = revision + 1, updated_at = now()
  WHERE user_id = p_user_id RETURNING * INTO v_account;
  RETURN jsonb_build_object('credited', true, 'duplicate', false, 'balance', v_account.balance, 'revision', v_account.revision);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_verified_credit_purchase(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_credit_purchase(uuid, text, text, text, text) TO service_role;

-- Merge only changed settings so separate saves do not replace unrelated fields.
CREATE FUNCTION public.patch_my_user_settings(p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'Settings must be a JSON object' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.user_libraries (user_id, user_profile)
  VALUES (v_user, p_patch)
  ON CONFLICT (user_id) DO UPDATE
  SET user_profile = public.user_libraries.user_profile || EXCLUDED.user_profile
  RETURNING user_profile INTO v_profile;
  RETURN v_profile;
END;
$$;
REVOKE ALL ON FUNCTION public.patch_my_user_settings(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.patch_my_user_settings(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
