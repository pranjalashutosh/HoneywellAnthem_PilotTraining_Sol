-- seed.sql — Sample data for dashboard visualization
-- 4 pilots with varied profiles, 5-10 drill results each

------------------------------------------------------------
-- PILOTS
------------------------------------------------------------
INSERT INTO pilots (id, name, accent_group, experience_level, total_hours, anthem_hours, previous_platform, created_at, last_active_at)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Sarah Mitchell',  'native_us',   'high_time', 8500, 120, 'Primus Epic',    '2026-02-01 10:00:00+00', '2026-03-14 15:30:00+00'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Rajesh Kapoor',   'south_asian', 'mid_time',  4200,  45, 'Garmin G5000',   '2026-02-05 08:00:00+00', '2026-03-13 11:00:00+00'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Hans Weber',      'european',    'atp',      15000, 200, 'Primus Epic',    '2026-01-20 14:00:00+00', '2026-03-15 09:45:00+00'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Maria Gonzalez',  'latin_american', 'low_time', 1200, 10, 'Collins Pro Line', '2026-02-15 12:00:00+00', '2026-03-12 16:20:00+00');

------------------------------------------------------------
-- SESSIONS
------------------------------------------------------------
INSERT INTO sessions (id, pilot_id, started_at, ended_at, drill_count)
VALUES
  -- Sarah: 2 sessions
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-03-10 14:00:00+00', '2026-03-10 15:30:00+00', 5),
  ('b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-03-14 14:00:00+00', '2026-03-14 15:30:00+00', 5),
  -- Rajesh: 1 session
  ('b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0002-4000-8000-000000000002', '2026-03-12 09:00:00+00', '2026-03-12 10:15:00+00', 5),
  -- Hans: 2 sessions
  ('b1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-03-08 08:00:00+00', '2026-03-08 09:30:00+00', 5),
  ('b1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-03-15 08:00:00+00', '2026-03-15 09:45:00+00', 5),
  -- Maria: 1 session
  ('b1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0004-4000-8000-000000000004', '2026-03-12 15:00:00+00', '2026-03-12 16:20:00+00', 5);

------------------------------------------------------------
-- DRILL RESULTS — Sarah Mitchell (high_time, native_us)
-- Generally strong scores, improving over time
------------------------------------------------------------
INSERT INTO drill_results (id, session_id, pilot_id, drill_id, overall_score, metrics_json, cbta_scores_json, cognitive_load_json, transcript_confidence, estimated_wer, completed_at)
VALUES
  -- Session 1
  ('c1000001-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001',
   'descent-conflict', 72, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":70,"WLM":68,"SAW":75,"KNO":72,"PSD":74,"FPM":73}',
   '[{"compositeLoad":42,"confidence":0.85}]', 0.88, 0.05, '2026-03-10 14:15:00+00'),

  ('c1000001-0002-4000-8000-000000000002', 'b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001',
   'weather-diversion', 78, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":74,"WLM":72,"SAW":78,"KNO":76,"PSD":80,"FPM":75}',
   '[{"compositeLoad":38,"confidence":0.90}]', 0.91, 0.04, '2026-03-10 14:35:00+00'),

  ('c1000001-0003-4000-8000-000000000003', 'b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001',
   'predict-wrong-freq', 85, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":76,"WLM":74,"SAW":88,"KNO":82,"PSD":78,"FPM":76}',
   '[{"compositeLoad":35,"confidence":0.92}]', 0.92, 0.04, '2026-03-10 14:55:00+00'),

  ('c1000001-0004-4000-8000-000000000004', 'b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001',
   'runway-change', 74, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":75,"WLM":70,"SAW":76,"KNO":74,"PSD":72,"FPM":78}',
   '[{"compositeLoad":45,"confidence":0.87}]', 0.89, 0.05, '2026-03-10 15:10:00+00'),

  ('c1000001-0005-4000-8000-000000000005', 'b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001',
   'holding-pattern', 70, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":72,"WLM":68,"SAW":70,"KNO":75,"PSD":71,"FPM":72}',
   '[{"compositeLoad":48,"confidence":0.84}]', 0.86, 0.06, '2026-03-10 15:25:00+00'),

  -- Session 2 (improvement)
  ('c1000001-0006-4000-8000-000000000006', 'b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001',
   'descent-conflict', 84, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":82,"WLM":78,"SAW":86,"KNO":80,"PSD":84,"FPM":82}',
   '[{"compositeLoad":32,"confidence":0.93}]', 0.93, 0.03, '2026-03-14 14:15:00+00'),

  ('c1000001-0007-4000-8000-000000000007', 'b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001',
   'weather-diversion', 88, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":85,"WLM":82,"SAW":90,"KNO":84,"PSD":88,"FPM":84}',
   '[{"compositeLoad":28,"confidence":0.95}]', 0.95, 0.03, '2026-03-14 14:35:00+00'),

  ('c1000001-0008-4000-8000-000000000008', 'b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001',
   'comms-handoff', 90, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":88,"WLM":85,"SAW":88,"KNO":86,"PSD":86,"FPM":85}',
   '[{"compositeLoad":25,"confidence":0.96}]', 0.96, 0.02, '2026-03-14 14:55:00+00'),

  ('c1000001-0009-4000-8000-000000000009', 'b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001',
   'predict-wrong-freq', 92, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":90,"WLM":86,"SAW":94,"KNO":88,"PSD":90,"FPM":86}',
   '[{"compositeLoad":22,"confidence":0.97}]', 0.97, 0.02, '2026-03-14 15:10:00+00'),

  ('c1000001-0010-4000-8000-000000000010', 'b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001',
   'runway-change', 86, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":84,"WLM":80,"SAW":86,"KNO":82,"PSD":84,"FPM":88}',
   '[{"compositeLoad":30,"confidence":0.94}]', 0.94, 0.03, '2026-03-14 15:25:00+00');

------------------------------------------------------------
-- DRILL RESULTS — Rajesh Kapoor (mid_time, south_asian)
-- Higher WER due to accent, solid decision-making
------------------------------------------------------------
INSERT INTO drill_results (id, session_id, pilot_id, drill_id, overall_score, metrics_json, cbta_scores_json, cognitive_load_json, transcript_confidence, estimated_wer, completed_at)
VALUES
  ('c2000001-0001-4000-8000-000000000001', 'b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0002-4000-8000-000000000002',
   'descent-conflict', 65, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":58,"WLM":65,"SAW":72,"KNO":68,"PSD":70,"FPM":62}',
   '[{"compositeLoad":52,"confidence":0.78}]', 0.80, 0.10, '2026-03-12 09:15:00+00'),

  ('c2000001-0002-4000-8000-000000000002', 'b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0002-4000-8000-000000000002',
   'weather-diversion', 68, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":62,"WLM":68,"SAW":70,"KNO":70,"PSD":74,"FPM":64}',
   '[{"compositeLoad":48,"confidence":0.82}]', 0.82, 0.09, '2026-03-12 09:35:00+00'),

  ('c2000001-0003-4000-8000-000000000003', 'b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0002-4000-8000-000000000002',
   'predict-wrong-freq', 60, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":55,"WLM":62,"SAW":65,"KNO":64,"PSD":66,"FPM":58}',
   '[{"compositeLoad":55,"confidence":0.76}]', 0.78, 0.11, '2026-03-12 09:55:00+00'),

  ('c2000001-0004-4000-8000-000000000004', 'b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0002-4000-8000-000000000002',
   'comms-handoff', 72, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":65,"WLM":72,"SAW":74,"KNO":72,"PSD":76,"FPM":68}',
   '[{"compositeLoad":44,"confidence":0.85}]', 0.84, 0.08, '2026-03-12 10:05:00+00'),

  ('c2000001-0005-4000-8000-000000000005', 'b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0002-4000-8000-000000000002',
   'holding-pattern', 62, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":60,"WLM":64,"SAW":66,"KNO":70,"PSD":68,"FPM":60}',
   '[{"compositeLoad":50,"confidence":0.80}]', 0.81, 0.09, '2026-03-12 10:15:00+00');

------------------------------------------------------------
-- DRILL RESULTS — Hans Weber (atp, european)
-- Very strong, consistent, low cognitive load
------------------------------------------------------------
INSERT INTO drill_results (id, session_id, pilot_id, drill_id, overall_score, metrics_json, cbta_scores_json, cognitive_load_json, transcript_confidence, estimated_wer, completed_at)
VALUES
  -- Session 1
  ('c3000001-0001-4000-8000-000000000001', 'b1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0003-4000-8000-000000000003',
   'descent-conflict', 82, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":78,"WLM":82,"SAW":84,"KNO":86,"PSD":80,"FPM":85}',
   '[{"compositeLoad":28,"confidence":0.94}]', 0.92, 0.04, '2026-03-08 08:15:00+00'),

  ('c3000001-0002-4000-8000-000000000002', 'b1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0003-4000-8000-000000000003',
   'weather-diversion', 86, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":82,"WLM":85,"SAW":88,"KNO":88,"PSD":86,"FPM":84}',
   '[{"compositeLoad":25,"confidence":0.95}]', 0.94, 0.03, '2026-03-08 08:35:00+00'),

  ('c3000001-0003-4000-8000-000000000003', 'b1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0003-4000-8000-000000000003',
   'runway-change', 80, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":76,"WLM":80,"SAW":82,"KNO":84,"PSD":78,"FPM":82}',
   '[{"compositeLoad":30,"confidence":0.93}]', 0.91, 0.04, '2026-03-08 08:55:00+00'),

  ('c3000001-0004-4000-8000-000000000004', 'b1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0003-4000-8000-000000000003',
   'predict-wrong-freq', 90, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":85,"WLM":86,"SAW":92,"KNO":90,"PSD":88,"FPM":86}',
   '[{"compositeLoad":22,"confidence":0.96}]', 0.95, 0.03, '2026-03-08 09:10:00+00'),

  ('c3000001-0005-4000-8000-000000000005', 'b1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0003-4000-8000-000000000003',
   'comms-handoff', 88, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":84,"WLM":88,"SAW":86,"KNO":88,"PSD":86,"FPM":88}',
   '[{"compositeLoad":24,"confidence":0.95}]', 0.93, 0.04, '2026-03-08 09:25:00+00'),

  -- Session 2 (consistent high performance)
  ('c3000001-0006-4000-8000-000000000006', 'b1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0003-4000-8000-000000000003',
   'descent-conflict', 88, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":86,"WLM":86,"SAW":90,"KNO":88,"PSD":86,"FPM":90}',
   '[{"compositeLoad":22,"confidence":0.96}]', 0.95, 0.03, '2026-03-15 08:15:00+00'),

  ('c3000001-0007-4000-8000-000000000007', 'b1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0003-4000-8000-000000000003',
   'holding-pattern', 85, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":82,"WLM":84,"SAW":86,"KNO":90,"PSD":84,"FPM":86}',
   '[{"compositeLoad":26,"confidence":0.94}]', 0.94, 0.03, '2026-03-15 08:35:00+00'),

  ('c3000001-0008-4000-8000-000000000008', 'b1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0003-4000-8000-000000000003',
   'weather-diversion', 92, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":90,"WLM":88,"SAW":94,"KNO":92,"PSD":90,"FPM":90}',
   '[{"compositeLoad":20,"confidence":0.97}]', 0.96, 0.02, '2026-03-15 08:55:00+00'),

  ('c3000001-0009-4000-8000-000000000009', 'b1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0003-4000-8000-000000000003',
   'runway-change', 87, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":84,"WLM":86,"SAW":88,"KNO":88,"PSD":86,"FPM":90}',
   '[{"compositeLoad":24,"confidence":0.95}]', 0.95, 0.03, '2026-03-15 09:15:00+00'),

  ('c3000001-0010-4000-8000-000000000010', 'b1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0003-4000-8000-000000000003',
   'predict-wrong-freq', 94, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":92,"WLM":90,"SAW":96,"KNO":94,"PSD":92,"FPM":92}',
   '[{"compositeLoad":18,"confidence":0.98}]', 0.97, 0.02, '2026-03-15 09:35:00+00');

------------------------------------------------------------
-- DRILL RESULTS — Maria Gonzalez (low_time, latin_american)
-- Lower scores, higher cognitive load, steeper learning curve
------------------------------------------------------------
INSERT INTO drill_results (id, session_id, pilot_id, drill_id, overall_score, metrics_json, cbta_scores_json, cognitive_load_json, transcript_confidence, estimated_wer, completed_at)
VALUES
  ('c4000001-0001-4000-8000-000000000001', 'b1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0004-4000-8000-000000000004',
   'descent-conflict', 52, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":45,"WLM":50,"SAW":55,"KNO":52,"PSD":58,"FPM":48}',
   '[{"compositeLoad":68,"confidence":0.72}]', 0.74, 0.12, '2026-03-12 15:15:00+00'),

  ('c4000001-0002-4000-8000-000000000002', 'b1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0004-4000-8000-000000000004',
   'comms-handoff', 58, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":50,"WLM":55,"SAW":58,"KNO":56,"PSD":62,"FPM":52}',
   '[{"compositeLoad":62,"confidence":0.75}]', 0.76, 0.11, '2026-03-12 15:35:00+00'),

  ('c4000001-0003-4000-8000-000000000003', 'b1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0004-4000-8000-000000000004',
   'weather-diversion', 55, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":48,"WLM":52,"SAW":58,"KNO":54,"PSD":60,"FPM":50}',
   '[{"compositeLoad":65,"confidence":0.73}]', 0.75, 0.12, '2026-03-12 15:55:00+00'),

  ('c4000001-0004-4000-8000-000000000004', 'b1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0004-4000-8000-000000000004',
   'predict-wrong-freq', 48, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":42,"WLM":48,"SAW":50,"KNO":50,"PSD":55,"FPM":45}',
   '[{"compositeLoad":70,"confidence":0.70}]', 0.72, 0.13, '2026-03-12 16:05:00+00'),

  ('c4000001-0005-4000-8000-000000000005', 'b1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0004-4000-8000-000000000004',
   'holding-pattern', 50, '{"readbackScores":[],"decisionScores":[],"trapScores":[],"touchScores":[]}',
   '{"COM":44,"WLM":50,"SAW":52,"KNO":56,"PSD":54,"FPM":46}',
   '[{"compositeLoad":66,"confidence":0.71}]', 0.73, 0.12, '2026-03-12 16:18:00+00');

------------------------------------------------------------
-- COGNITIVE LOAD BASELINES
------------------------------------------------------------
INSERT INTO cognitive_load_baselines (pilot_id, sample_count, f0_mean, f0_std, f0_range_mean, intensity_mean, intensity_std, speech_rate_mean, speech_rate_std, disfluency_rate_mean, disfluency_rate_std, is_calibrated, updated_at)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 15, 185.0, 22.0, 45.0, 68.0, 4.5, 3.8, 0.4, 0.02, 0.01, true,  '2026-03-10 14:20:00+00'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 12, 142.0, 18.0, 38.0, 65.0, 5.0, 3.2, 0.5, 0.04, 0.02, true,  '2026-03-12 09:20:00+00'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 20, 118.0, 15.0, 32.0, 70.0, 3.8, 4.0, 0.3, 0.01, 0.005, true, '2026-03-08 08:20:00+00'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 10, 210.0, 28.0, 55.0, 62.0, 6.0, 2.8, 0.6, 0.06, 0.03, true,  '2026-03-12 15:20:00+00');
