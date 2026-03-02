-- =====================================================================
-- PHASE 6 — Audit #3 Fixes
-- =====================================================================

-- ─── BLOC 1 : RPC rpc_consume_from_package (atomic) ───
-- Remplace la double-opération client-side (update dlc + insert consumption_log)
-- par une seule transaction serveur avec row lock.

CREATE OR REPLACE FUNCTION rpc_consume_from_package(
  p_dlc_id UUID,
  p_qty NUMERIC,
  p_notes TEXT DEFAULT '',
  p_user_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dlc RECORD;
  v_new_qty NUMERIC;
BEGIN
  -- Lock the DLC row
  SELECT * INTO v_dlc FROM dlcs WHERE id = p_dlc_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Produit introuvable');
  END IF;

  -- Check available quantity
  IF p_qty > COALESCE(v_dlc.quantity, 1) THEN
    RETURN jsonb_build_object('error', 'Quantité insuffisante — reste : ' || COALESCE(v_dlc.quantity, 1));
  END IF;

  v_new_qty := COALESCE(v_dlc.quantity, 1) - p_qty;

  -- Update DLC: consumed if qty <= 0, else decrement
  IF v_new_qty <= 0 THEN
    UPDATE dlcs SET status = 'consumed' WHERE id = p_dlc_id;
  ELSE
    UPDATE dlcs SET quantity = v_new_qty WHERE id = p_dlc_id;
  END IF;

  -- Insert consumption log
  INSERT INTO consumption_logs (
    site_id, product_name, quantity_consumed, unit,
    consumed_by, consumed_by_name, consumed_at, notes, dlc_entries
  ) VALUES (
    v_dlc.site_id, v_dlc.product_name, p_qty,
    COALESCE(v_dlc.unit, 'unité'),
    p_user_id, p_user_name, NOW(),
    p_notes,
    jsonb_build_array(jsonb_build_object(
      'dlc_id', v_dlc.id,
      'lot_number', COALESCE(v_dlc.lot_number, ''),
      'dlc_date', v_dlc.dlc_date,
      'qty_taken', p_qty
    ))
  );

  RETURN jsonb_build_object('ok', true, 'new_qty', v_new_qty);
END;
$$;

-- ─── BLOC 2 : RPC admin_reset_password ───
-- Permet aux super_admin de réinitialiser le mot de passe d'un utilisateur.
-- Utilise auth.admin_update_user_by_id (extension supabase_auth_admin).
-- NOTE: Sur Supabase, les fonctions RPC s'exécutent avec le rôle anon/authenticated
-- mais SECURITY DEFINER permet d'utiliser les droits du propriétaire (postgres).

CREATE OR REPLACE FUNCTION admin_reset_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- Vérifier que l'appelant est super_admin
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'super_admin' THEN
    RETURN jsonb_build_object('error', 'Accès refusé : super_admin requis');
  END IF;

  -- Vérifier longueur minimale
  IF LENGTH(p_new_password) < 8 THEN
    RETURN jsonb_build_object('error', 'Mot de passe trop court (min 8 caractères)');
  END IF;

  -- Mettre à jour le mot de passe via l'API interne Supabase Auth
  -- Cette approche utilise la table auth.users directement (SECURITY DEFINER = postgres owner)
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Utilisateur introuvable');
  END IF;

  -- Marquer must_change_password
  UPDATE profiles SET must_change_password = true WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
