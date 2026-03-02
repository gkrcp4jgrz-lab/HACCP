-- ============================================
-- CONI — Phase 1B : Durcissement RLS
-- Execute dans Supabase SQL Editor
-- ============================================
-- CRITIQUE : cleaning_schedules et cleaning_logs avaient USING(true)
-- = tout utilisateur authentifie pouvait lire/modifier les donnees de TOUS les sites

-- ── 1. Corriger cleaning_schedules ──

DROP POLICY IF EXISTS "cleaning_schedules_select" ON cleaning_schedules;
DROP POLICY IF EXISTS "cleaning_schedules_insert" ON cleaning_schedules;
DROP POLICY IF EXISTS "cleaning_schedules_update" ON cleaning_schedules;
DROP POLICY IF EXISTS "cleaning_schedules_delete" ON cleaning_schedules;

CREATE POLICY "cleaning_schedules_select" ON cleaning_schedules
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "cleaning_schedules_insert" ON cleaning_schedules
  FOR INSERT WITH CHECK (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "cleaning_schedules_update" ON cleaning_schedules
  FOR UPDATE USING (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "cleaning_schedules_delete" ON cleaning_schedules
  FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());

-- ── 2. Corriger cleaning_logs ──

DROP POLICY IF EXISTS "cleaning_logs_select" ON cleaning_logs;
DROP POLICY IF EXISTS "cleaning_logs_insert" ON cleaning_logs;
DROP POLICY IF EXISTS "cleaning_logs_update" ON cleaning_logs;
DROP POLICY IF EXISTS "cleaning_logs_delete" ON cleaning_logs;

CREATE POLICY "cleaning_logs_select" ON cleaning_logs
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "cleaning_logs_insert" ON cleaning_logs
  FOR INSERT WITH CHECK (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "cleaning_logs_update" ON cleaning_logs
  FOR UPDATE USING (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "cleaning_logs_delete" ON cleaning_logs
  FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());

-- ── 3. Ajouter RLS sur consumption_logs (table sans aucune policy) ──

ALTER TABLE consumption_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consumption_logs_select" ON consumption_logs;
DROP POLICY IF EXISTS "consumption_logs_insert" ON consumption_logs;
DROP POLICY IF EXISTS "consumption_logs_update" ON consumption_logs;
DROP POLICY IF EXISTS "consumption_logs_delete" ON consumption_logs;

CREATE POLICY "consumption_logs_select" ON consumption_logs
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "consumption_logs_insert" ON consumption_logs
  FOR INSERT WITH CHECK (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "consumption_logs_update" ON consumption_logs
  FOR UPDATE USING (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "consumption_logs_delete" ON consumption_logs
  FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());
