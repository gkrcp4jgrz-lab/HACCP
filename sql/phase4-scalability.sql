-- ============================================
-- CONI — Phase 4 : Scalabilite
-- Execute dans Supabase SQL Editor
-- ============================================

-- ── 4C. Escalade incidents ──

ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS escalation_level INT DEFAULT 0;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMPTZ;

-- Fonction d'escalade automatique
CREATE OR REPLACE FUNCTION escalate_incidents()
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_rec RECORD;
  v_hours NUMERIC;
  v_new_level INT;
BEGIN
  FOR v_rec IN
    SELECT id, created_at, escalation_level
    FROM incident_reports
    WHERE status IN ('open', 'in_progress')
      AND priority = 'urgent'
  LOOP
    v_hours := EXTRACT(EPOCH FROM (now() - v_rec.created_at)) / 3600;
    v_new_level := CASE
      WHEN v_hours >= 24 THEN 4
      WHEN v_hours >= 12 THEN 3
      WHEN v_hours >= 6 THEN 2
      WHEN v_hours >= 2 THEN 1
      ELSE 0
    END;

    IF v_new_level > v_rec.escalation_level THEN
      UPDATE incident_reports
      SET escalation_level = v_new_level, last_escalated_at = now()
      WHERE id = v_rec.id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- pg_cron : escalade toutes les 30 min
-- SELECT cron.schedule('escalate-incidents', '*/30 * * * *', $$
--   SELECT escalate_incidents();
-- $$);


-- ── 4A. Archivage temperatures ──

CREATE TABLE IF NOT EXISTS temperatures_archive (
  LIKE temperatures INCLUDING ALL
);

ALTER TABLE temperatures_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "temp_archive_select" ON temperatures_archive
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

-- Fonction d'archivage (deplace les records > N jours)
CREATE OR REPLACE FUNCTION archive_old_temperatures(p_days_to_keep INT DEFAULT 90)
RETURNS INT AS $$
DECLARE
  v_count INT;
  v_cutoff TIMESTAMPTZ;
BEGIN
  v_cutoff := now() - (p_days_to_keep || ' days')::INTERVAL;

  WITH moved AS (
    DELETE FROM temperatures
    WHERE recorded_at < v_cutoff
    RETURNING *
  )
  INSERT INTO temperatures_archive SELECT * FROM moved;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- pg_cron : archivage mensuel (1er du mois a 3h)
-- SELECT cron.schedule('monthly-archive-temps', '0 3 1 * *', $$
--   SELECT archive_old_temperatures(90);
-- $$);


-- ── 4D. Index manquants ──
-- (deja inclus dans phase2a-daily-summary.sql mais repetes ici par securite)

CREATE INDEX IF NOT EXISTS idx_temps_site_date ON temperatures(site_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_dlcs_site_status ON dlcs(site_id, status);
CREATE INDEX IF NOT EXISTS idx_cleaning_logs_site_date ON cleaning_logs(site_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_orders_site_status ON orders(site_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_site_status ON incident_reports(site_id, status);
CREATE INDEX IF NOT EXISTS idx_lots_site_status ON lots(site_id, status);
CREATE INDEX IF NOT EXISTS idx_consignes_site ON consignes(site_id, created_at);
CREATE INDEX IF NOT EXISTS idx_consumption_logs_site ON consumption_logs(site_id, consumed_at);
