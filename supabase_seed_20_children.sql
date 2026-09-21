-- ====================================================================
-- SIM-AUTISM: Seed 20 Child Records with AI Clinical Reviews
-- 
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rywknbtrnhjfsavcwdbx/sql/new
-- ====================================================================

CREATE OR REPLACE FUNCTION seed_20_child_records(p_parent_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_parent_id uuid := p_parent_user_id;
  v_psychologist_id uuid;
  v_inserted_count integer := 0;
  
  -- Record vars
  v_child_profile_id uuid;
  v_case_id uuid;
  v_review_id uuid;
  
  -- Loop arrays
  v_names text[] := ARRAY[
    'Liam Smith', 'Sophia Chen', 'Noah Patel', 'Ava Johnson', 'Ethan Garcia',
    'Emma Davis', 'Mason Miller', 'Isabella Wilson', 'Lucas Martinez', 'Mia Taylor',
    'Alexander Anderson', 'Charlotte Thomas', 'Henry Jackson', 'Amelia White', 'Oliver Harris',
    'Harper Martin', 'Benjamin Thompson', 'Evelyn Moore', 'James Young', 'Emily Allen'
  ];
  
  v_ages numeric[] := ARRAY[
    2.5, 3.0, 1.8, 4.2, 2.0,
    3.5, 2.8, 4.0, 2.2, 1.5,
    3.8, 2.7, 4.5, 2.1, 3.2,
    1.9, 4.8, 2.4, 3.1, 2.9
  ];
  
  v_genders text[] := ARRAY[
    'Male', 'Female', 'Male', 'Female', 'Male',
    'Female', 'Male', 'Female', 'Male', 'Female',
    'Male', 'Female', 'Male', 'Female', 'Male',
    'Female', 'Male', 'Female', 'Male', 'Female'
  ];

  v_scores integer[] := ARRAY[
    5, 1, 8, 2, 9,
    4, 7, 0, 6, 8,
    1, 9, 4, 2, 8,
    5, 1, 7, 4, 2
  ];

  v_joint_attentions text[] := ARRAY[
    'Inconsistent', 'Consistent', 'Absent', 'Consistent', 'Absent',
    'Inconsistent', 'Absent', 'Consistent', 'Inconsistent', 'Absent',
    'Consistent', 'Absent', 'Inconsistent', 'Consistent', 'Absent',
    'Inconsistent', 'Consistent', 'Absent', 'Inconsistent', 'Consistent'
  ];

  v_motor_reps text[] := ARRAY[
    'Mild', 'None', 'Severe', 'None', 'Severe',
    'Mild', 'Moderate', 'None', 'Mild', 'Severe',
    'None', 'Severe', 'Mild', 'None', 'Moderate',
    'Mild', 'None', 'Moderate', 'Mild', 'None'
  ];

  v_eye_contacts text[] := ARRAY[
    'Reduced', 'Good/Consistent', 'Poor', 'Good/Consistent', 'Poor',
    'Reduced', 'Poor', 'Good/Consistent', 'Reduced', 'Poor',
    'Good/Consistent', 'Poor', 'Reduced', 'Good/Consistent', 'Poor',
    'Reduced', 'Good/Consistent', 'Poor', 'Reduced', 'Good/Consistent'
  ];

  v_histories text[] := ARRAY[
    'Mild speech delay noted at 24 months. Shows high interest in mechanical wheels and spinning objects.',
    'Developmental milestones on track. Parent requested routine developmental screening.',
    'Limited babbling, does not respond reliably to name when called across room. Shows hand-flapping during excitement.',
    'Social and expressive communication normal. Enjoys peer play at daycare.',
    'Significant social communication delay. Minimal eye contact and repetitive toe-walking noted.',
    'Occasionally hyper-focused on toys, mild delay in multi-word sentence formation.',
    'Parent reports concern regarding sudden sensory overload in loud environments and intense alignment of toy cars.',
    'No clinical concerns reported. Receptive and expressive language age-appropriate.',
    'Struggles with transitions between activities. Displays frustration and reduced gesture use.',
    'Early identification referral. Does not follow pointing gestures or share enjoyment with caregivers.',
    'Fluent vocabulary, inquisitive play, no repetitive behaviors observed.',
    'Marked difficulty maintaining social gaze during interactive peek-a-boo games.',
    'Mild delay in reciprocal conversation; good motor skills and curious exploratory play.',
    'Active, highly responsive to caregiver cues, strong pointing gestures.',
    'Reduced engagement with peers, prefers isolated object manipulation and repetitive finger wiggling.',
    'Exhibits inconsistent response to auditory stimuli; hearing test confirmed normal.',
    'Advanced verbal skills, highly interactive with siblings and adults.',
    'Frequent repetitive arm flapping during joy or distress; slow response to social cues.',
    'Mild difficulty maintaining eye contact during structured clinical tasks.',
    'Meets all key motor and communication benchmarks for 34 months.'
  ];

  v_obs text[] := ARRAY[
    'AI Frame Marker Analysis: Child engaged with toy train for 14 minutes. Exhibited 3 instances of joint attention prompt failures and 2 instances of spontaneous eye contact.',
    'AI Video Evaluation: Smooth motor coordination, immediate responsiveness to caregiver verbal prompts within 1.2 seconds. No atypical motor patterns.',
    'AI Automated Video Review: High occurrence of gaze aversion (78% of video duration). Repetitive hand-flapping observed at 01:14 and 03:42 timestamps.',
    'AI Video Analysis: Excellent eye contact trajectory (88% sustained). Reciprocal smiling and shared attention clearly visible throughout video session.',
    'AI Automated Video Review: Marked reduction in response to name calls (1/6 successful calls). Persistent toe-walking and object lining behavior detected.',
    'AI Evaluation: Intermittent social eye gaze. Responded to 4 out of 5 pointing prompts. Mild sensory interest in textured surfaces.',
    'AI Frame Marker Analysis: Reduced joint attention initiation. Visual focus predominantly fixed on high-contrast spinning wheels (62% of interaction time).',
    'AI Video Evaluation: Typical social interaction pattern. Prompt response to name, active pointing to request and share enjoyment.',
    'AI Video Review: Speech vocalizations present but lack communicative intent. Minimal eye contact during interactive bubble-blowing activity.',
    'AI Automated Video Evaluation: Significant social-communication gaps identified. Absence of pointing, gaze shifting between caregiver and object is minimal.',
    'AI Video Analysis: Typical developmental presentation. Robust social gaze, reciprocal vocal turn-taking, appropriate pretend play skills.',
    'AI Video Review: Severe reduction in social reciprocity. Child did not turn face when name was called at maximum volume.',
    'AI Evaluation: Moderate social engagement. Shared attention present when high-interest toys were introduced.',
    'AI Video Analysis: Clear demonstration of pretend play (drinking from empty cup). Frequent visual check-ins with parent.',
    'AI Frame Analysis: Minimal eye contact (22% of session). Repetitive finger manipulation close to eyes noted at multiple timestamps.',
    'AI Video Review: Inconsistent response to auditory and visual bids. Requires persistent parent prompting for gaze alignment.',
    'AI Evaluation: High social responsiveness, spontaneous sharing of toys, excellent eye contact and verbal expressiveness.',
    'AI Automated Video Review: High-frequency motor repetitions (hand-flapping, rocking). Reduced gaze duration during social bids.',
    'AI Video Evaluation: Good overall engagement with occasional visual drift during complex tasks.',
    'AI Video Analysis: Fully age-appropriate developmental behaviors. Strong eye contact, clear pointing, and warm affect.'
  ];

  v_summaries text[] := ARRAY[
    'AI Clinical Assessment: Moderate developmental risk profile. Speech and joint attention therapy recommended.',
    'AI Clinical Assessment: Low risk profile. Developmental milestones within expected limits for age.',
    'AI Clinical Assessment: High Risk for Autism Spectrum Disorder (ASD). Comprehensive multi-disciplinary evaluation recommended.',
    'AI Clinical Assessment: Low risk profile. No clinical indicators warranting specialized intervention at this time.',
    'AI Clinical Assessment: High Risk profile with pronounced social communication and repetitive behavior markers.',
    'AI Clinical Assessment: Moderate Risk profile. Speech-language therapy intake consultation suggested.',
    'AI Clinical Assessment: High Risk profile. Elevated sensory sensitivity and restricted repetitive behavior patterns.',
    'AI Clinical Assessment: Low risk. Excellent social engagement and milestone progression.',
    'AI Clinical Assessment: Moderate Risk profile. Occupational and speech therapy screening advised.',
    'AI Clinical Assessment: High Risk profile. Immediate comprehensive diagnostic assessment strongly recommended.',
    'AI Clinical Assessment: Low risk profile. Typical developmental trajectory.',
    'AI Clinical Assessment: High Risk profile. Severe joint attention deficit and social communication markers.',
    'AI Clinical Assessment: Moderate Risk profile. Mild pragmatic language delay noted.',
    'AI Clinical Assessment: Low risk profile. Strong communicative intent and social reciprocity.',
    'AI Clinical Assessment: High Risk profile. Repetitive motor behaviors and severe gaze reduction.',
    'AI Clinical Assessment: Moderate Risk profile. Developmental monitoring at 3-month follow-up recommended.',
    'AI Clinical Assessment: Low risk profile. Outstanding social and cognitive development.',
    'AI Clinical Assessment: High Risk profile. Pronounced motor stereotypes and social gaze deficit.',
    'AI Clinical Assessment: Moderate Risk profile. Mild social communication delays observed.',
    'AI Clinical Assessment: Low risk profile. All developmental indicators well within normal limits.'
  ];

  v_recs text[] := ARRAY[
    '1. Speech-Language Pathology consultation for expressive language.\n2. Implement picture exchange communication tools at home.\n3. Re-evaluate in 3 months.',
    '1. Continue standard pediatric well-child checkups.\n2. Encourage interactive storybook reading and group play.',
    '1. Urgent referral to Developmental Pediatrician.\n2. Comprehensive Autism Diagnostic Observation Schedule (ADOS-2) evaluation.\n3. Begin Early Intervention Speech and ABA/OT therapies.',
    '1. Routine developmental tracking.\n2. Continue rich home language exposure.',
    '1. Priority referral for specialized diagnostic assessment.\n2. Enrolment in early intervention services (OT, Speech, Behavioral Support).\n3. Sensory integration home strategies.',
    '1. Speech therapy evaluation.\n2. Structured social playgroup participation.',
    '1. Occupational Therapy evaluation for sensory processing.\n2. Comprehensive clinical psychology consultation.',
    '1. No formal intervention needed.\n2. Maintain active physical and social play routines.',
    '1. Speech-language therapy intake.\n2. Parent training on floor-time interactive play strategies.',
    '1. Expedited multidisciplinary evaluation (Developmental Pediatrics & Child Psychology).\n2. Early intervention referral for 25+ hrs/week supportive therapies.',
    '1. Continue regular developmental monitoring.\n2. Support preschool peer socialization.',
    '1. Immediate diagnostic evaluation referral.\n2. Early Intervention Speech and Social Communication program.',
    '1. Pediatric speech evaluation.\n2. Follow-up M-CHAT screening in 6 months.',
    '1. Continue typical child development activities.\n2. Re-screen at 36-month checkup.',
    '1. Referral to Developmental Specialist.\n2. Occupational therapy evaluation for motor stereotypes and visual motor integration.',
    '1. Audiology follow-up re-check.\n2. Speech therapy consultation for joint attention prompting.',
    '1. Continue stimulating educational and social activities.',
    '1. Urgent multidisciplinary clinical evaluation.\n2. OT for motor regulation and early intervention behavioral therapy.',
    '1. Speech and language assessment.\n2. Re-evaluate social communication markers in 4 months.',
    '1. Continue positive home environment and interactive play.'
  ];

  i integer;
BEGIN
  -- 1. Resolve or fall back to an active parent profile
  IF v_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_parent_id) THEN
    SELECT id INTO v_parent_id FROM public.profiles WHERE auth_user_id = v_parent_id LIMIT 1;
  END IF;

  IF v_parent_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_parent_id) THEN
    SELECT id INTO v_parent_id FROM public.profiles WHERE role = 'user' AND status = 'active' LIMIT 1;
  END IF;

  IF v_parent_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_parent_id) THEN
    SELECT id INTO v_parent_id FROM public.profiles LIMIT 1;
  END IF;

  -- 2. Resolve or fall back to a psychologist profile
  SELECT id INTO v_psychologist_id FROM public.profiles WHERE role = 'psychologist' AND status = 'active' LIMIT 1;
  IF v_psychologist_id IS NULL THEN
    SELECT id INTO v_psychologist_id FROM public.profiles WHERE role = 'psychologist' LIMIT 1;
  END IF;
  IF v_psychologist_id IS NULL THEN
    SELECT id INTO v_psychologist_id FROM public.profiles WHERE role = 'admin' AND status = 'active' LIMIT 1;
  END IF;
  IF v_psychologist_id IS NULL THEN
    SELECT id INTO v_psychologist_id FROM public.profiles LIMIT 1;
  END IF;
  IF v_psychologist_id IS NULL THEN
    v_psychologist_id := v_parent_id;
  END IF;

  -- 3. Loop and create 20 child records
  FOR i IN 1..20 LOOP
    v_child_profile_id := gen_random_uuid();
    v_case_id := gen_random_uuid();
    v_review_id := gen_random_uuid();

    -- A. Insert Child Profile
    INSERT INTO public.child_profiles (
      id,
      user_id,
      name,
      date_of_birth,
      gender,
      developmental_history,
      created_at
    ) VALUES (
      v_child_profile_id,
      v_parent_id,
      v_names[i],
      (now() - (v_ages[i] || ' years')::interval)::date,
      v_genders[i],
      v_histories[i],
      now() - ((21 - i) || ' days')::interval
    )
    ON CONFLICT (id) DO NOTHING;

    -- B. Insert Child Case
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
      v_names[i],
      v_ages[i],
      v_genders[i],
      'Parent observation uploaded for automated AI review and clinical assessment.',
      v_histories[i],
      'demo_sample_video.mp4',
      NULL,
      'completed',
      true,
      v_scores[i],
      jsonb_build_object(
        '1', CASE WHEN v_scores[i] >= 4 THEN 'No' ELSE 'Yes' END,
        '2', CASE WHEN v_scores[i] >= 7 THEN 'Yes' ELSE 'No' END,
        '3', CASE WHEN v_scores[i] >= 5 THEN 'No' ELSE 'Yes' END,
        '4', 'Yes',
        '5', CASE WHEN v_scores[i] >= 6 THEN 'Yes' ELSE 'No' END,
        '6', CASE WHEN v_scores[i] >= 4 THEN 'No' ELSE 'Yes' END,
        '7', CASE WHEN v_scores[i] >= 5 THEN 'No' ELSE 'Yes' END,
        '8', CASE WHEN v_scores[i] >= 3 THEN 'No' ELSE 'Yes' END,
        '9', CASE WHEN v_scores[i] >= 4 THEN 'No' ELSE 'Yes' END,
        '10', CASE WHEN v_scores[i] >= 5 THEN 'No' ELSE 'Yes' END
      ),
      v_child_profile_id,
      v_psychologist_id,
      now() - ((21 - i) || ' days')::interval
    )
    ON CONFLICT (id) DO NOTHING;

    -- C. Insert Psychologist Review (AI Review)
    INSERT INTO public.psychologist_reviews (
      id,
      case_id,
      psychologist_id,
      observations,
      audit_notes,
      review_summary,
      recommendations,
      status,
      joint_attention,
      motor_repetitions,
      eye_contact,
      created_at
    ) VALUES (
      v_review_id,
      v_case_id,
      v_psychologist_id,
      v_obs[i],
      'AI Analysis Pipeline v2.4 initialized. Frame rate 30fps processed. Object tracking and gaze vector neural network evaluation completed successfully.',
      v_summaries[i],
      v_recs[i],
      'completed',
      v_joint_attentions[i],
      v_motor_reps[i],
      v_eye_contacts[i],
      now() - ((21 - i) || ' days')::interval
    )
    ON CONFLICT (id) DO NOTHING;

    -- D. Insert Video Annotations for AI markers
    INSERT INTO public.video_annotations (
      id,
      case_id,
      timestamp_seconds,
      annotation_text,
      category,
      created_at
    ) VALUES 
      (gen_random_uuid(), v_case_id, 12, 'AI Marker 00:12 - Joint attention prompt response evaluated', 'Social Interaction', now() - ((21 - i) || ' days')::interval),
      (gen_random_uuid(), v_case_id, 45, 'AI Marker 00:45 - Motor movement & eye gaze vector recorded', 'Eye Contact', now() - ((21 - i) || ' days')::interval);

    -- E. Insert Notification
    IF v_parent_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        id,
        user_id,
        title,
        message,
        is_read,
        created_at
      ) VALUES (
        gen_random_uuid(),
        v_parent_id,
        'AI Observations Completed',
        'AI Evaluator report for ' || v_names[i] || ' is now completed and available for review.',
        false,
        now() - ((21 - i) || ' days')::interval
      );
    END IF;

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Successfully seeded 20 child records with full AI clinical reviews!',
    'count', v_inserted_count,
    'parent_id', v_parent_id
  );
END;
$$;

-- Grant EXECUTE permissions
GRANT EXECUTE ON FUNCTION seed_20_child_records(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_20_child_records(uuid) TO anon;
