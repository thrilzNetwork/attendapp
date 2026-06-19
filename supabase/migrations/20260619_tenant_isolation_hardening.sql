-- Tenant isolation hardening (2026-06-19)
-- Closes cross-tenant data-leak vectors found during an isolation audit.

-- 1. staff_accounts had RLS DISABLED, so the (correct) hotel-scoped policies were
--    never enforced — the public anon key could read every hotel's staff/vendor
--    emails, PINs, and setup tokens. Enable RLS and replace the over-permissive
--    "block_anon" policy (which actually granted every authenticated user access to
--    all rows) with a single strict hotel-scoped policy. Service role bypasses RLS.
ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_accounts_block_anon ON staff_accounts;
DROP POLICY IF EXISTS staff_accounts_select ON staff_accounts;
DROP POLICY IF EXISTS staff_accounts_insert ON staff_accounts;
DROP POLICY IF EXISTS staff_accounts_update ON staff_accounts;

CREATE POLICY staff_accounts_own_hotel ON staff_accounts
  FOR ALL
  USING (
    (hotel_id::text = get_user_hotel_id())
    OR is_superadmin()
    OR (current_setting('role', true) = 'service_role')
  )
  WITH CHECK (
    (hotel_id::text = get_user_hotel_id())
    OR is_superadmin()
    OR (current_setting('role', true) = 'service_role')
  );

-- 2. bouncie_* tables had a wide-open "using(true)" policy for the public role,
--    exposing every hotel's Bouncie OAuth access/refresh tokens to the anon key.
--    Replace with hotel-scoped access; service role still bypasses RLS for the
--    /api/bouncie/* routes.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bouncie_connections','bouncie_devices','bouncie_locations','bouncie_trips','bouncie_geozones']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON %I', t);
    EXECUTE format($p$
      CREATE POLICY "%1$s_own_hotel" ON %1$I
      FOR ALL
      USING ((hotel_id::text = get_user_hotel_id()) OR is_superadmin())
      WITH CHECK ((hotel_id::text = get_user_hotel_id()) OR is_superadmin())
    $p$, t);
  END LOOP;
END $$;

-- 3. partners is intentionally readable by the anon key (no-login guest catalog),
--    but the row included financial/secret columns. Restrict anon + authenticated
--    to a safe column allow-list so Stripe/Clover/payout fields can never be read
--    via the public key once vendors onboard. Service role keeps full access.
REVOKE SELECT ON partners FROM anon, authenticated;
GRANT SELECT (
  id, hotel_id, name, category, description, image_url, phone, address,
  hours, distance, rating, has_ordering, is_active, created_at,
  email, google_place_id, delivery_providers, lat, lng
) ON partners TO anon, authenticated;
