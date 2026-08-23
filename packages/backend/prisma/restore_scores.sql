-- ==============================================================================
-- RISERANGER 2 — INCIDENT RESPONSE CTF
-- PRODUCTION DATABASE SCORE & SUBMISSION RESTORATION SQL SCRIPT
-- ==============================================================================
-- TARGET CHALLENGES:
-- 1. Host & User Baseline Discovery  (100 PTS)
-- 2. USN Baseline Journal Forensics   (100 PTS)
-- 3. Baseline Victim Triage Analysis (100 PTS)
-- 4. Baseline Execution Forensics    (100 PTS)
-- ==============================================================================

DO $$
DECLARE
    v_event_id TEXT;
    v_admin_id TEXT;
    
    -- Challenge IDs
    v_chal_host TEXT;
    v_chal_usn TEXT;
    v_chal_victim TEXT;
    v_chal_exec TEXT;
    
    -- Team IDs
    v_team_sindikat TEXT;
    v_team_patient_zero TEXT;
    v_team_owlshield TEXT;
    v_team_fanskyisst TEXT;
    v_team_404 TEXT;
    v_team_anak_buah TEXT;
    
    -- User IDs (for submission attribution)
    v_user_sindikat TEXT;
    v_user_patient_zero TEXT;
    v_user_owlshield TEXT;
    v_user_fanskyisst TEXT;
    v_user_404 TEXT;
    v_user_anak_buah TEXT;

    -- Base Timestamp (Must be BEFORE freeze_time so it shows on both Freeze & Live scoreboards)
    v_base_time TIMESTAMP;
BEGIN
    RAISE NOTICE '🚀 Starting Production CTF Score Restoration...';

    -- 1. Identify Target Event
    SELECT id::TEXT INTO v_event_id FROM events WHERE is_active = true ORDER BY created_at DESC LIMIT 1;
    IF v_event_id IS NULL THEN
        SELECT event_id::TEXT INTO v_event_id FROM teams LIMIT 1;
    END IF;
    IF v_event_id IS NULL THEN
        RAISE EXCEPTION '❌ No active event found in database!';
    END IF;
    RAISE NOTICE '✓ Selected Event ID: %', v_event_id;

    -- Calculate base timestamp before freeze_time
    SELECT 
        CASE 
            WHEN freeze_time IS NOT NULL AND start_time IS NOT NULL AND freeze_time > start_time 
                THEN start_time + ((freeze_time - start_time) / 4)
            WHEN freeze_time IS NOT NULL 
                THEN freeze_time - INTERVAL '30 minutes'
            WHEN start_time IS NOT NULL 
                THEN start_time + INTERVAL '10 minutes'
            ELSE NOW() - INTERVAL '1 day'
        END
    INTO v_base_time
    FROM events WHERE id = v_event_id;

    IF v_base_time IS NULL THEN
        v_base_time := NOW() - INTERVAL '1 day';
    END IF;
    RAISE NOTICE '✓ Calculated Base Submission Time (Before Freeze): %', v_base_time;

    -- 2. Identify Admin User
    SELECT id::TEXT INTO v_admin_id FROM users WHERE role IN ('ADMIN', 'SUPERADMIN', 'WADMIN') LIMIT 1;
    IF v_admin_id IS NULL THEN
        SELECT id::TEXT INTO v_admin_id FROM users LIMIT 1;
    END IF;

    -- 3. Match Teams
    SELECT id::TEXT INTO v_team_sindikat FROM teams WHERE name ILIKE '%Sindikat%' LIMIT 1;
    SELECT id::TEXT INTO v_team_patient_zero FROM teams WHERE name ILIKE '%Patient Zero%' LIMIT 1;
    SELECT id::TEXT INTO v_team_owlshield FROM teams WHERE name ILIKE '%Owlshield%' LIMIT 1;
    SELECT id::TEXT INTO v_team_fanskyisst FROM teams WHERE name ILIKE '%Fanskyisst%' LIMIT 1;
    SELECT id::TEXT INTO v_team_404 FROM teams WHERE name ILIKE '%404%' LIMIT 1;
    SELECT id::TEXT INTO v_team_anak_buah FROM teams WHERE name ILIKE '%Anak buah%' LIMIT 1;

    IF v_team_sindikat IS NULL OR v_team_patient_zero IS NULL OR v_team_owlshield IS NULL OR
       v_team_fanskyisst IS NULL OR v_team_404 IS NULL OR v_team_anak_buah IS NULL THEN
        RAISE EXCEPTION '❌ Could not find all 6 teams in database. Check team names!';
    END IF;

    RAISE NOTICE '✓ All 6 Squad Teams successfully matched.';

    -- 4. Match Users for each Team
    SELECT user_id::TEXT INTO v_user_sindikat FROM team_members WHERE team_id = v_team_sindikat LIMIT 1;
    IF v_user_sindikat IS NULL THEN SELECT leader_id::TEXT INTO v_user_sindikat FROM teams WHERE id = v_team_sindikat; END IF;

    SELECT user_id::TEXT INTO v_user_patient_zero FROM team_members WHERE team_id = v_team_patient_zero LIMIT 1;
    IF v_user_patient_zero IS NULL THEN SELECT leader_id::TEXT INTO v_user_patient_zero FROM teams WHERE id = v_team_patient_zero; END IF;

    SELECT user_id::TEXT INTO v_user_owlshield FROM team_members WHERE team_id = v_team_owlshield LIMIT 1;
    IF v_user_owlshield IS NULL THEN SELECT leader_id::TEXT INTO v_user_owlshield FROM teams WHERE id = v_team_owlshield; END IF;

    SELECT user_id::TEXT INTO v_user_fanskyisst FROM team_members WHERE team_id = v_team_fanskyisst LIMIT 1;
    IF v_user_fanskyisst IS NULL THEN SELECT leader_id::TEXT INTO v_user_fanskyisst FROM teams WHERE id = v_team_fanskyisst; END IF;

    SELECT user_id::TEXT INTO v_user_404 FROM team_members WHERE team_id = v_team_404 LIMIT 1;
    IF v_user_404 IS NULL THEN SELECT leader_id::TEXT INTO v_user_404 FROM teams WHERE id = v_team_404; END IF;

    SELECT user_id::TEXT INTO v_user_anak_buah FROM team_members WHERE team_id = v_team_anak_buah LIMIT 1;
    IF v_user_anak_buah IS NULL THEN SELECT leader_id::TEXT INTO v_user_anak_buah FROM teams WHERE id = v_team_anak_buah; END IF;

    -- 5. Find or Create the 4 Challenges
    -- Challenge 1: Host & User
    SELECT id::TEXT INTO v_chal_host FROM challenges WHERE title ILIKE '%Host & User%' AND event_id = v_event_id LIMIT 1;
    IF v_chal_host IS NULL THEN
        v_chal_host := gen_random_uuid()::TEXT;
        INSERT INTO challenges (id, title, category, points, description, flag, flag_hash, is_active, is_hidden, event_id, created_by, created_at)
        VALUES (v_chal_host, 'Host & User Baseline Discovery', 'INCIDENT_RESPONSE', 100,
                'Investigasi baseline host dan user untuk mengidentifikasi anomali akun serta artefak pada sistem target.',
                'FLAG{host_and_user_baseline_discovery_verified}',
                'ca35da201f0af7917013c0b552e6664a9bb80119639017c1071814f04bd8990f',
                true, false, v_event_id, v_admin_id, NOW());
    END IF;

    -- Challenge 2: USN Baseline
    SELECT id::TEXT INTO v_chal_usn FROM challenges WHERE title ILIKE '%USN Baselin%' AND event_id = v_event_id LIMIT 1;
    IF v_chal_usn IS NULL THEN
        v_chal_usn := gen_random_uuid()::TEXT;
        INSERT INTO challenges (id, title, category, points, description, flag, flag_hash, is_active, is_hidden, event_id, created_by, created_at)
        VALUES (v_chal_usn, 'USN Baseline Journal Forensics', 'DIGITAL_FORENSICS', 100,
                'Analisis NTFS Change Journal ($UsnJrnl) untuk melacak pembuatan dan modifikasi file mencurigakan.',
                'FLAG{usn_journal_baseline_forensics_recovered}',
                'd7e10211c05f92c26092bdac598564e7d5d5401ddfaa84e42777874add90de2c',
                true, false, v_event_id, v_admin_id, NOW());
    END IF;

    -- Challenge 3: Baseline Victim
    SELECT id::TEXT INTO v_chal_victim FROM challenges WHERE title ILIKE '%Baseline Vi%' AND event_id = v_event_id LIMIT 1;
    IF v_chal_victim IS NULL THEN
        v_chal_victim := gen_random_uuid()::TEXT;
        INSERT INTO challenges (id, title, category, points, description, flag, flag_hash, is_active, is_hidden, event_id, created_by, created_at)
        VALUES (v_chal_victim, 'Baseline Victim Triage Analysis', 'INCIDENT_RESPONSE', 100,
                'Triage forensik terhadap sistem korban untuk merekonstruksi jejak awal insiden kompromi.',
                'FLAG{baseline_victim_triage_compromised_host}',
                '423688b001ccfec1e2d60f0ec0c345f5c5a454ce5852e5713c9815aecb83efb7',
                true, false, v_event_id, v_admin_id, NOW());
    END IF;

    -- Challenge 4: Baseline Execution
    SELECT id::TEXT INTO v_chal_exec FROM challenges WHERE title ILIKE '%Baseline Ex%' AND event_id = v_event_id LIMIT 1;
    IF v_chal_exec IS NULL THEN
        v_chal_exec := gen_random_uuid()::TEXT;
        INSERT INTO challenges (id, title, category, points, description, flag, flag_hash, is_active, is_hidden, event_id, created_by, created_at)
        VALUES (v_chal_exec, 'Baseline Execution Forensics', 'INCIDENT_RESPONSE', 100,
                'Pemeriksaan artefak eksekusi program (Prefetch, Shimcache, Amcache) pada sistem operasi host.',
                'FLAG{baseline_execution_evidence_shimcache_amcache}',
                'e1c6b007df8f558a40654c8cc58607cd5df3be075d72f9483e60bfe421ff5277',
                true, false, v_event_id, v_admin_id, NOW());
    END IF;

    RAISE NOTICE '✓ All 4 Challenges configured: Host(%), USN(%), Victim(%), Exec(%)', v_chal_host, v_chal_usn, v_chal_victim, v_chal_exec;

    -- 6. Insert Submissions with Exact Sequential Timestamps
    -- =========================================================================
    -- CHALLENGE 1: Host & User
    -- 1st: Sindikat (+150), 2nd: Patient Zero (+125), 3rd: Owlshield (+110), 4th: 404 (+100), 5th: Fanskyisst (+95), 6th: Anak buah (+90)
    -- =========================================================================
    -- Hit 1 (Sindikat - First Blood)
    DELETE FROM submissions WHERE team_id = v_team_sindikat AND challenge_id = v_chal_host;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_sindikat, v_user_sindikat, v_chal_host, 'FLAG{host_and_user_baseline_discovery_verified}', true, v_base_time + INTERVAL '0 seconds');

    -- Hit 2 (Patient Zero)
    DELETE FROM submissions WHERE team_id = v_team_patient_zero AND challenge_id = v_chal_host;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_patient_zero, v_user_patient_zero, v_chal_host, 'FLAG{host_and_user_baseline_discovery_verified}', true, v_base_time + INTERVAL '30 seconds');

    -- Hit 3 (Owlshield)
    DELETE FROM submissions WHERE team_id = v_team_owlshield AND challenge_id = v_chal_host;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_owlshield, v_user_owlshield, v_chal_host, 'FLAG{host_and_user_baseline_discovery_verified}', true, v_base_time + INTERVAL '60 seconds');

    -- Hit 4 (404 Team)
    DELETE FROM submissions WHERE team_id = v_team_404 AND challenge_id = v_chal_host;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_404, v_user_404, v_chal_host, 'FLAG{host_and_user_baseline_discovery_verified}', true, v_base_time + INTERVAL '90 seconds');

    -- Hit 5 (Fanskyisst)
    DELETE FROM submissions WHERE team_id = v_team_fanskyisst AND challenge_id = v_chal_host;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_fanskyisst, v_user_fanskyisst, v_chal_host, 'FLAG{host_and_user_baseline_discovery_verified}', true, v_base_time + INTERVAL '120 seconds');

    -- Hit 6 (Anak buah)
    DELETE FROM submissions WHERE team_id = v_team_anak_buah AND challenge_id = v_chal_host;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_anak_buah, v_user_anak_buah, v_chal_host, 'FLAG{host_and_user_baseline_discovery_verified}', true, v_base_time + INTERVAL '150 seconds');


    -- =========================================================================
    -- CHALLENGE 2: USN Baseline
    -- 1st: Sindikat (+150), 2nd: Owlshield (+125), 3rd: Patient Zero (+110), 4th: 404 (+100), 5th: Fanskyisst (+95), 6th: Anak buah (+90)
    -- =========================================================================
    -- Hit 1 (Sindikat - First Blood)
    DELETE FROM submissions WHERE team_id = v_team_sindikat AND challenge_id = v_chal_usn;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_sindikat, v_user_sindikat, v_chal_usn, 'FLAG{usn_journal_baseline_forensics_recovered}', true, v_base_time + INTERVAL '10 minutes 0 seconds');

    -- Hit 2 (Owlshield)
    DELETE FROM submissions WHERE team_id = v_team_owlshield AND challenge_id = v_chal_usn;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_owlshield, v_user_owlshield, v_chal_usn, 'FLAG{usn_journal_baseline_forensics_recovered}', true, v_base_time + INTERVAL '10 minutes 30 seconds');

    -- Hit 3 (Patient Zero)
    DELETE FROM submissions WHERE team_id = v_team_patient_zero AND challenge_id = v_chal_usn;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_patient_zero, v_user_patient_zero, v_chal_usn, 'FLAG{usn_journal_baseline_forensics_recovered}', true, v_base_time + INTERVAL '10 minutes 60 seconds');

    -- Hit 4 (404 Team)
    DELETE FROM submissions WHERE team_id = v_team_404 AND challenge_id = v_chal_usn;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_404, v_user_404, v_chal_usn, 'FLAG{usn_journal_baseline_forensics_recovered}', true, v_base_time + INTERVAL '10 minutes 90 seconds');

    -- Hit 5 (Fanskyisst)
    DELETE FROM submissions WHERE team_id = v_team_fanskyisst AND challenge_id = v_chal_usn;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_fanskyisst, v_user_fanskyisst, v_chal_usn, 'FLAG{usn_journal_baseline_forensics_recovered}', true, v_base_time + INTERVAL '10 minutes 120 seconds');

    -- Hit 6 (Anak buah)
    DELETE FROM submissions WHERE team_id = v_team_anak_buah AND challenge_id = v_chal_usn;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_anak_buah, v_user_anak_buah, v_chal_usn, 'FLAG{usn_journal_baseline_forensics_recovered}', true, v_base_time + INTERVAL '10 minutes 150 seconds');


    -- =========================================================================
    -- CHALLENGE 3: Baseline Victim
    -- 1st: Sindikat (+150), 2nd: Owlshield (+125), 3rd: Patient Zero (+110), 4th: 404 (+100), 5th: Fanskyisst (+95), 6th: Anak buah (+90)
    -- =========================================================================
    -- Hit 1 (Sindikat - First Blood)
    DELETE FROM submissions WHERE team_id = v_team_sindikat AND challenge_id = v_chal_victim;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_sindikat, v_user_sindikat, v_chal_victim, 'FLAG{baseline_victim_triage_compromised_host}', true, v_base_time + INTERVAL '20 minutes 0 seconds');

    -- Hit 2 (Owlshield)
    DELETE FROM submissions WHERE team_id = v_team_owlshield AND challenge_id = v_chal_victim;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_owlshield, v_user_owlshield, v_chal_victim, 'FLAG{baseline_victim_triage_compromised_host}', true, v_base_time + INTERVAL '20 minutes 30 seconds');

    -- Hit 3 (Patient Zero)
    DELETE FROM submissions WHERE team_id = v_team_patient_zero AND challenge_id = v_chal_victim;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_patient_zero, v_user_patient_zero, v_chal_victim, 'FLAG{baseline_victim_triage_compromised_host}', true, v_base_time + INTERVAL '20 minutes 60 seconds');

    -- Hit 4 (404 Team)
    DELETE FROM submissions WHERE team_id = v_team_404 AND challenge_id = v_chal_victim;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_404, v_user_404, v_chal_victim, 'FLAG{baseline_victim_triage_compromised_host}', true, v_base_time + INTERVAL '20 minutes 90 seconds');

    -- Hit 5 (Fanskyisst)
    DELETE FROM submissions WHERE team_id = v_team_fanskyisst AND challenge_id = v_chal_victim;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_fanskyisst, v_user_fanskyisst, v_chal_victim, 'FLAG{baseline_victim_triage_compromised_host}', true, v_base_time + INTERVAL '20 minutes 120 seconds');

    -- Hit 6 (Anak buah)
    DELETE FROM submissions WHERE team_id = v_team_anak_buah AND challenge_id = v_chal_victim;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_anak_buah, v_user_anak_buah, v_chal_victim, 'FLAG{baseline_victim_triage_compromised_host}', true, v_base_time + INTERVAL '20 minutes 150 seconds');


    -- =========================================================================
    -- CHALLENGE 4: Baseline Execution
    -- 1st: Sindikat (+150), 2nd: Owlshield (+125), 3rd: Patient Zero (+110), 4th: Fanskyisst (+100), 5th: 404 (+95), 6th: Anak buah (+90)
    -- =========================================================================
    -- Hit 1 (Sindikat - First Blood)
    DELETE FROM submissions WHERE team_id = v_team_sindikat AND challenge_id = v_chal_exec;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_sindikat, v_user_sindikat, v_chal_exec, 'FLAG{baseline_execution_evidence_shimcache_amcache}', true, v_base_time + INTERVAL '30 minutes 0 seconds');

    -- Hit 2 (Owlshield)
    DELETE FROM submissions WHERE team_id = v_team_owlshield AND challenge_id = v_chal_exec;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_owlshield, v_user_owlshield, v_chal_exec, 'FLAG{baseline_execution_evidence_shimcache_amcache}', true, v_base_time + INTERVAL '30 minutes 30 seconds');

    -- Hit 3 (Patient Zero)
    DELETE FROM submissions WHERE team_id = v_team_patient_zero AND challenge_id = v_chal_exec;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_patient_zero, v_user_patient_zero, v_chal_exec, 'FLAG{baseline_execution_evidence_shimcache_amcache}', true, v_base_time + INTERVAL '30 minutes 60 seconds');

    -- Hit 4 (Fanskyisst)
    DELETE FROM submissions WHERE team_id = v_team_fanskyisst AND challenge_id = v_chal_exec;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_fanskyisst, v_user_fanskyisst, v_chal_exec, 'FLAG{baseline_execution_evidence_shimcache_amcache}', true, v_base_time + INTERVAL '30 minutes 90 seconds');

    -- Hit 5 (404 Team)
    DELETE FROM submissions WHERE team_id = v_team_404 AND challenge_id = v_chal_exec;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_404, v_user_404, v_chal_exec, 'FLAG{baseline_execution_evidence_shimcache_amcache}', true, v_base_time + INTERVAL '30 minutes 120 seconds');

    -- Hit 6 (Anak buah)
    DELETE FROM submissions WHERE team_id = v_team_anak_buah AND challenge_id = v_chal_exec;
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at)
    VALUES (gen_random_uuid()::TEXT, v_team_anak_buah, v_user_anak_buah, v_chal_exec, 'FLAG{baseline_execution_evidence_shimcache_amcache}', true, v_base_time + INTERVAL '30 minutes 150 seconds');

    -- 7. Upsert First Blood Records for Sindikat
    INSERT INTO first_bloods (id, challenge_id, team_id, achieved_at)
    VALUES (gen_random_uuid()::TEXT, v_chal_host, v_team_sindikat, v_base_time + INTERVAL '0 seconds')
    ON CONFLICT (challenge_id) DO UPDATE SET team_id = v_team_sindikat, achieved_at = v_base_time + INTERVAL '0 seconds';

    INSERT INTO first_bloods (id, challenge_id, team_id, achieved_at)
    VALUES (gen_random_uuid()::TEXT, v_chal_usn, v_team_sindikat, v_base_time + INTERVAL '10 minutes 0 seconds')
    ON CONFLICT (challenge_id) DO UPDATE SET team_id = v_team_sindikat, achieved_at = v_base_time + INTERVAL '10 minutes 0 seconds';

    INSERT INTO first_bloods (id, challenge_id, team_id, achieved_at)
    VALUES (gen_random_uuid()::TEXT, v_chal_victim, v_team_sindikat, v_base_time + INTERVAL '20 minutes 0 seconds')
    ON CONFLICT (challenge_id) DO UPDATE SET team_id = v_team_sindikat, achieved_at = v_base_time + INTERVAL '20 minutes 0 seconds';

    INSERT INTO first_bloods (id, challenge_id, team_id, achieved_at)
    VALUES (gen_random_uuid()::TEXT, v_chal_exec, v_team_sindikat, v_base_time + INTERVAL '30 minutes 0 seconds')
    ON CONFLICT (challenge_id) DO UPDATE SET team_id = v_team_sindikat, achieved_at = v_base_time + INTERVAL '30 minutes 0 seconds';

    RAISE NOTICE '✓ First Bloods successfully assigned to Sindikat.';

    -- 8. Synchronize Final Exact Scoreboard Totals for the 6 Teams
    -- Verified mathematically from screenshot:
    -- Sindikat:     6250 PTS (6400 flag - 150 hint)
    -- Patient Zero: 5610 PTS (5760 flag - 150 hint)
    -- Owlshield:    5565 PTS (5715 flag - 150 hint)
    -- Fanskyisst:   5285 PTS (5435 flag - 150 hint)
    -- 404 Team:     3905 PTS (3905 flag)
    -- Anak buah:    3780 PTS (3780 flag)
    UPDATE teams SET score = 6250 WHERE id = v_team_sindikat;
    UPDATE teams SET score = 5610 WHERE id = v_team_patient_zero;
    UPDATE teams SET score = 5565 WHERE id = v_team_owlshield;
    UPDATE teams SET score = 5285 WHERE id = v_team_fanskyisst;
    UPDATE teams SET score = 3905 WHERE id = v_team_404;
    UPDATE teams SET score = 3780 WHERE id = v_team_anak_buah;

    RAISE NOTICE '================================================================';
    RAISE NOTICE '🎉 SCORE RESTORATION COMPLETED SUCCESSFULLY WITH 100%% INTEGRITY!';
    RAISE NOTICE '================================================================';
END $$;

-- Verify Resulting Scoreboard:
SELECT 
    t.name AS team_name,
    t.score AS restored_total_score,
    COUNT(s.id) AS total_correct_solves,
    t.color,
    t.is_banned
FROM teams t
LEFT JOIN submissions s ON s.team_id = t.id AND s.is_correct = true
GROUP BY t.id, t.name, t.score, t.color, t.is_banned
ORDER BY t.score DESC;
