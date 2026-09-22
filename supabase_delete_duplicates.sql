-- ====================================================================
-- AUTISMSTEP: Remove Duplicate Child Records SQL Migration
-- 
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rywknbtrnhjfsavcwdbx/sql/new
-- ====================================================================

CREATE OR REPLACE FUNCTION delete_duplicate_child_records()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_deleted_cases integer := 0;
  v_deleted_profiles integer := 0;
BEGIN
  -- 1. Identify duplicate child_cases to delete (keep the earliest created_at / min id for each child_name)
  WITH ranked_cases AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(child_name)) 
        ORDER BY created_at ASC, id ASC
      ) as rn
    FROM public.child_cases
  ),
  cases_to_delete AS (
    SELECT id FROM ranked_cases WHERE rn > 1
  ),
  delete_annotations AS (
    DELETE FROM public.video_annotations
    WHERE case_id IN (SELECT id FROM cases_to_delete)
  ),
  delete_reviews AS (
    DELETE FROM public.psychologist_reviews
    WHERE case_id IN (SELECT id FROM cases_to_delete)
  ),
  deleted_c AS (
    DELETE FROM public.child_cases
    WHERE id IN (SELECT id FROM cases_to_delete)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_cases FROM deleted_c;

  -- 2. Identify duplicate child_profiles to delete (keep the earliest created_at / min id for each name)
  WITH ranked_profiles AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(name)) 
        ORDER BY created_at ASC, id ASC
      ) as rn
    FROM public.child_profiles
  ),
  profiles_to_delete AS (
    SELECT id FROM ranked_profiles WHERE rn > 1
  ),
  deleted_p AS (
    DELETE FROM public.child_profiles
    WHERE id IN (SELECT id FROM profiles_to_delete)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_profiles FROM deleted_p;

  RETURN jsonb_build_object(
    'deleted_cases', v_deleted_cases,
    'deleted_profiles', v_deleted_profiles
  );
END;
$$;

-- Grant EXECUTE permissions
GRANT EXECUTE ON FUNCTION delete_duplicate_child_records() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_duplicate_child_records() TO anon;
