-- ============================================
-- CONI — Phase 1A : Audit Trail automatique
-- Execute dans Supabase SQL Editor
-- ============================================

-- 1. Table audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID,
  user_name TEXT DEFAULT '',
  site_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index pour requetes performantes
CREATE INDEX IF NOT EXISTS idx_audit_logs_site ON audit_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- 3. RLS : lecture super_admin + admin du site uniquement, ecriture bloquee (trigger only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
  is_super_admin()
  OR is_admin_of_site(site_id)
);

-- Bloquer toute ecriture directe depuis le client
CREATE POLICY "audit_logs_no_insert" ON audit_logs FOR INSERT WITH CHECK (false);
CREATE POLICY "audit_logs_no_update" ON audit_logs FOR UPDATE USING (false);
CREATE POLICY "audit_logs_no_delete" ON audit_logs FOR DELETE USING (false);

-- 4. Fonction trigger generique
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_changed TEXT[];
  v_site_id UUID;
  v_user_id UUID;
  v_user_name TEXT;
  v_key TEXT;
BEGIN
  v_user_id := auth.uid();

  -- Lookup nom utilisateur
  SELECT full_name INTO v_user_name FROM profiles WHERE id = v_user_id;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_changed := NULL;
    v_site_id := CASE WHEN v_old ? 'site_id' THEN (v_old->>'site_id')::UUID ELSE NULL END;
  ELSIF TG_OP = 'INSERT' THEN
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_changed := NULL;
    v_site_id := CASE WHEN v_new ? 'site_id' THEN (v_new->>'site_id')::UUID ELSE NULL END;
  ELSE -- UPDATE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_site_id := CASE WHEN v_new ? 'site_id' THEN (v_new->>'site_id')::UUID ELSE NULL END;

    -- Calculer les champs modifies
    v_changed := ARRAY[]::TEXT[];
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_old->v_key IS DISTINCT FROM v_new->v_key THEN
        v_changed := v_changed || v_key;
      END IF;
    END LOOP;

    -- Si aucun champ n'a change, ne pas logger
    IF array_length(v_changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Inserer le log (bypass RLS via SECURITY DEFINER)
  INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_fields, user_id, user_name, site_id)
  VALUES (
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN (v_old->>'id')::UUID
      ELSE (v_new->>'id')::UUID
    END,
    TG_OP,
    v_old,
    v_new,
    v_changed,
    v_user_id,
    COALESCE(v_user_name, ''),
    v_site_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attacher les triggers sur les tables critiques HACCP

-- Temperatures (obligatoire HACCP)
DROP TRIGGER IF EXISTS audit_temperatures ON temperatures;
CREATE TRIGGER audit_temperatures
  AFTER INSERT OR UPDATE OR DELETE ON temperatures
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- DLC (obligatoire HACCP)
DROP TRIGGER IF EXISTS audit_dlcs ON dlcs;
CREATE TRIGGER audit_dlcs
  AFTER INSERT OR UPDATE OR DELETE ON dlcs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Lots / tracabilite (obligatoire HACCP)
DROP TRIGGER IF EXISTS audit_lots ON lots;
CREATE TRIGGER audit_lots
  AFTER INSERT OR UPDATE OR DELETE ON lots
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Incidents (obligatoire HACCP)
DROP TRIGGER IF EXISTS audit_incident_reports ON incident_reports;
CREATE TRIGGER audit_incident_reports
  AFTER INSERT OR UPDATE OR DELETE ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Nettoyage logs (obligatoire HACCP)
DROP TRIGGER IF EXISTS audit_cleaning_logs ON cleaning_logs;
CREATE TRIGGER audit_cleaning_logs
  AFTER INSERT OR UPDATE OR DELETE ON cleaning_logs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Commandes
DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Equipements (config sensible)
DROP TRIGGER IF EXISTS audit_site_equipment ON site_equipment;
CREATE TRIGGER audit_site_equipment
  AFTER INSERT OR UPDATE OR DELETE ON site_equipment
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Profils utilisateurs (changements de role)
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
