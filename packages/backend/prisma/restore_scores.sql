-- ==============================================================================
-- RISERANGER 2 — COMPLETE 100% DEFINITIVE SCOREBOARD RESTORATION SCRIPT
-- ==============================================================================
-- Restores ALL 4 Target Challenges and Synchronizes Exact Scoreboard Badges:
-- 1. Host & User Context (100 PTS)
-- 2. USN Baseline Directory & Timestamp Mapping (100 PTS)
-- 3. Baseline Victim Files (100 PTS)
-- 4. Baseline Expansion & Hash Manifest (100 PTS)
-- ==============================================================================

DO $$
DECLARE
    v_event_id TEXT;
    
    -- Exact 4 Challenge IDs shown on the scoreboard
    v_chal_host TEXT;
    v_chal_usn TEXT;
    v_chal_victim TEXT;
    v_chal_exec TEXT;
    
    -- Teams
    v_team_sindikat TEXT;
    v_team_patient_zero TEXT;
    v_team_owlshield TEXT;
    v_team_fanskyisst TEXT;
    v_team_404 TEXT;
    v_team_anak_buah TEXT;
    
    -- Users
    v_user_sindikat TEXT;
    v_user_patient_zero TEXT;
    v_user_owlshield TEXT;
    v_user_fanskyisst TEXT;
    v_user_404 TEXT;
    v_user_anak_buah TEXT;
    
    v_base_time TIMESTAMP;
BEGIN
    -- 1. Identify Target Event
    SELECT id::TEXT INTO v_event_id FROM events WHERE is_active = true ORDER BY created_at DESC LIMIT 1;
    IF v_event_id IS NULL THEN
        SELECT event_id::TEXT INTO v_event_id FROM teams WHERE name ILIKE '%Sindikat%' LIMIT 1;
    END IF;
    
    -- Base timestamp (guaranteed before freeze_time)
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

    IF v_base_time IS NULL THEN v_base_time := NOW() - INTERVAL '1 day'; END IF;

    -- 2. Identify the 4 EXACT 100-Point Challenges matching the Scoreboard Columns
    -- 1. Host & User Context
    SELECT id::TEXT INTO v_chal_host 
    FROM challenges 
    WHERE event_id = v_event_id AND title ILIKE '%Host & User%' 
    ORDER BY created_at ASC LIMIT 1;

    -- 2. USN Baseline Directory & Timestamp Mapping
    SELECT id::TEXT INTO v_chal_usn 
    FROM challenges 
    WHERE event_id = v_event_id AND title ILIKE '%USN Baseline%' 
    ORDER BY created_at ASC LIMIT 1;

    -- 3. Baseline Victim Files
    SELECT id::TEXT INTO v_chal_victim 
    FROM challenges 
    WHERE event_id = v_event_id AND title ILIKE '%Baseline Victim%' 
    ORDER BY created_at ASC LIMIT 1;

    -- 4. Baseline Expansion & Hash Manifest
    SELECT id::TEXT INTO v_chal_exec 
    FROM challenges 
    WHERE event_id = v_event_id AND title ILIKE '%Baseline Expans%' 
    ORDER BY created_at ASC LIMIT 1;

    RAISE NOTICE 'Targeted 4 Challenges:';
    RAISE NOTICE '1. Host: %', v_chal_host;
    RAISE NOTICE '2. USN: %', v_chal_usn;
    RAISE NOTICE '3. Victim: %', v_chal_victim;
    RAISE NOTICE '4. Exec: %', v_chal_exec;

    -- 3. Match Teams
    SELECT id::TEXT INTO v_team_sindikat FROM teams WHERE name ILIKE '%Sindikat%' LIMIT 1;
    SELECT id::TEXT INTO v_team_patient_zero FROM teams WHERE name ILIKE '%Patient Zero%' LIMIT 1;
    SELECT id::TEXT INTO v_team_owlshield FROM teams WHERE name ILIKE '%Owlshield%' LIMIT 1;
    SELECT id::TEXT INTO v_team_fanskyisst FROM teams WHERE name ILIKE '%Fanskyisst%' LIMIT 1;
    SELECT id::TEXT INTO v_team_404 FROM teams WHERE name ILIKE '%404%' LIMIT 1;
    SELECT id::TEXT INTO v_team_anak_buah FROM teams WHERE name ILIKE '%Anak buah%' LIMIT 1;

    -- 4. Match Users
    SELECT COALESCE((SELECT user_id::TEXT FROM team_members WHERE team_id = v_team_sindikat LIMIT 1), (SELECT leader_id::TEXT FROM teams WHERE id = v_team_sindikat)) INTO v_user_sindikat;
    SELECT COALESCE((SELECT user_id::TEXT FROM team_members WHERE team_id = v_team_patient_zero LIMIT 1), (SELECT leader_id::TEXT FROM teams WHERE id = v_team_patient_zero)) INTO v_user_patient_zero;
    SELECT COALESCE((SELECT user_id::TEXT FROM team_members WHERE team_id = v_team_owlshield LIMIT 1), (SELECT leader_id::TEXT FROM teams WHERE id = v_team_owlshield)) INTO v_user_owlshield;
    SELECT COALESCE((SELECT user_id::TEXT FROM team_members WHERE team_id = v_team_fanskyisst LIMIT 1), (SELECT leader_id::TEXT FROM teams WHERE id = v_team_fanskyisst)) INTO v_user_fanskyisst;
    SELECT COALESCE((SELECT user_id::TEXT FROM team_members WHERE team_id = v_team_404 LIMIT 1), (SELECT leader_id::TEXT FROM teams WHERE id = v_team_404)) INTO v_user_404;
    SELECT COALESCE((SELECT user_id::TEXT FROM team_members WHERE team_id = v_team_anak_buah LIMIT 1), (SELECT leader_id::TEXT FROM teams WHERE id = v_team_anak_buah)) INTO v_user_anak_buah;

    -- 5. Delete previous submissions for these 4 challenges to ensure clean re-insertion
    DELETE FROM submissions WHERE challenge_id IN (v_chal_host, v_chal_usn, v_chal_victim, v_chal_exec);
    DELETE FROM submissions WHERE challenge_id IN (
        SELECT id FROM challenges WHERE event_id = v_event_id AND (
            title ILIKE '%USN Rename Correlation 6%' 
            OR title ILIKE '%Alternative Execution Mechanisms%'
        )
    ) AND team_id IN (v_team_sindikat, v_team_patient_zero, v_team_owlshield, v_team_fanskyisst, v_team_404, v_team_anak_buah);

    -- 6. INSERT SUBMISSIONS FOR ALL 4 CHALLENGES WITH EXACT HIERARCHY
    -- =========================================================================
    -- Challenge 1: Host & User Context (100 PTS)
    -- 1st: Sindikat (+150), 2nd: Patient Zero (+125), 3rd: Owlshield (+110), 4th: 404 (+100), 5th: Fanskyisst (+95), 6th: Anak buah (+90)
    -- =========================================================================
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at) VALUES
    (gen_random_uuid()::TEXT, v_team_sindikat, v_user_sindikat, v_chal_host, 'FLAG{host_and_user_baseline_discovery_verified}', true, v_base_time + INTERVAL '0 seconds'),
    (gen_random_uuid()::TEXT, v_team_patient_zero, v_user_patient_zero, v_chal_host, 'FLAG{host_and_user_baseline_discovery_verified}', true, v_base_time + INTERVAL '30 seconds'),
    (gen_random_uuid()::TEXT, v_team_owlshield, v_user_owlshield, v_chal_host, 'FLAG{host_and_user_baseline_discovery_verified}', true, v_base_time + INTERVAL '60 seconds'),
    (gen_random_uuid()::TEXT, v_team_404, v_user_404, v_chal_host, 'FLAG{host_and_user_baseline_discovery_verified}', true, v_base_time + INTERVAL '90 seconds'),
    (gen_random_uuid()::TEXT, v_team_fanskyisst, v_user_fanskyisst, v_chal_host, 'FLAG{host_and_user_baseline_discovery_verified}', true, v_base_time + INTERVAL '120 seconds'),
    (gen_random_uuid()::TEXT, v_team_anak_buah, v_user_anak_buah, v_chal_host, 'FLAG{host_and_user_baseline_discovery_verified}', true, v_base_time + INTERVAL '150 seconds');

    -- =========================================================================
    -- Challenge 2: USN Baseline Directory & Timestamp Mapping (100 PTS)
    -- 1st: Sindikat (+150), 2nd: Owlshield (+125), 3rd: Patient Zero (+110), 4th: 404 (+100), 5th: Fanskyisst (+95), 6th: Anak buah (+90)
    -- =========================================================================
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at) VALUES
    (gen_random_uuid()::TEXT, v_team_sindikat, v_user_sindikat, v_chal_usn, 'FLAG{usn_journal_baseline_forensics_recovered}', true, v_base_time + INTERVAL '10 minutes 0 seconds'),
    (gen_random_uuid()::TEXT, v_team_owlshield, v_user_owlshield, v_chal_usn, 'FLAG{usn_journal_baseline_forensics_recovered}', true, v_base_time + INTERVAL '10 minutes 30 seconds'),
    (gen_random_uuid()::TEXT, v_team_patient_zero, v_user_patient_zero, v_chal_usn, 'FLAG{usn_journal_baseline_forensics_recovered}', true, v_base_time + INTERVAL '10 minutes 60 seconds'),
    (gen_random_uuid()::TEXT, v_team_404, v_user_404, v_chal_usn, 'FLAG{usn_journal_baseline_forensics_recovered}', true, v_base_time + INTERVAL '10 minutes 90 seconds'),
    (gen_random_uuid()::TEXT, v_team_fanskyisst, v_user_fanskyisst, v_chal_usn, 'FLAG{usn_journal_baseline_forensics_recovered}', true, v_base_time + INTERVAL '10 minutes 120 seconds'),
    (gen_random_uuid()::TEXT, v_team_anak_buah, v_user_anak_buah, v_chal_usn, 'FLAG{usn_journal_baseline_forensics_recovered}', true, v_base_time + INTERVAL '10 minutes 150 seconds');

    -- =========================================================================
    -- Challenge 3: Baseline Victim Files (100 PTS)
    -- 1st: Sindikat (+150), 2nd: Owlshield (+125), 3rd: Patient Zero (+110), 4th: 404 (+100), 5th: Fanskyisst (+95), 6th: Anak buah (+90)
    -- =========================================================================
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at) VALUES
    (gen_random_uuid()::TEXT, v_team_sindikat, v_user_sindikat, v_chal_victim, 'FLAG{baseline_victim_triage_compromised_host}', true, v_base_time + INTERVAL '20 minutes 0 seconds'),
    (gen_random_uuid()::TEXT, v_team_owlshield, v_user_owlshield, v_chal_victim, 'FLAG{baseline_victim_triage_compromised_host}', true, v_base_time + INTERVAL '20 minutes 30 seconds'),
    (gen_random_uuid()::TEXT, v_team_patient_zero, v_user_patient_zero, v_chal_victim, 'FLAG{baseline_victim_triage_compromised_host}', true, v_base_time + INTERVAL '20 minutes 60 seconds'),
    (gen_random_uuid()::TEXT, v_team_404, v_user_404, v_chal_victim, 'FLAG{baseline_victim_triage_compromised_host}', true, v_base_time + INTERVAL '20 minutes 90 seconds'),
    (gen_random_uuid()::TEXT, v_team_fanskyisst, v_user_fanskyisst, v_chal_victim, 'FLAG{baseline_victim_triage_compromised_host}', true, v_base_time + INTERVAL '20 minutes 120 seconds'),
    (gen_random_uuid()::TEXT, v_team_anak_buah, v_user_anak_buah, v_chal_victim, 'FLAG{baseline_victim_triage_compromised_host}', true, v_base_time + INTERVAL '20 minutes 150 seconds');

    -- =========================================================================
    -- Challenge 4: Baseline Expansion & Hash Manifest (100 PTS)
    -- 1st: Sindikat (+150), 2nd: Owlshield (+125), 3rd: Patient Zero (+110), 4th: Fanskyisst (+100), 5th: 404 (+95), 6th: Anak buah (+90)
    -- =========================================================================
    INSERT INTO submissions (id, team_id, user_id, challenge_id, flag, is_correct, submitted_at) VALUES
    (gen_random_uuid()::TEXT, v_team_sindikat, v_user_sindikat, v_chal_exec, 'FLAG{baseline_execution_evidence_shimcache_amcache}', true, v_base_time + INTERVAL '30 minutes 0 seconds'),
    (gen_random_uuid()::TEXT, v_team_owlshield, v_user_owlshield, v_chal_exec, 'FLAG{baseline_execution_evidence_shimcache_amcache}', true, v_base_time + INTERVAL '30 minutes 30 seconds'),
    (gen_random_uuid()::TEXT, v_team_patient_zero, v_user_patient_zero, v_chal_exec, 'FLAG{baseline_execution_evidence_shimcache_amcache}', true, v_base_time + INTERVAL '30 minutes 60 seconds'),
    (gen_random_uuid()::TEXT, v_team_fanskyisst, v_user_fanskyisst, v_chal_exec, 'FLAG{baseline_execution_evidence_shimcache_amcache}', true, v_base_time + INTERVAL '30 minutes 90 seconds'),
    (gen_random_uuid()::TEXT, v_team_404, v_user_404, v_chal_exec, 'FLAG{baseline_execution_evidence_shimcache_amcache}', true, v_base_time + INTERVAL '30 minutes 120 seconds'),
    (gen_random_uuid()::TEXT, v_team_anak_buah, v_user_anak_buah, v_chal_exec, 'FLAG{baseline_execution_evidence_shimcache_amcache}', true, v_base_time + INTERVAL '30 minutes 150 seconds');

    -- 7. Upsert First Blood Records
    INSERT INTO first_bloods (id, challenge_id, team_id, achieved_at) VALUES (gen_random_uuid()::TEXT, v_chal_host, v_team_sindikat, v_base_time + INTERVAL '0 seconds')
    ON CONFLICT (challenge_id) DO UPDATE SET team_id = v_team_sindikat, achieved_at = v_base_time + INTERVAL '0 seconds';

    INSERT INTO first_bloods (id, challenge_id, team_id, achieved_at) VALUES (gen_random_uuid()::TEXT, v_chal_usn, v_team_sindikat, v_base_time + INTERVAL '10 minutes 0 seconds')
    ON CONFLICT (challenge_id) DO UPDATE SET team_id = v_team_sindikat, achieved_at = v_base_time + INTERVAL '10 minutes 0 seconds';

    INSERT INTO first_bloods (id, challenge_id, team_id, achieved_at) VALUES (gen_random_uuid()::TEXT, v_chal_victim, v_team_sindikat, v_base_time + INTERVAL '20 minutes 0 seconds')
    ON CONFLICT (challenge_id) DO UPDATE SET team_id = v_team_sindikat, achieved_at = v_base_time + INTERVAL '20 minutes 0 seconds';

    INSERT INTO first_bloods (id, challenge_id, team_id, achieved_at) VALUES (gen_random_uuid()::TEXT, v_chal_exec, v_team_sindikat, v_base_time + INTERVAL '30 minutes 0 seconds')
    ON CONFLICT (challenge_id) DO UPDATE SET team_id = v_team_sindikat, achieved_at = v_base_time + INTERVAL '30 minutes 0 seconds';

    -- 8. SET EXACT FINAL TOTAL SCORES (100% MATCH TO FREEZE SCREENSHOT)
    UPDATE teams SET score = 5610 WHERE id = v_team_patient_zero;
    UPDATE teams SET score = 5565 WHERE id = v_team_owlshield;
    UPDATE teams SET score = 5285 WHERE id = v_team_fanskyisst;
    UPDATE teams SET score = 4950 WHERE id = v_team_sindikat;
    UPDATE teams SET score = 3905 WHERE id = v_team_404;
    UPDATE teams SET score = 3780 WHERE id = v_team_anak_buah;

    RAISE NOTICE '================================================================';
    RAISE NOTICE '🎉 RESTORATION COMPLETED: ALL 4 CHALLENGES RESTORED (SCORE 5610)!';
    RAISE NOTICE '================================================================';
END $$;

-- Verifikasi Seluruh Kolom Challenge:
SELECT 
    c.title AS challenge_title,
    c.points AS base_points,
    COUNT(s.id) AS total_solves
FROM challenges c
LEFT JOIN submissions s ON s.challenge_id = c.id AND s.is_correct = true
WHERE c.event_id = (SELECT id FROM events WHERE is_active = true ORDER BY created_at DESC LIMIT 1)
GROUP BY c.id, c.title, c.points, c.created_at
ORDER BY c.created_at ASC;
