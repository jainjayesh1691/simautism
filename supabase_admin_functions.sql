-- ====================================================================
-- AUTISMSTEP: Admin Management Database Functions (Migration SQL)
-- 
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rywknbtrnhjfsavcwdbx/sql/new
-- ====================================================================

-- 1. Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Ensure app_role enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('user', 'psychologist', 'admin');
  END IF;
END $$;

-- 3. Function: Admin Change User Password
CREATE OR REPLACE FUNCTION admin_change_user_password(
  p_profile_id uuid,
  p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role app_role;
  v_target_auth_id uuid;
BEGIN
  -- Verify caller is active admin
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can change passwords.';
  END IF;

  -- Resolve target auth_user_id from public.profiles
  SELECT auth_user_id INTO v_target_auth_id
  FROM public.profiles
  WHERE id = p_profile_id;

  -- Fallback if p_profile_id was passed directly as auth_user_id
  IF v_target_auth_id IS NULL THEN
    v_target_auth_id := p_profile_id;
  END IF;

  -- Update encrypted password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = v_target_auth_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found in auth.users system.';
  END IF;
END;
$$;

-- 4. Function: Admin Delete User Account
CREATE OR REPLACE FUNCTION admin_delete_user(
  p_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role app_role;
  v_target_auth_id uuid;
BEGIN
  -- Verify caller is active admin
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can delete users.';
  END IF;

  -- Resolve target auth_user_id from public.profiles
  SELECT auth_user_id INTO v_target_auth_id
  FROM public.profiles
  WHERE id = p_profile_id;

  -- Delete from public.profiles
  DELETE FROM public.profiles 
  WHERE id = p_profile_id OR auth_user_id = p_profile_id;

  -- Delete from auth.users
  IF v_target_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_target_auth_id;
  ELSE
    DELETE FROM auth.users WHERE id = p_profile_id;
  END IF;
END;
$$;

-- 5. Function: Admin Create User Account
CREATE OR REPLACE FUNCTION admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role app_role,
  p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role app_role;
  v_new_user_id uuid;
BEGIN
  -- Verify caller is active admin
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can create accounts.';
  END IF;

  -- Generate new UUID for user
  v_new_user_id := gen_random_uuid();
  
  -- Insert into auth.users with pre-confirmed email to bypass SMTP limits
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud
  ) VALUES (
    v_new_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(),
    now(),
    'authenticated',
    'authenticated'
  );

  -- Insert or update matching profile record
  INSERT INTO public.profiles (
    auth_user_id,
    email,
    full_name,
    role,
    phone,
    status
  ) VALUES (
    v_new_user_id,
    p_email,
    p_full_name,
    p_role,
    p_phone,
    'active'
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET role = EXCLUDED.role,
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      status = 'active';

  RETURN v_new_user_id;
END;
$$;

-- Grant EXECUTE permissions to authenticated users (security is enforced inside the functions)
GRANT EXECUTE ON FUNCTION admin_change_user_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_user(text, text, text, app_role, text) TO authenticated;
