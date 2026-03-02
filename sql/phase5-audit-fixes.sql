-- ============================================
-- CONI — Phase 5+ : Correctifs Audit Complet
-- Execute dans Supabase SQL Editor (dans l'ordre)
-- ============================================


-- ═══════════════════════════════════════════════════════════════
-- #32 : FIX TIMEZONE — compute_daily_summary utilise Europe/Paris
-- ═══════════════════════════════════════════════════════════════

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
  -- FIX: Utilise Europe/Paris au lieu de UTC pour les bornes du jour
  v_day_start := (p_date::TEXT || ' 00:00:00')::TIMESTAMP AT TIME ZONE 'Europe/Paris';
  v_day_end := (p_date::TEXT || ' 23:59:59')::TIMESTAMP AT TIME ZONE 'Europe/Paris';

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
  v_temp_pct := CASE WHEN v_temp_recorded > 0
    THEN ROUND(v_temp_conform::NUMERIC / v_temp_recorded * 100, 1)
    ELSE 100 END;

  v_temp_completion := CASE WHEN v_temp_expected > 0
    THEN LEAST(100, ROUND(v_temp_recorded::NUMERIC / v_temp_expected * 100, 1))
    ELSE 100 END;

  v_dlc_pct := CASE WHEN v_dlc_total > 0
    THEN ROUND((v_dlc_total - v_dlc_expired)::NUMERIC / v_dlc_total * 100, 1)
    ELSE 100 END;

  v_cleaning_pct := CASE WHEN v_cleaning_total > 0
    THEN ROUND(v_cleaning_done::NUMERIC / v_cleaning_total * 100, 1)
    ELSE 100 END;

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


-- ═══════════════════════════════════════════════════════════════
-- #33 : CLEANING_LOGS — Prevention duplicata + performed_by check
-- ═══════════════════════════════════════════════════════════════

-- Index unique partiel : une seule entree active par schedule par jour
-- (les annulees ne comptent pas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cleaning_logs_unique_per_day
  ON cleaning_logs (site_id, schedule_id, (performed_at::date))
  WHERE status != 'cancelled';

-- RLS : INSERT doit verifier que performed_by = auth.uid()
-- (empeche un utilisateur d'inserer des logs au nom d'un autre)
DROP POLICY IF EXISTS "cleaning_logs_insert" ON cleaning_logs;
CREATE POLICY "cleaning_logs_insert" ON cleaning_logs
  FOR INSERT WITH CHECK (
    is_member_of_site(site_id) AND performed_by = auth.uid()
  );


-- ═══════════════════════════════════════════════════════════════
-- #34 : INCIDENT_REPORTS — CHECK constraints + resolution_notes
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT now();

-- CHECK constraints (utilise DO block pour ignorer si deja existant)
DO $$ BEGIN
  ALTER TABLE incident_reports ADD CONSTRAINT chk_ir_category
    CHECK (category IN ('equipment', 'hygiene', 'temperature', 'product', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE incident_reports ADD CONSTRAINT chk_ir_priority
    CHECK (priority IN ('normal', 'urgent'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE incident_reports ADD CONSTRAINT chk_ir_status
    CHECK (status IN ('open', 'in_progress', 'resolved'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Mettre a jour status_changed_at automatiquement quand status change
CREATE OR REPLACE FUNCTION update_incident_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incident_status_changed ON incident_reports;
CREATE TRIGGER trg_incident_status_changed
  BEFORE UPDATE ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION update_incident_status_changed_at();

-- Fix escalade : utiliser status_changed_at au lieu de created_at
CREATE OR REPLACE FUNCTION escalate_incidents()
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_rec RECORD;
  v_hours NUMERIC;
  v_new_level INT;
BEGIN
  FOR v_rec IN
    SELECT id, COALESCE(status_changed_at, created_at) AS ref_time, escalation_level
    FROM incident_reports
    WHERE status IN ('open', 'in_progress')
      AND priority = 'urgent'
  LOOP
    v_hours := EXTRACT(EPOCH FROM (now() - v_rec.ref_time)) / 3600;
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


-- ═══════════════════════════════════════════════════════════════
-- #40 : CHECK CONSTRAINTS — temperatures, orders
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE temperatures ADD CONSTRAINT chk_temp_value
    CHECK (value >= -100 AND value <= 500);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT chk_order_qty
    CHECK (quantity > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- #38 : CONSUMPTION_LOGS — Schema de reference
-- (a executer seulement si la table n'existe pas deja)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS consumption_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity_consumed NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'unite',
  consumed_by UUID REFERENCES auth.users(id),
  consumed_by_name TEXT,
  consumed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT DEFAULT '',
  dlc_entries JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE consumption_logs ENABLE ROW LEVEL SECURITY;

-- RLS pour consumption_logs (si policies n'existent pas)
DO $$ BEGIN
  CREATE POLICY "cl_select" ON consumption_logs
    FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cl_insert" ON consumption_logs
    FOR INSERT WITH CHECK (is_member_of_site(site_id) AND consumed_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cl_update" ON consumption_logs
    FOR UPDATE USING (is_admin_of_site(site_id) OR is_super_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cl_delete" ON consumption_logs
    FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- #38 : AUDIT TRAIL — Tables manquantes
-- ═══════════════════════════════════════════════════════════════

-- Ajouter le trigger d'audit aux tables non couvertes
-- (la fonction audit_trigger_func() doit deja exister de phase1a)

DO $$ BEGIN
  CREATE TRIGGER audit_cleaning_schedules
    AFTER INSERT OR UPDATE OR DELETE ON cleaning_schedules
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_sites
    AFTER INSERT OR UPDATE OR DELETE ON sites
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_user_sites
    AFTER INSERT OR UPDATE OR DELETE ON user_sites
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_consumption_logs
    AFTER INSERT OR UPDATE OR DELETE ON consumption_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_consignes
    AFTER INSERT OR UPDATE OR DELETE ON consignes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_site_products
    AFTER INSERT OR UPDATE OR DELETE ON site_products
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER audit_site_suppliers
    AFTER INSERT OR UPDATE OR DELETE ON site_suppliers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- #39 : RPC FONCTIONS ATOMIQUES — Remplacent les operations
--       multi-step client-side non-atomiques
-- ═══════════════════════════════════════════════════════════════

-- 39a. Consommation partielle DLC (atomique)
CREATE OR REPLACE FUNCTION rpc_partial_consume_dlc(
  p_dlc_id UUID,
  p_qty INT,
  p_new_status TEXT,
  p_user_id UUID,
  p_user_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_dlc RECORD;
  v_current_qty INT;
BEGIN
  -- Verrouiller la ligne pour eviter les races conditions
  SELECT * INTO v_dlc FROM dlcs WHERE id = p_dlc_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'DLC introuvable');
  END IF;

  v_current_qty := COALESCE(v_dlc.quantity, 1);

  IF p_qty >= v_current_qty THEN
    -- Consommer tout
    UPDATE dlcs SET status = p_new_status WHERE id = p_dlc_id;
  ELSE
    -- Reduire l'original
    UPDATE dlcs SET quantity = v_current_qty - p_qty WHERE id = p_dlc_id;
    -- Creer la copie consommee/jetee
    INSERT INTO dlcs (site_id, product_name, dlc_date, lot_number, notes, quantity, status,
                      opened_at, shelf_life_days, recorded_by, recorded_by_name)
    VALUES (v_dlc.site_id, v_dlc.product_name, v_dlc.dlc_date,
            COALESCE(v_dlc.lot_number, ''), COALESCE(v_dlc.notes, ''),
            p_qty, p_new_status,
            v_dlc.opened_at, v_dlc.shelf_life_days,
            p_user_id, p_user_name);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 39b. Consommation partielle Lot (atomique)
CREATE OR REPLACE FUNCTION rpc_partial_consume_lot(
  p_lot_id UUID,
  p_qty INT,
  p_new_status TEXT,
  p_user_id UUID,
  p_user_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_lot RECORD;
  v_current_qty INT;
BEGIN
  SELECT * INTO v_lot FROM lots WHERE id = p_lot_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Lot introuvable');
  END IF;

  v_current_qty := COALESCE(v_lot.quantity, 1);

  IF p_qty >= v_current_qty THEN
    UPDATE lots SET status = p_new_status WHERE id = p_lot_id;
  ELSE
    UPDATE lots SET quantity = v_current_qty - p_qty WHERE id = p_lot_id;
    INSERT INTO lots (site_id, product_name, lot_number, supplier_name, dlc_date, notes,
                      quantity, status, recorded_by, recorded_by_name)
    VALUES (v_lot.site_id, v_lot.product_name, v_lot.lot_number,
            COALESCE(v_lot.supplier_name, ''), v_lot.dlc_date,
            COALESCE(v_lot.notes, ''),
            p_qty, p_new_status,
            p_user_id, p_user_name);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 39c. Ouverture de colis (atomique)
CREATE OR REPLACE FUNCTION rpc_open_package(
  p_dlc_id UUID,
  p_shelf_life_days INT DEFAULT 3
) RETURNS JSONB AS $$
DECLARE
  v_dlc RECORD;
  v_qty INT;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_dlc FROM dlcs WHERE id = p_dlc_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Produit introuvable');
  END IF;

  v_qty := COALESCE(v_dlc.quantity, 1);

  IF v_qty > 1 THEN
    -- Scinder : decrementer l'original + creer entree ouverte
    UPDATE dlcs SET quantity = v_qty - 1 WHERE id = p_dlc_id;
    INSERT INTO dlcs (site_id, product_name, lot_number, dlc_date, supplier_name,
                      unit, quantity, status, opened_at, shelf_life_days)
    VALUES (v_dlc.site_id, v_dlc.product_name, COALESCE(v_dlc.lot_number, ''),
            v_dlc.dlc_date, COALESCE(v_dlc.supplier_name, ''),
            COALESCE(v_dlc.unit, 'unite'), 1, 'active',
            v_now, p_shelf_life_days);
  ELSE
    -- Paquet unique : ouvrir directement
    UPDATE dlcs SET opened_at = v_now, shelf_life_days = p_shelf_life_days
    WHERE id = p_dlc_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 39d. Consommation FIFO (atomique)
CREATE OR REPLACE FUNCTION rpc_record_consumption_fifo(
  p_site_id UUID,
  p_product_name TEXT,
  p_qty_to_consume INT,
  p_unit TEXT,
  p_notes TEXT,
  p_user_id UUID,
  p_user_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_dlc RECORD;
  v_remaining INT;
  v_available INT;
  v_taken INT;
  v_new_qty INT;
  v_dlc_entries JSONB := '[]'::JSONB;
  v_total_available INT := 0;
BEGIN
  v_remaining := p_qty_to_consume;

  -- Calculer le stock total disponible
  SELECT COALESCE(SUM(COALESCE(quantity, 1)), 0) INTO v_total_available
  FROM dlcs
  WHERE site_id = p_site_id
    AND product_name = p_product_name
    AND opened_at IS NULL
    AND status NOT IN ('consumed', 'discarded');

  IF v_total_available < p_qty_to_consume THEN
    RETURN jsonb_build_object('error', 'Stock insuffisant — disponible : ' || v_total_available || ' ' || p_unit);
  END IF;

  -- Parcourir en FIFO (DLC la plus proche en premier)
  FOR v_dlc IN
    SELECT * FROM dlcs
    WHERE site_id = p_site_id
      AND product_name = p_product_name
      AND opened_at IS NULL
      AND status NOT IN ('consumed', 'discarded')
    ORDER BY dlc_date ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_available := COALESCE(v_dlc.quantity, 1);
    v_taken := LEAST(v_available, v_remaining);
    v_new_qty := v_available - v_taken;

    IF v_new_qty <= 0 THEN
      UPDATE dlcs SET status = 'consumed' WHERE id = v_dlc.id;
    ELSE
      UPDATE dlcs SET quantity = v_new_qty WHERE id = v_dlc.id;
    END IF;

    v_dlc_entries := v_dlc_entries || jsonb_build_array(jsonb_build_object(
      'dlc_id', v_dlc.id,
      'lot_number', COALESCE(v_dlc.lot_number, ''),
      'dlc_date', v_dlc.dlc_date,
      'qty_taken', v_taken
    ));

    v_remaining := v_remaining - v_taken;
  END LOOP;

  -- Enregistrer la consommation
  INSERT INTO consumption_logs (site_id, product_name, quantity_consumed, unit,
                                consumed_by, consumed_by_name, consumed_at, notes, dlc_entries)
  VALUES (p_site_id, p_product_name, p_qty_to_consume, COALESCE(p_unit, 'unite'),
          p_user_id, p_user_name, now(), COALESCE(p_notes, ''), v_dlc_entries);

  RETURN jsonb_build_object('ok', true, 'entries', v_dlc_entries);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════
-- #35 : RPC MULTI-SITE ALERT COUNTS
-- Remplace les 7*N queries par 1 seul appel
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION rpc_multi_site_alert_counts(p_site_ids UUID[])
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_sid UUID;
  v_today DATE := CURRENT_DATE;
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
  v_temp_nc INT;
  v_dlc_expired INT;
  v_dlc_warning INT;
  v_incidents_open INT;
  v_incidents_urgent INT;
  v_cleaning_total INT;
  v_cleaning_done INT;
BEGIN
  v_day_start := (v_today::TEXT || ' 00:00:00')::TIMESTAMP AT TIME ZONE 'Europe/Paris';
  v_day_end := (v_today::TEXT || ' 23:59:59')::TIMESTAMP AT TIME ZONE 'Europe/Paris';

  FOREACH v_sid IN ARRAY p_site_ids LOOP
    -- Temperatures non conformes aujourd'hui
    SELECT COUNT(*) INTO v_temp_nc
    FROM temperatures
    WHERE site_id = v_sid AND NOT is_conform
      AND recorded_at >= v_day_start AND recorded_at <= v_day_end;

    -- DLC expirees + proches
    SELECT
      COALESCE(SUM(CASE WHEN dlc_date < v_today THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN dlc_date >= v_today AND dlc_date <= v_today + 2 THEN 1 ELSE 0 END), 0)
    INTO v_dlc_expired, v_dlc_warning
    FROM dlcs
    WHERE site_id = v_sid AND status NOT IN ('consumed', 'discarded');

    -- Incidents
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('open','in_progress') THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN priority = 'urgent' AND status != 'resolved' THEN 1 ELSE 0 END), 0)
    INTO v_incidents_open, v_incidents_urgent
    FROM incident_reports
    WHERE site_id = v_sid;

    -- Nettoyage
    SELECT COUNT(*) INTO v_cleaning_total
    FROM cleaning_schedules
    WHERE site_id = v_sid AND active = true
      AND (frequency = 'daily'
        OR (frequency = 'weekly' AND day_of_week = EXTRACT(DOW FROM v_today)::INT)
        OR (frequency = 'monthly' AND day_of_month = EXTRACT(DAY FROM v_today)::INT));

    SELECT COUNT(*) INTO v_cleaning_done
    FROM cleaning_logs
    WHERE site_id = v_sid
      AND performed_at >= v_day_start AND performed_at <= v_day_end
      AND status = 'completed';

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'site_id', v_sid,
      'temp_nc', v_temp_nc,
      'dlc_expired', v_dlc_expired,
      'dlc_warning', v_dlc_warning,
      'incidents_open', v_incidents_open,
      'incidents_urgent', v_incidents_urgent,
      'cleaning_total', v_cleaning_total,
      'cleaning_done', v_cleaning_done
    ));
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════
-- #41 : pg_cron — Activer les jobs planifies
-- NOTE: Activer d'abord l'extension pg_cron dans le dashboard
-- Supabase > Database > Extensions > pg_cron > Enable
-- ═══════════════════════════════════════════════════════════════

-- Verifier que l'extension est activee avant de planifier
DO $$ BEGIN
  -- Calcul CONI Score nocturne (23h55 Europe/Paris)
  PERFORM cron.schedule(
    'nightly-coni-summary',
    '55 21 * * *',  -- 21h55 UTC = 23h55 Paris (hiver) / 22h55 UTC = 00h55 Paris+1 (ete)
    $$SELECT compute_daily_summary(id, CURRENT_DATE) FROM sites$$
  );

  -- Escalade incidents toutes les 30 min
  PERFORM cron.schedule(
    'escalate-incidents',
    '*/30 * * * *',
    $$SELECT escalate_incidents()$$
  );

  -- Archivage temperatures mensuel (1er du mois a 3h UTC)
  PERFORM cron.schedule(
    'monthly-archive-temps',
    '0 3 1 * *',
    $$SELECT archive_old_temperatures(90)$$
  );

  RAISE NOTICE 'pg_cron jobs scheduled successfully';
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'pg_cron non disponible — activez l extension dans le dashboard Supabase';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'pg_cron — privileges insuffisants, activez via le dashboard';
END $$;
