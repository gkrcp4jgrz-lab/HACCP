-- ============================================================
-- PHASE 7 — UX Fixes (Site/User Management)
-- ============================================================

-- FIX 1: Ensure super_admin can UPDATE site_products (disable/delete)
-- Drop existing policy if it exists and recreate with super_admin check
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'site_products_update_admin' AND tablename = 'site_products') THEN
    DROP POLICY site_products_update_admin ON site_products;
  END IF;
END $$;

CREATE POLICY site_products_update_admin ON site_products
  FOR UPDATE USING (
    is_super_admin()
    OR is_admin_of_site(site_id)
  );

-- FIX 2: Ensure super_admin can UPDATE site_equipment
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'site_equipment_update_admin' AND tablename = 'site_equipment') THEN
    DROP POLICY site_equipment_update_admin ON site_equipment;
  END IF;
END $$;

CREATE POLICY site_equipment_update_admin ON site_equipment
  FOR UPDATE USING (
    is_super_admin()
    OR is_admin_of_site(site_id)
  );

-- FIX 3: Allow super_admin to DELETE from profiles (for user deletion)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_delete_admin' AND tablename = 'profiles') THEN
    DROP POLICY profiles_delete_admin ON profiles;
  END IF;
END $$;

CREATE POLICY profiles_delete_admin ON profiles
  FOR DELETE USING (
    is_super_admin()
  );

-- FIX 4: Allow super_admin to DELETE from user_sites (for user deletion)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_sites_delete_admin' AND tablename = 'user_sites') THEN
    DROP POLICY user_sites_delete_admin ON user_sites;
  END IF;
END $$;

CREATE POLICY user_sites_delete_admin ON user_sites
  FOR DELETE USING (
    is_super_admin()
    OR is_admin_of_site(site_id)
  );
