-- ==============================================================================
-- RISERANGER 2 — DEFINITIVE SCORE CALIBRATION & CLEANUP
-- ==============================================================================
-- Removes extra submissions from "USN Rename Correlation 6" and
-- "Alternative Execution Mechanisms" to calibrate exact freeze scoreboard scores.
-- ==============================================================================

DO $$
DECLARE
    v_event_id TEXT;
    v_team_sindikat TEXT;
    v_team_patient_zero TEXT;
    v_team_owlshield TEXT;
    v_team_fanskyisst TEXT;
    v_team_404 TEXT;
    v_team_anak_buah TEXT;
BEGIN
    -- 1. Identify Target Event
    SELECT id::TEXT INTO v_event_id FROM events WHERE is_active = true ORDER BY created_at DESC LIMIT 1;
    IF v_event_id IS NULL THEN
        SELECT event_id::TEXT INTO v_event_id FROM teams WHERE name ILIKE '%Sindikat%' LIMIT 1;
    END IF;

    -- 2. Identify Teams
    SELECT id::TEXT INTO v_team_sindikat FROM teams WHERE name ILIKE '%Sindikat%' LIMIT 1;
    SELECT id::TEXT INTO v_team_patient_zero FROM teams WHERE name ILIKE '%Patient Zero%' LIMIT 1;
    SELECT id::TEXT INTO v_team_owlshield FROM teams WHERE name ILIKE '%Owlshield%' LIMIT 1;
    SELECT id::TEXT INTO v_team_fanskyisst FROM teams WHERE name ILIKE '%Fanskyisst%' LIMIT 1;
    SELECT id::TEXT INTO v_team_404 FROM teams WHERE name ILIKE '%404%' LIMIT 1;
    SELECT id::TEXT INTO v_team_anak_buah FROM teams WHERE name ILIKE '%Anak buah%' LIMIT 1;

    -- 3. Delete extra submissions from USN Rename Correlation 6 and Alternative Execution Mechanisms
    DELETE FROM submissions 
    WHERE challenge_id IN (
        SELECT id FROM challenges WHERE event_id = v_event_id AND (
            title ILIKE '%USN Rename Correlation 6%' 
            OR title ILIKE '%Alternative Execution Mechanisms%'
            OR id IN ('923fd8f9-978a-4170-b4c0-85eaf4acff58', '4ec35cb9-74b4-4c56-afc8-378ffefcf8fe')
        )
    )
    AND team_id IN (
        v_team_sindikat, v_team_patient_zero, v_team_owlshield, v_team_fanskyisst, v_team_404, v_team_anak_buah
    );

    -- 4. Update Exact Team Scores to Match Screenshot
    UPDATE teams SET score = 5610 WHERE id = v_team_patient_zero;
    UPDATE teams SET score = 5565 WHERE id = v_team_owlshield;
    UPDATE teams SET score = 5285 WHERE id = v_team_fanskyisst;
    UPDATE teams SET score = 4950 WHERE id = v_team_sindikat;
    UPDATE teams SET score = 3905 WHERE id = v_team_404;
    UPDATE teams SET score = 3780 WHERE id = v_team_anak_buah;

    RAISE NOTICE '🎉 SCORE CALIBRATION COMPLETE — ALL SCORES EXACTLY MATCH SCREENSHOT!';
END $$;

-- Verifikasi Total Score & Flag Points:
SELECT 
    t.name AS squad_name,
    t.score AS total_score
FROM teams t
WHERE t.name ILIKE '%Patient Zero%' OR t.name ILIKE '%Owlshield%' OR t.name ILIKE '%Fanskyisst%' OR t.name ILIKE '%Sindikat%' OR t.name ILIKE '%404%' OR t.name ILIKE '%Anak buah%'
ORDER BY t.score DESC;
