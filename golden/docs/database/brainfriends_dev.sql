CREATE TABLE IF NOT EXISTS patients (
  patient_id UUID PRIMARY KEY,
  patient_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  birth_date DATE,
  sex VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinical_sessions (
  session_id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(patient_id),
  training_type VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  algorithm_version VARCHAR(50) NOT NULL,
  catalog_version VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'completed'
);

CREATE TABLE IF NOT EXISTS sing_results (
  result_id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES clinical_sessions(session_id),
  song_key VARCHAR(100) NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  jitter NUMERIC(6,3),
  facial_symmetry NUMERIC(6,3),
  latency_ms NUMERIC(8,2),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
