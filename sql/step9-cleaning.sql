-- ============================================
-- HACCP Pro — Step 9: Plan de nettoyage
-- ============================================

-- Taches de nettoyage recurrentes configurees par le gerant
CREATE TABLE cleaning_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  zone TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  assigned_role TEXT NOT NULL DEFAULT 'employee',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cleaning_schedules_site ON cleaning_schedules(site_id);

ALTER TABLE cleaning_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cleaning_schedules_select" ON cleaning_schedules FOR SELECT USING (true);
CREATE POLICY "cleaning_schedules_insert" ON cleaning_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "cleaning_schedules_update" ON cleaning_schedules FOR UPDATE USING (true);
CREATE POLICY "cleaning_schedules_delete" ON cleaning_schedules FOR DELETE USING (true);

-- Enregistrements de nettoyage effectues par les employes
CREATE TABLE cleaning_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  schedule_id UUID REFERENCES cleaning_schedules(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','skipped')),
  notes TEXT DEFAULT '',
  photo_data TEXT,
  recorded_by UUID NOT NULL,
  recorded_by_name TEXT DEFAULT '',
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cleaning_records_site ON cleaning_records(site_id);
CREATE INDEX idx_cleaning_records_schedule ON cleaning_records(schedule_id);
CREATE INDEX idx_cleaning_records_date ON cleaning_records(recorded_at);

ALTER TABLE cleaning_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cleaning_records_select" ON cleaning_records FOR SELECT USING (true);
CREATE POLICY "cleaning_records_insert" ON cleaning_records FOR INSERT WITH CHECK (true);
CREATE POLICY "cleaning_records_update" ON cleaning_records FOR UPDATE USING (true);
