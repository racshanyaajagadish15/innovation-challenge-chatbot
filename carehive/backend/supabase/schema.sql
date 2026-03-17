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

