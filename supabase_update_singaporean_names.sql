-- ====================================================================
-- AUTISMSTEP: Update Child Records to Authentic Singaporean Names
-- 
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rywknbtrnhjfsavcwdbx/sql/new
-- ====================================================================

-- 1. Create temporary mapping table for name replacements
DO $$
DECLARE
  v_rec RECORD;
  v_old_names text[] := ARRAY[
    'Liam Smith', 'Sophia Chen', 'Noah Patel', 'Ava Johnson', 'Ethan Garcia',
    'Emma Davis', 'Mason Miller', 'Isabella Wilson', 'Lucas Martinez', 'Mia Taylor',
    'Alexander Anderson', 'Charlotte Thomas', 'Henry Jackson', 'Amelia White', 'Oliver Harris',
    'Harper Martin', 'Benjamin Thompson', 'Evelyn Moore', 'James Young', 'Emily Allen',
    'atharva', 'vijay', 'megha', 'vansh', 'kajal'
  ];
  v_new_names text[] := ARRAY[
    'Tan Wei Jie', 'Sophia Chen Xuan Ting', 'Muhammad Rayyan', 'Chloe Lim Jia En', 'Ethan Yeo Jun Kai',
    'Nur Aisyah Binte Ahmad', 'Lucas Koh En Xiu', 'Isabella Teo Rui Ying', 'Kavien Kumar', 'Hannah Ng Zi Qing',
    'Alexander Lee Zi Hao', 'Charlotte Wong Mei Ling', 'Muhammad Irfan', 'Amelia Goh En Xi', 'Oliver Tay Min Han',
    'Harper Tan Xuan Yi', 'Benjamin Chua Kai Xiang', 'Priya Ramesh', 'James De Cruz', 'Emily Ho Jie Ying',
    'Arjun Pillai', 'Vijay Raj', 'Meera Nair', 'Ahmad Vansh Bin Zulkifli', 'Kajal D/O Loganathan'
  ];
  i integer;
BEGIN
  FOR i IN 1..array_length(v_old_names, 1) LOOP
    -- Update child_profiles
    UPDATE public.child_profiles
    SET name = v_new_names[i]
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_old_names[i]));

    -- Update child_cases
    UPDATE public.child_cases
    SET child_name = v_new_names[i]
    WHERE LOWER(TRIM(child_name)) = LOWER(TRIM(v_old_names[i]));
  END LOOP;
END;
$$;
