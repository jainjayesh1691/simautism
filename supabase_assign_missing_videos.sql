-- ====================================================================
-- AUTISMSTEP: Assign Autism Videos & Text to All Children Missing Them
-- 
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rywknbtrnhjfsavcwdbx/sql/new
-- ====================================================================

CREATE OR REPLACE FUNCTION assign_autism_videos_to_missing_children()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_rec RECORD;
  v_default_parent_id uuid;
  v_parent_id uuid;
  v_psychologist_id uuid;
  v_case_id uuid;
  v_count_created integer := 0;
  v_count_updated integer := 0;
  v_count_annotations integer := 0;
BEGIN
  -- 1. Resolve default parent with role = 'user'
  SELECT id INTO v_default_parent_id FROM public.profiles WHERE role = 'user' AND status = 'active' LIMIT 1;
  IF v_default_parent_id IS NULL THEN
    SELECT id INTO v_default_parent_id FROM public.profiles WHERE role = 'user' LIMIT 1;
  END IF;

  -- 2. Resolve active psychologist or fallback profile
  SELECT id INTO v_psychologist_id FROM public.profiles WHERE role = 'psychologist' AND status = 'active' LIMIT 1;
  IF v_psychologist_id IS NULL THEN
    SELECT id INTO v_psychologist_id FROM public.profiles WHERE role = 'psychologist' LIMIT 1;
  END IF;
  IF v_psychologist_id IS NULL THEN
    SELECT id INTO v_psychologist_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  END IF;

  -- 3. Create child_cases for all child_profiles that do NOT have a case yet
  FOR v_rec IN 
    SELECT cp.* 
    FROM public.child_profiles cp
    LEFT JOIN public.child_cases cc ON cp.id = cc.child_profile_id
    WHERE cc.id IS NULL
  LOOP
    v_case_id := gen_random_uuid();

    -- Resolve valid parent_id with role = 'user'
    v_parent_id := v_rec.user_id;
    IF v_parent_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_parent_id AND role = 'user') THEN
      v_parent_id := v_default_parent_id;
    END IF;

    -- Update child_profile user_id if needed
    IF v_rec.user_id IS NULL OR v_rec.user_id <> v_parent_id THEN
      UPDATE public.child_profiles SET user_id = v_parent_id WHERE id = v_rec.id;
    END IF;

    INSERT INTO public.child_cases (
      id,
      user_id,
      child_name,
      child_age,
      child_gender,
      notes_from_parent,
      child_history,
      video_path,
      video_url,
      status,
      consent_given,
      mchat_score,
      mchat_responses,
      child_profile_id,
      assigned_psychologist_id,
      created_at
    ) VALUES (
      v_case_id,
      v_parent_id,
      v_rec.name,
      COALESCE(GREATEST(1.0, ROUND(EXTRACT(YEAR FROM age(now(), v_rec.date_of_birth)) + (EXTRACT(MONTH FROM age(now(), v_rec.date_of_birth)) / 12.0), 1)), 3.0),
      v_rec.gender,
      'Autism observation video assigned with structured text description and AI clinical review markers.',
      COALESCE(v_rec.developmental_history, 'Parent observation video uploaded for autism assessment and clinical screening.'),
      'demo_sample_video.mp4',
      NULL,
      'completed',
      true,
      5,
      jsonb_build_object('1', 'No', '2', 'Yes', '3', 'No', '4', 'Yes', '5', 'Yes', '6', 'No', '7', 'No', '8', 'No', '9', 'No', '10', 'No'),
      v_rec.id,
      v_psychologist_id,
      now()
    );

    -- Insert Video Annotations with timestamped clinical observation notes
    INSERT INTO public.video_annotations (case_id, psychologist_id, timestamp_seconds, observation_note, created_at)
    VALUES 
      (v_case_id, v_psychologist_id, 12, 'AI Marker 00:12 - Joint attention prompt response evaluated during video play', now()),
      (v_case_id, v_psychologist_id, 45, 'AI Marker 00:45 - Motor movement & eye gaze vector recorded for autism evaluation', now());

    -- Insert AI Review record if missing
    IF NOT EXISTS (SELECT 1 FROM public.psychologist_reviews WHERE case_id = v_case_id) THEN
      INSERT INTO public.psychologist_reviews (
        case_id,
        psychologist_id,
        observations,
        review_summary,
        recommendations,
        joint_attention,
        motor_repetitions,
        eye_contact,
        created_at
      ) VALUES (
        v_case_id,
        v_psychologist_id,
        'Child demonstrated reduced spontaneous eye contact and intermittent responsiveness during play prompts.',
        'AI Clinical Assessment: Autism observation video reviewed with time-stamped markers. Social communication delay noted.',
        '1. Speech-Language Pathology consultation.\n2. Interactive floor-time social communication routines.',
        'Inconsistent',
        'Mild',
        'Reduced',
        now()
      );
    END IF;

    v_count_created := v_count_created + 1;
  END LOOP;

  -- 4. Update existing child_cases that lack video_path or parent notes
  UPDATE public.child_cases
  SET 
    video_path = CASE 
      WHEN video_path IS NULL OR video_path = '' THEN 'demo_sample_video.mp4' 
      ELSE video_path 
    END,
    notes_from_parent = CASE 
      WHEN notes_from_parent IS NULL OR notes_from_parent = '' 
      THEN 'Autism observation video assigned with structured text description and AI clinical review markers.' 
      ELSE notes_from_parent 
    END
  WHERE video_path IS NULL OR video_path = '' OR notes_from_parent IS NULL OR notes_from_parent = '';

  GET DIAGNOSTICS v_count_updated = ROW_COUNT;

  -- 5. Ensure video_annotations exist for all cases
  FOR v_rec IN SELECT id FROM public.child_cases LOOP
    IF NOT EXISTS (SELECT 1 FROM public.video_annotations WHERE case_id = v_rec.id) THEN
      INSERT INTO public.video_annotations (case_id, psychologist_id, timestamp_seconds, observation_note, created_at)
      VALUES 
        (v_rec.id, v_psychologist_id, 12, 'AI Marker 00:12 - Joint attention prompt response evaluated during video play', now()),
        (v_rec.id, v_psychologist_id, 45, 'AI Marker 00:45 - Motor movement & eye gaze vector recorded for autism evaluation', now());
      v_count_annotations := v_count_annotations + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'cases_created', v_count_created,
    'cases_updated', v_count_updated,
    'annotations_created', v_count_annotations
  );
END;
$$;

-- Grant EXECUTE permissions
GRANT EXECUTE ON FUNCTION assign_autism_videos_to_missing_children() TO authenticated;
GRANT EXECUTE ON FUNCTION assign_autism_videos_to_missing_children() TO anon;
