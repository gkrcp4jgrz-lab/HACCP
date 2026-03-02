-- ============================================
-- CONI — Phase 2A : Daily Summary + CONI Score
-- Execute dans Supabase SQL Editor
-- ============================================

-- 1. Table de resume quotidien par site
CREATE TABLE IF NOT EXISTS daily_site_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,

  -- Temperatures
  temp_expected INT DEFAULT 0,
  temp_recorded INT DEFAULT 0,
  temp_conform INT DEFAULT 0,
  temp_non_conform INT DEFAULT 0,

  -- DLC
  dlc_total INT DEFAULT 0,
  dlc_expired INT DEFAULT 0,
  dlc_warning INT DEFAULT 0,
  dlc_ok INT DEFAULT 0,

  -- Nettoyage
  cleaning_total INT DEFAULT 0,
  cleaning_done INT DEFAULT 0,
  cleaning_missed INT DEFAULT 0,

  -- Incidents
  incidents_open INT DEFAULT 0,
  incidents_resolved INT DEFAULT 0,
  incidents_urgent INT DEFAULT 0,

  -- Tracabilite
  lots_recorded INT DEFAULT 0,

  -- Commandes
  orders_pending INT DEFAULT 0,

  -- CONI Score (0-100)
  coni_score NUMERIC(5,2) DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',

  -- Metadata
  computed_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(site_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_site_date ON daily_site_summary(site_id, summary_date);

-- RLS : lecture pour membres du site, ecriture server-side uniquement
ALTER TABLE daily_site_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "summary_select" ON daily_site_summary
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

-- Bloquer ecriture directe (seule la fonction SECURITY DEFINER peut ecrire)
CREATE POLICY "summary_no_insert" ON daily_site_summary FOR INSERT WITH CHECK (false);
CREATE POLICY "summary_no_update" ON daily_site_summary FOR UPDATE USING (false);
CREATE POLICY "summary_no_delete" ON daily_site_summary FOR DELETE USING (false);


-- 2. Fonction de calcul du resume + CONI Score
CREATE OR REPLACE FUNCTION compute_daily_summary(p_site_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
  v_temp_expected INT;
  v_temp_recorded INT;
  v_temp_conform INT;
  v_temp_non_conform INT;
  v_dlc_total INT;
  v_dlc_expired INT;
  v_dlc_warning INT;
  v_cleaning_total INT;
  v_cleaning_done INT;
  v_incidents_open INT;
  v_incidents_resolved INT;
  v_incidents_urgent INT;
  v_lots_recorded INT;
  v_orders_pending INT;
  v_score NUMERIC(5,2);
  v_breakdown JSONB;
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
  v_temp_pct NUMERIC;
  v_temp_completion NUMERIC;
  v_dlc_pct NUMERIC;
  v_cleaning_pct NUMERIC;
  v_incident_penalty NUMERIC;
  v_services_per_day INT;
BEGIN
  v_day_start := (p_date::TEXT || 'T00:00:00+00')::TIMESTAMPTZ;
  v_day_end := (p_date::TEXT || 'T23:59:59+00')::TIMESTAMPTZ;

  -- Nombre de services par jour (depuis config du site)
  SELECT COALESCE((s.services_per_day)::INT, 1) INTO v_services_per_day
    FROM sites s WHERE s.id = p_site_id;
  IF v_services_per_day < 1 THEN v_services_per_day := 1; END IF;

  -- Equipements + produits actifs = nombre de releves attendus par service
  SELECT (
    (SELECT COUNT(*) FROM site_equipment WHERE site_id = p_site_id AND active = true) +
    (SELECT COUNT(*) FROM site_products WHERE site_id = p_site_id AND active = true)
  ) * v_services_per_day INTO v_temp_expected;

  -- Temperatures du jour
  SELECT
    COUNT(*),
    COALESCE(SUM(CASE WHEN is_conform THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN NOT is_conform THEN 1 ELSE 0 END), 0)
  INTO v_temp_recorded, v_temp_conform, v_temp_non_conform
  FROM temperatures
  WHERE site_id = p_site_id
    AND recorded_at >= v_day_start AND recorded_at <= v_day_end;

  -- DLC actives
  SELECT
    COUNT(*),
    COALESCE(SUM(CASE WHEN dlc_date < p_date THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN dlc_date >= p_date AND dlc_date <= p_date + 2 THEN 1 ELSE 0 END), 0)
  INTO v_dlc_total, v_dlc_expired, v_dlc_warning
  FROM dlcs
  WHERE site_id = p_site_id AND status NOT IN ('consumed', 'discarded');

  -- Nettoyage du jour
  SELECT COUNT(*) INTO v_cleaning_total
  FROM cleaning_schedules
  WHERE site_id = p_site_id AND active = true
    AND (
      frequency = 'daily'
      OR (frequency = 'weekly' AND day_of_week = EXTRACT(DOW FROM p_date)::INT)
      OR (frequency = 'monthly' AND day_of_month = EXTRACT(DAY FROM p_date)::INT)
      OR (frequency = 'one_time' AND one_time_date = p_date)
    );

  SELECT COUNT(*) INTO v_cleaning_done
  FROM cleaning_logs
  WHERE site_id = p_site_id
    AND performed_at >= v_day_start AND performed_at <= v_day_end
    AND status = 'completed';

  -- Incidents
  SELECT
    COALESCE(SUM(CASE WHEN status IN ('open','in_progress') THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN priority = 'urgent' AND status != 'resolved' THEN 1 ELSE 0 END), 0)
  INTO v_incidents_open, v_incidents_resolved, v_incidents_urgent
  FROM incident_reports
  WHERE site_id = p_site_id;

  -- Lots du jour
  SELECT COUNT(*) INTO v_lots_recorded
  FROM lots
  WHERE site_id = p_site_id
    AND recorded_at >= v_day_start AND recorded_at <= v_day_end;

  -- Commandes en attente
  SELECT COUNT(*) INTO v_orders_pending
  FROM orders
  WHERE site_id = p_site_id AND status = 'to_order';

  -- ══ CALCUL CONI SCORE ══
  -- Temperatures conformite (20%)
  v_temp_pct := CASE WHEN v_temp_recorded > 0
    THEN ROUND(v_temp_conform::NUMERIC / v_temp_recorded * 100, 1)
    ELSE 100 END;

  -- Temperatures completude (20%)
  v_temp_completion := CASE WHEN v_temp_expected > 0
    THEN LEAST(100, ROUND(v_temp_recorded::NUMERIC / v_temp_expected * 100, 1))
    ELSE 100 END;

  -- DLC conformite (25%)
  v_dlc_pct := CASE WHEN v_dlc_total > 0
    THEN ROUND((v_dlc_total - v_dlc_expired)::NUMERIC / v_dlc_total * 100, 1)
    ELSE 100 END;

  -- Nettoyage completude (20%)
  v_cleaning_pct := CASE WHEN v_cleaning_total > 0
    THEN ROUND(v_cleaning_done::NUMERIC / v_cleaning_total * 100, 1)
    ELSE 100 END;

  -- Incidents malus (15% max)
  v_incident_penalty := LEAST(15, v_incidents_urgent * 5 + v_incidents_open * 2);

  v_breakdown := jsonb_build_object(
    'temp_pct', v_temp_pct,
    'temp_completion', v_temp_completion,
    'dlc_pct', v_dlc_pct,
    'cleaning_pct', v_cleaning_pct,
    'incident_penalty', v_incident_penalty
  );

  v_score := GREATEST(0, LEAST(100,
    v_temp_pct * 0.20 +
    v_temp_completion * 0.20 +
    v_dlc_pct * 0.25 +
    v_cleaning_pct * 0.20 +
    15 - v_incident_penalty
  ));

  -- UPSERT
  INSERT INTO daily_site_summary (
    site_id, summary_date,
    temp_expected, temp_recorded, temp_conform, temp_non_conform,
    dlc_total, dlc_expired, dlc_warning, dlc_ok,
    cleaning_total, cleaning_done, cleaning_missed,
    incidents_open, incidents_resolved, incidents_urgent,
    lots_recorded, orders_pending,
    coni_score, score_breakdown, computed_at
  ) VALUES (
    p_site_id, p_date,
    v_temp_expected, v_temp_recorded, v_temp_conform, v_temp_non_conform,
    v_dlc_total, v_dlc_expired, v_dlc_warning, GREATEST(0, v_dlc_total - v_dlc_expired - v_dlc_warning),
    v_cleaning_total, v_cleaning_done, GREATEST(0, v_cleaning_total - v_cleaning_done),
    v_incidents_open, v_incidents_resolved, v_incidents_urgent,
    v_lots_recorded, v_orders_pending,
    v_score, v_breakdown, now()
  )
  ON CONFLICT (site_id, summary_date) DO UPDATE SET
    temp_expected = EXCLUDED.temp_expected,
    temp_recorded = EXCLUDED.temp_recorded,
    temp_conform = EXCLUDED.temp_conform,
    temp_non_conform = EXCLUDED.temp_non_conform,
    dlc_total = EXCLUDED.dlc_total,
    dlc_expired = EXCLUDED.dlc_expired,
    dlc_warning = EXCLUDED.dlc_warning,
    dlc_ok = EXCLUDED.dlc_ok,
    cleaning_total = EXCLUDED.cleaning_total,
    cleaning_done = EXCLUDED.cleaning_done,
    cleaning_missed = EXCLUDED.cleaning_missed,
    incidents_open = EXCLUDED.incidents_open,
    incidents_resolved = EXCLUDED.incidents_resolved,
    incidents_urgent = EXCLUDED.incidents_urgent,
    lots_recorded = EXCLUDED.lots_recorded,
    orders_pending = EXCLUDED.orders_pending,
    coni_score = EXCLUDED.coni_score,
    score_breakdown = EXCLUDED.score_breakdown,
    computed_at = now();

  RETURN jsonb_build_object('score', v_score, 'breakdown', v_breakdown);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Index pour performances dashboard
CREATE INDEX IF NOT EXISTS idx_temps_site_date ON temperatures(site_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_dlcs_site_status ON dlcs(site_id, status);
CREATE INDEX IF NOT EXISTS idx_cleaning_logs_site_date ON cleaning_logs(site_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_orders_site_status ON orders(site_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_site_status ON incident_reports(site_id, status);
CREATE INDEX IF NOT EXISTS idx_lots_site_status ON lots(site_id, status);


-- 4. pg_cron : calcul nocturne pour tous les sites (23h55 chaque jour)
-- NOTE : executer cette ligne UNIQUEMENT si pg_cron est disponible
-- SELECT cron.schedule('nightly-coni-summary', '55 23 * * *', $$
--   SELECT compute_daily_summary(id, CURRENT_DATE) FROM sites;
-- $$);
