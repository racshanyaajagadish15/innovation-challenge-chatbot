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
  role TEXT NOT NULL DEFAULT 'patient',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Health logs (medication, steps, mood). source = 'manual' | 'vision'
CREATE TABLE IF NOT EXISTS health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medication_taken BOOLEAN NOT NULL DEFAULT true,
  steps INT NOT NULL DEFAULT 0,
  mood INT NOT NULL,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  timestamp TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_health_logs_user_id ON health_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_timestamp ON health_logs(timestamp);

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

-- Medications (active prescriptions / supplements)
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'once_daily',
  timing TEXT[] NOT NULL DEFAULT '{"08:00"}',
  instructions TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);

-- Medication logs (taken/missed/skipped tracking per dose)
CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'taken',
  scheduled_time TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_logs_user_id ON medication_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id ON medication_logs(medication_id);

-- EHR uploads (uploaded documents with parsed data)
CREATE TABLE IF NOT EXISTS ehr_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  parsed_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ehr_uploads_user_id ON ehr_uploads(user_id);

-- User relationships (clinician/family → patient links)
CREATE TABLE IF NOT EXISTS user_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_relationships_from ON user_relationships(from_user_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_to ON user_relationships(to_user_id);

