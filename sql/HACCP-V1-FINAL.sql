-- =====================================================================
-- HACCP PRO V1 — SQL COMPLET (TABLES + SÉCURITÉ)
-- Exécuter dans Supabase SQL Editor EN UNE SEULE FOIS
-- Ce fichier est autosuffisant : il crée tout de zéro
-- =====================================================================

-- =====================================================================
-- A. TABLES
-- =====================================================================

-- 1. Profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('super_admin','manager','employee')),
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Ajout colonne phone si absente
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone') THEN
    ALTER TABLE profiles ADD COLUMN phone TEXT DEFAULT '';
  END IF;
END $$;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Sites
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'hotel' CHECK (type IN ('hotel','restaurant','cuisine_centrale','autre')),
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  agrement TEXT DEFAULT '',
  responsable TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- 3. Liaison utilisateurs <-> sites
CREATE TABLE IF NOT EXISTS user_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  site_role TEXT NOT NULL DEFAULT 'employee' CHECK (site_role IN ('admin','manager','employee')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, site_id)
);
ALTER TABLE user_sites ENABLE ROW LEVEL SECURITY;

-- 4. Équipements par site
CREATE TABLE IF NOT EXISTS site_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'fridge' CHECK (type IN ('fridge','freezer','hot','other')),
  temp_min NUMERIC DEFAULT -30,
  temp_max NUMERIC DEFAULT 10,
  emoji TEXT DEFAULT '❄️',
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE site_equipment ENABLE ROW LEVEL SECURITY;

-- 5. Produits par site
CREATE TABLE IF NOT EXISTS site_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'frigo' CHECK (category IN ('frigo','congel','chaud','autre')),
  emoji TEXT DEFAULT '📦',
  temp_min NUMERIC DEFAULT 0,
  temp_max NUMERIC DEFAULT 4,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE site_products ENABLE ROW LEVEL SECURITY;

-- 6. Fournisseurs par site
CREATE TABLE IF NOT EXISTS site_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE site_suppliers ENABLE ROW LEVEL SECURITY;

-- 7. Relevés de température
CREATE TABLE IF NOT EXISTS temperatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES site_equipment(id),
  product_id UUID REFERENCES site_products(id),
  record_type TEXT NOT NULL DEFAULT 'equipment' CHECK (record_type IN ('equipment','product')),
  value NUMERIC NOT NULL,
  is_conform BOOLEAN DEFAULT true,
  corrective_action TEXT,
  corrective_note TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  recorded_by_name TEXT DEFAULT '',
  recorded_at TIMESTAMPTZ DEFAULT now(),
  signature_data TEXT,
  locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ
);
ALTER TABLE temperatures ENABLE ROW LEVEL SECURITY;

-- 8. Suivi DLC
CREATE TABLE IF NOT EXISTS dlcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  dlc_date DATE NOT NULL,
  lot_number TEXT DEFAULT '',
  photo_data TEXT,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid','warning','expired','consumed','discarded')),
  recorded_by UUID REFERENCES auth.users(id),
  recorded_by_name TEXT DEFAULT '',
  recorded_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dlcs ENABLE ROW LEVEL SECURITY;

-- 9. Traçabilité lots
CREATE TABLE IF NOT EXISTS lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  lot_number TEXT NOT NULL,
  supplier_name TEXT DEFAULT '',
  dlc_date DATE,
  photo_data TEXT,
  notes TEXT DEFAULT '',
  recorded_by UUID REFERENCES auth.users(id),
  recorded_by_name TEXT DEFAULT '',
  recorded_at TIMESTAMPTZ DEFAULT now(),
  locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ
);
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

-- 10. Commandes
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'unité',
  supplier_name TEXT DEFAULT '',
  status TEXT DEFAULT 'to_order' CHECK (status IN ('to_order','ordered','received','cancelled')),
  notes TEXT DEFAULT '',
  ordered_by UUID REFERENCES auth.users(id),
  ordered_by_name TEXT DEFAULT '',
  ordered_at TIMESTAMPTZ DEFAULT now(),
  received_at TIMESTAMPTZ
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 11. Consignes inter-équipes
CREATE TABLE IF NOT EXISTS consignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE consignes ENABLE ROW LEVEL SECURITY;

-- 12. Modules par site
CREATE TABLE IF NOT EXISTS site_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL CHECK (module_key IN ('temperatures','dlc','lots','orders','consignes','viennoiseries')),
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  UNIQUE(site_id, module_key)
);
ALTER TABLE site_modules ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- B. FONCTIONS HELPERS (SECURITY DEFINER)
-- =====================================================================

-- B1. L'utilisateur courant est-il membre d'un site ?
CREATE OR REPLACE FUNCTION is_member_of_site(p_site_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_sites
    WHERE user_id = auth.uid()
      AND site_id = p_site_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- B2. L'utilisateur courant est-il admin/manager d'un site ?
CREATE OR REPLACE FUNCTION is_admin_of_site(p_site_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_sites
    WHERE user_id = auth.uid()
      AND site_id = p_site_id
      AND site_role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- B3. L'utilisateur courant est-il super_admin ?
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- =====================================================================
-- C. TRIGGER handle_new_user() — RÔLE FORCÉ À 'employee'
-- CRITIQUE : le rôle n'est JAMAIS lu depuis raw_user_meta_data
-- =====================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, must_change_password)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'employee',  -- TOUJOURS FORCÉ — jamais lu depuis le client
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =====================================================================
-- D. TRIGGER prevent_role_change — EMPÊCHE MODIFICATION RÔLE DEPUIS CLIENT
-- =====================================================================

CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT is_super_admin() THEN
      RAISE EXCEPTION 'Modification du rôle interdite';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_role_change ON profiles;
CREATE TRIGGER check_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_change();


-- =====================================================================
-- E. SUPPRIMER TOUTES LES POLICIES PERMISSIVES EXISTANTES
-- =====================================================================

-- profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_all" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_blocked" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_blocked" ON profiles;

-- sites
DROP POLICY IF EXISTS "sites_select" ON sites;
DROP POLICY IF EXISTS "sites_insert" ON sites;
DROP POLICY IF EXISTS "sites_update" ON sites;
DROP POLICY IF EXISTS "sites_delete" ON sites;
DROP POLICY IF EXISTS "sites_all" ON sites;
DROP POLICY IF EXISTS "sites_select_member" ON sites;
DROP POLICY IF EXISTS "sites_insert_admin" ON sites;
DROP POLICY IF EXISTS "sites_update_admin" ON sites;
DROP POLICY IF EXISTS "sites_delete_admin" ON sites;

-- user_sites
DROP POLICY IF EXISTS "user_sites_select" ON user_sites;
DROP POLICY IF EXISTS "user_sites_insert" ON user_sites;
DROP POLICY IF EXISTS "user_sites_update" ON user_sites;
DROP POLICY IF EXISTS "user_sites_delete" ON user_sites;
DROP POLICY IF EXISTS "user_sites_all" ON user_sites;

-- site_equipment
DROP POLICY IF EXISTS "equip_all" ON site_equipment;
DROP POLICY IF EXISTS "equip_select" ON site_equipment;
DROP POLICY IF EXISTS "equip_insert" ON site_equipment;
DROP POLICY IF EXISTS "equip_update" ON site_equipment;
DROP POLICY IF EXISTS "equip_delete" ON site_equipment;

-- site_products
DROP POLICY IF EXISTS "prod_all" ON site_products;
DROP POLICY IF EXISTS "prod_select" ON site_products;
DROP POLICY IF EXISTS "prod_insert" ON site_products;
DROP POLICY IF EXISTS "prod_update" ON site_products;
DROP POLICY IF EXISTS "prod_delete" ON site_products;

-- site_suppliers
DROP POLICY IF EXISTS "supp_all" ON site_suppliers;
DROP POLICY IF EXISTS "supp_select" ON site_suppliers;
DROP POLICY IF EXISTS "supp_insert" ON site_suppliers;
DROP POLICY IF EXISTS "supp_update" ON site_suppliers;
DROP POLICY IF EXISTS "supp_delete" ON site_suppliers;

-- temperatures
DROP POLICY IF EXISTS "temp_all" ON temperatures;
DROP POLICY IF EXISTS "temp_select" ON temperatures;
DROP POLICY IF EXISTS "temp_insert" ON temperatures;
DROP POLICY IF EXISTS "temp_update" ON temperatures;
DROP POLICY IF EXISTS "temp_delete" ON temperatures;

-- dlcs
DROP POLICY IF EXISTS "dlc_all" ON dlcs;
DROP POLICY IF EXISTS "dlc_select" ON dlcs;
DROP POLICY IF EXISTS "dlc_insert" ON dlcs;
DROP POLICY IF EXISTS "dlc_update" ON dlcs;
DROP POLICY IF EXISTS "dlc_delete" ON dlcs;

-- lots
DROP POLICY IF EXISTS "lot_all" ON lots;
DROP POLICY IF EXISTS "lot_select" ON lots;
DROP POLICY IF EXISTS "lot_insert" ON lots;
DROP POLICY IF EXISTS "lot_update" ON lots;
DROP POLICY IF EXISTS "lot_delete" ON lots;

-- orders
DROP POLICY IF EXISTS "order_all" ON orders;
DROP POLICY IF EXISTS "order_select" ON orders;
DROP POLICY IF EXISTS "order_insert" ON orders;
DROP POLICY IF EXISTS "order_update" ON orders;
DROP POLICY IF EXISTS "order_delete" ON orders;

-- consignes
DROP POLICY IF EXISTS "consigne_all" ON consignes;
DROP POLICY IF EXISTS "consigne_select" ON consignes;
DROP POLICY IF EXISTS "consigne_insert" ON consignes;
DROP POLICY IF EXISTS "consigne_update" ON consignes;
DROP POLICY IF EXISTS "consigne_delete" ON consignes;

-- site_modules
DROP POLICY IF EXISTS "mod_all" ON site_modules;
DROP POLICY IF EXISTS "mod_select" ON site_modules;
DROP POLICY IF EXISTS "mod_insert" ON site_modules;
DROP POLICY IF EXISTS "mod_update" ON site_modules;
DROP POLICY IF EXISTS "mod_delete" ON site_modules;


-- =====================================================================
-- F. POLICIES RLS — PROFILES
-- =====================================================================

-- SELECT : soi-même OU super_admin OU admin/manager d'un site commun
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (
    id = auth.uid() 
    OR is_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_sites us1
      JOIN user_sites us2 ON us1.site_id = us2.site_id
      WHERE us1.user_id = auth.uid() 
        AND us2.user_id = profiles.id
        AND us1.site_role IN ('admin','manager')
    )
  );

-- INSERT : BLOQUÉ côté client — le trigger SECURITY DEFINER bypass RLS
CREATE POLICY "profiles_insert_blocked" ON profiles
  FOR INSERT WITH CHECK (false);

-- UPDATE : soi-même uniquement (le trigger prevent_role_change bloque toute modif du champ role)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- DELETE : interdit
CREATE POLICY "profiles_delete_blocked" ON profiles
  FOR DELETE USING (false);


-- =====================================================================
-- G. POLICIES RLS — SITES
-- =====================================================================

CREATE POLICY "sites_select_member" ON sites
  FOR SELECT USING (is_member_of_site(id) OR is_super_admin());

CREATE POLICY "sites_insert_admin" ON sites
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "sites_update_admin" ON sites
  FOR UPDATE USING (is_admin_of_site(id) OR is_super_admin());

CREATE POLICY "sites_delete_admin" ON sites
  FOR DELETE USING (is_super_admin());


-- =====================================================================
-- H. POLICIES RLS — USER_SITES
-- =====================================================================

CREATE POLICY "user_sites_select" ON user_sites
  FOR SELECT USING (user_id = auth.uid() OR is_super_admin() OR is_admin_of_site(site_id));

CREATE POLICY "user_sites_insert" ON user_sites
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "user_sites_update" ON user_sites
  FOR UPDATE USING (is_super_admin());

CREATE POLICY "user_sites_delete" ON user_sites
  FOR DELETE USING (is_super_admin() OR is_admin_of_site(site_id));


-- =====================================================================
-- I. POLICIES RLS — SITE_EQUIPMENT
-- =====================================================================

CREATE POLICY "equip_select" ON site_equipment
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "equip_insert" ON site_equipment
  FOR INSERT WITH CHECK (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "equip_update" ON site_equipment
  FOR UPDATE USING (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "equip_delete" ON site_equipment
  FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());


-- =====================================================================
-- J. POLICIES RLS — SITE_PRODUCTS
-- =====================================================================

CREATE POLICY "prod_select" ON site_products
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "prod_insert" ON site_products
  FOR INSERT WITH CHECK (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "prod_update" ON site_products
  FOR UPDATE USING (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "prod_delete" ON site_products
  FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());


-- =====================================================================
-- K. POLICIES RLS — SITE_SUPPLIERS
-- =====================================================================

CREATE POLICY "supp_select" ON site_suppliers
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "supp_insert" ON site_suppliers
  FOR INSERT WITH CHECK (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "supp_update" ON site_suppliers
  FOR UPDATE USING (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "supp_delete" ON site_suppliers
  FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());


-- =====================================================================
-- L. POLICIES RLS — TEMPERATURES (cas spécial locked)
-- =====================================================================

CREATE POLICY "temp_select" ON temperatures
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "temp_insert" ON temperatures
  FOR INSERT WITH CHECK (is_member_of_site(site_id) AND recorded_by = auth.uid());

-- UPDATE : auteur SI non verrouillé, OU admin/manager du site, OU super_admin
CREATE POLICY "temp_update" ON temperatures
  FOR UPDATE USING (
    (recorded_by = auth.uid() AND locked = false AND is_member_of_site(site_id))
    OR is_admin_of_site(site_id)
    OR is_super_admin()
  );

CREATE POLICY "temp_delete" ON temperatures
  FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());


-- =====================================================================
-- M. POLICIES RLS — DLCS
-- =====================================================================

CREATE POLICY "dlc_select" ON dlcs
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "dlc_insert" ON dlcs
  FOR INSERT WITH CHECK (is_member_of_site(site_id) AND recorded_by = auth.uid());

CREATE POLICY "dlc_update" ON dlcs
  FOR UPDATE USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "dlc_delete" ON dlcs
  FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());


-- =====================================================================
-- N. POLICIES RLS — LOTS
-- =====================================================================

CREATE POLICY "lot_select" ON lots
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "lot_insert" ON lots
  FOR INSERT WITH CHECK (is_member_of_site(site_id) AND recorded_by = auth.uid());

CREATE POLICY "lot_update" ON lots
  FOR UPDATE USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "lot_delete" ON lots
  FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());


-- =====================================================================
-- O. POLICIES RLS — ORDERS
-- =====================================================================

CREATE POLICY "order_select" ON orders
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "order_insert" ON orders
  FOR INSERT WITH CHECK (is_member_of_site(site_id) AND ordered_by = auth.uid());

CREATE POLICY "order_update" ON orders
  FOR UPDATE USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "order_delete" ON orders
  FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());


-- =====================================================================
-- P. POLICIES RLS — CONSIGNES
-- =====================================================================

CREATE POLICY "consigne_select" ON consignes
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "consigne_insert" ON consignes
  FOR INSERT WITH CHECK (is_member_of_site(site_id) AND created_by = auth.uid());

CREATE POLICY "consigne_update" ON consignes
  FOR UPDATE USING (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "consigne_delete" ON consignes
  FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());


-- =====================================================================
-- Q. POLICIES RLS — SITE_MODULES
-- =====================================================================

CREATE POLICY "mod_select" ON site_modules
  FOR SELECT USING (is_member_of_site(site_id) OR is_super_admin());

CREATE POLICY "mod_insert" ON site_modules
  FOR INSERT WITH CHECK (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "mod_update" ON site_modules
  FOR UPDATE USING (is_admin_of_site(site_id) OR is_super_admin());

CREATE POLICY "mod_delete" ON site_modules
  FOR DELETE USING (is_admin_of_site(site_id) OR is_super_admin());


-- =====================================================================
-- R. FONCTION create_site_with_defaults (SECURITY DEFINER, super_admin only)
-- =====================================================================

CREATE OR REPLACE FUNCTION create_site_with_defaults(
  p_name TEXT,
  p_address TEXT DEFAULT '',
  p_type TEXT DEFAULT 'hotel',
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  v_site_id UUID;
  v_caller_role TEXT;
BEGIN
  -- VÉRIFICATION : seul super_admin peut créer un site
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Accès refusé : super_admin requis pour créer un site';
  END IF;

  INSERT INTO sites (name, address, type, created_by)
  VALUES (p_name, p_address, p_type, p_user_id)
  RETURNING id INTO v_site_id;

  INSERT INTO user_sites (user_id, site_id, site_role)
  VALUES (p_user_id, v_site_id, 'admin');

  INSERT INTO site_equipment (site_id, name, type, temp_min, temp_max, emoji, sort_order) VALUES
    (v_site_id, 'Frigo principal', 'fridge', 0, 4, '❄️', 1),
    (v_site_id, 'Congélateur', 'freezer', -25, -18, '🧊', 2),
    (v_site_id, 'Chambre froide', 'fridge', 0, 3, '🏠', 3);

  INSERT INTO site_products (site_id, name, category, emoji, temp_min, temp_max, sort_order) VALUES
    (v_site_id, 'Viande', 'frigo', '🥩', 0, 4, 1),
    (v_site_id, 'Poisson', 'frigo', '🐟', 0, 2, 2),
    (v_site_id, 'Produits laitiers', 'frigo', '🧀', 0, 4, 3),
    (v_site_id, 'Légumes', 'frigo', '🥬', 2, 8, 4),
    (v_site_id, 'Surgelés', 'congel', '🧊', -25, -18, 5);

  INSERT INTO site_suppliers (site_id, name) VALUES
    (v_site_id, 'Fournisseur principal'),
    (v_site_id, 'Grossiste'),
    (v_site_id, 'Local / Direct');

  INSERT INTO site_modules (site_id, module_key, enabled) VALUES
    (v_site_id, 'temperatures', true),
    (v_site_id, 'dlc', true),
    (v_site_id, 'lots', true),
    (v_site_id, 'orders', true),
    (v_site_id, 'consignes', true),
    (v_site_id, 'viennoiseries', false);

  RETURN v_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================================
-- S. FONCTION admin_set_user_role (SECURITY DEFINER, super_admin only)
-- SEUL chemin pour promouvoir un utilisateur
-- =====================================================================

CREATE OR REPLACE FUNCTION admin_set_user_role(
  p_target_user_id UUID,
  p_new_role TEXT
)
RETURNS VOID AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Accès refusé : super_admin requis';
  END IF;

  IF p_new_role NOT IN ('employee', 'manager', 'super_admin') THEN
    RAISE EXCEPTION 'Rôle invalide : %', p_new_role;
  END IF;

  UPDATE profiles SET role = p_new_role, updated_at = now()
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur non trouvé : %', p_target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================================
-- T. FONCTION admin_assign_user_to_site (SECURITY DEFINER, super_admin only)
-- =====================================================================

CREATE OR REPLACE FUNCTION admin_assign_user_to_site(
  p_user_id UUID,
  p_site_id UUID,
  p_site_role TEXT DEFAULT 'employee'
)
RETURNS VOID AS $$
DECLARE
  v_caller_role TEXT;
  v_is_site_admin BOOLEAN;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  
  -- Super admin peut tout faire
  IF v_caller_role = 'super_admin' THEN
    -- OK
  ELSE
    -- Manager/admin du site peut ajouter des employés à son site
    SELECT EXISTS(
      SELECT 1 FROM user_sites 
      WHERE user_id = auth.uid() AND site_id = p_site_id AND site_role IN ('admin','manager')
    ) INTO v_is_site_admin;
    
    IF NOT v_is_site_admin THEN
      RAISE EXCEPTION 'Accès refusé : admin du site ou super_admin requis';
    END IF;
    
    -- Un manager ne peut pas assigner le rôle admin
    IF p_site_role = 'admin' THEN
      RAISE EXCEPTION 'Seul un super_admin peut attribuer le rôle admin';
    END IF;
  END IF;

  IF p_site_role NOT IN ('employee', 'manager', 'admin') THEN
    RAISE EXCEPTION 'Rôle site invalide : %', p_site_role;
  END IF;

  INSERT INTO user_sites (user_id, site_id, site_role)
  VALUES (p_user_id, p_site_id, p_site_role)
  ON CONFLICT (user_id, site_id) DO UPDATE SET site_role = p_site_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================================
-- FIN — Ce fichier est complet et autosuffisant
-- =====================================================================
