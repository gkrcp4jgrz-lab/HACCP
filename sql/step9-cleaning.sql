-- ============================================
-- HACCP Pro — Step 9: Plan de nettoyage
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Taches de nettoyage recurrentes
CREATE TABLE cleaning_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  frequency TEXT NOT NULL, -- daily / weekly / monthly / custom
  day_of_week INTEGER,
  day_of_month INTEGER,
  custom_interval_days INTEGER,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Logs des nettoyages effectues
CREATE TABLE cleaning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES cleaning_schedules(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT DEFAULT '',
  performed_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'completed', -- completed / missed / partial
  notes TEXT DEFAULT '',
  photo_data TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_cleaning_schedules_site ON cleaning_schedules(site_id);
CREATE INDEX idx_cleaning_logs_site ON cleaning_logs(site_id);
CREATE INDEX idx_cleaning_logs_schedule ON cleaning_logs(schedule_id);

-- RLS
ALTER TABLE cleaning_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cleaning_schedules_select" ON cleaning_schedules FOR SELECT USING (true);
CREATE POLICY "cleaning_schedules_insert" ON cleaning_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "cleaning_schedules_update" ON cleaning_schedules FOR UPDATE USING (true);
CREATE POLICY "cleaning_schedules_delete" ON cleaning_schedules FOR DELETE USING (true);

ALTER TABLE cleaning_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cleaning_logs_select" ON cleaning_logs FOR SELECT USING (true);
CREATE POLICY "cleaning_logs_insert" ON cleaning_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "cleaning_logs_update" ON cleaning_logs FOR UPDATE USING (true);
