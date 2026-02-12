-- =====================================================================
-- ÉTAPE 7 : TABLE INCIDENT REPORTS (SIGNALEMENTS)
-- =====================================================================

-- Table des signalements
CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',  -- equipment, hygiene, temperature, product, other
  priority TEXT NOT NULL DEFAULT 'normal', -- normal, urgent
  status TEXT NOT NULL DEFAULT 'open',     -- open, in_progress, resolved
  reported_by UUID REFERENCES auth.users(id),
  reported_by_name TEXT DEFAULT '',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_by_name TEXT DEFAULT '',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_incident_reports_site ON incident_reports(site_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);

-- RLS
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs assignés au site peuvent voir et créer
CREATE POLICY "incident_reports_select" ON incident_reports FOR SELECT USING (
  site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "incident_reports_insert" ON incident_reports FOR INSERT WITH CHECK (
  site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Politique : seuls managers/super_admin peuvent modifier (résoudre)
CREATE POLICY "incident_reports_update" ON incident_reports FOR UPDATE USING (
  site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid() AND site_role IN ('manager','admin'))
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Politique : seuls managers/super_admin peuvent supprimer
CREATE POLICY "incident_reports_delete" ON incident_reports FOR DELETE USING (
  site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid() AND site_role IN ('manager','admin'))
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
