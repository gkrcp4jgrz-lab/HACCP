-- =====================================================================
-- STEP 8: Add login_id column for identifier-based authentication
-- =====================================================================

-- Add login_id column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_id TEXT UNIQUE;

-- Create index for fast lookup during login
CREATE INDEX IF NOT EXISTS idx_profiles_login_id ON profiles(login_id);

-- Auto-generate login_ids for existing users based on full_name
-- Format: first letter of first name + first letter of last name + sequential 4-digit number
-- Example: "Jean Renard" -> "JR0001"
DO $$
DECLARE
  r RECORD;
  v_initials TEXT;
  v_parts TEXT[];
  v_max_num INT;
  v_login_id TEXT;
BEGIN
  FOR r IN SELECT id, full_name, email FROM profiles WHERE login_id IS NULL ORDER BY created_at
  LOOP
    -- Extract initials
    v_parts := string_to_array(TRIM(COALESCE(r.full_name, r.email)), ' ');
    IF array_length(v_parts, 1) >= 2 THEN
      v_initials := UPPER(LEFT(v_parts[1], 1) || LEFT(v_parts[array_length(v_parts, 1)], 1));
    ELSIF array_length(v_parts, 1) = 1 AND LENGTH(v_parts[1]) >= 2 THEN
      v_initials := UPPER(LEFT(v_parts[1], 2));
    ELSE
      v_initials := 'XX';
    END IF;

    -- Find next available number for these initials
    SELECT COALESCE(MAX(CAST(SUBSTRING(login_id FROM 3) AS INTEGER)), 0)
    INTO v_max_num
    FROM profiles
    WHERE login_id IS NOT NULL
      AND LEFT(login_id, 2) = v_initials;

    v_login_id := v_initials || LPAD((v_max_num + 1)::TEXT, 4, '0');

    UPDATE profiles SET login_id = v_login_id WHERE id = r.id;

    RAISE NOTICE 'Set login_id % for user % (%)', v_login_id, r.full_name, r.email;
  END LOOP;
END;
$$;

-- Create a secure function for login_id lookup (callable by anon)
-- Returns only the email for a given login_id — no other profile data exposed
CREATE OR REPLACE FUNCTION lookup_login_id(p_login_id TEXT)
RETURNS TABLE(email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT profiles.email
    FROM profiles
    WHERE profiles.login_id = UPPER(p_login_id)
    LIMIT 1;
END;
$$;

-- Grant anon access to call this function
GRANT EXECUTE ON FUNCTION lookup_login_id(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION lookup_login_id(TEXT) TO authenticated;
