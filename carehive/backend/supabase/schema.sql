-- CAREHIVE Supabase schema
-- Run this in Supabase Dashboard → SQL Editor
-- For real users: enable Supabase Auth and set users.id = auth.uid() when creating profile.

-- Users (id = Supabase auth.uid() for real users, or created by seed for demo)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INT NOT NULL,
  condition TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Health logs (medication, steps, mood, sleep, activity). source = 'manual' | 'vision'
CREATE TABLE IF NOT EXISTS health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medication_taken BOOLEAN NOT NULL DEFAULT true,
  steps INT NOT NULL DEFAULT 0,
  mood INT NOT NULL,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  timestamp TIMESTAMPTZ NOT NULL,
  sleep_hours NUMERIC(4,1),
  activity_minutes INT
);

CREATE INDEX IF NOT EXISTS idx_health_logs_user_id ON health_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_timestamp ON health_logs(timestamp);

-- Medications (user's list of medicines)
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);

-- Medication reminders (time of day, repeat daily)
CREATE TABLE IF NOT EXISTS medication_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  time_of_day TIME NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_reminders_medication_id ON medication_reminders(medication_id);

-- Medication intakes (per-medication completion tracking)
CREATE TABLE IF NOT EXISTS medication_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  taken BOOLEAN NOT NULL DEFAULT true,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_intakes_user_id ON medication_intakes(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_intakes_medication_id ON medication_intakes(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_intakes_taken_at ON medication_intakes(taken_at);

-- Activity sessions (e.g. walking) with start/end and distance
CREATE TABLE IF NOT EXISTS activity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'walk',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  distance_km NUMERIC(6,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_sessions_user_id ON activity_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_start_time ON activity_sessions(start_time);

-- EHR uploads (simulated HealthHub integration baseline)
CREATE TABLE IF NOT EXISTS ehr_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  extracted_text TEXT,
  summary TEXT,
  parsed JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ehr_uploads_user_id ON ehr_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_ehr_uploads_created_at ON ehr_uploads(created_at);

-- Migration: if health_logs already exists without sleep/activity, run:
-- ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS sleep_hours NUMERIC(4,1);
-- ALTER TABLE health_logs ADD COLUMN IF NOT EXISTS activity_minutes INT;
-- Migration: if you already have the DB, also create the new tables:
-- medications, medication_reminders, medication_intakes, activity_sessions, ehr_uploads

-- Interventions (agent messages)
CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interventions_user_id ON interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_created_at ON interventions(created_at);
