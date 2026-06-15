-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  profile_picture_url TEXT,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'facilitator', 'viewer')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(100) UNIQUE NOT NULL,
  session_name VARCHAR(255),
  session_date DATE NOT NULL,
  facilitator_name VARCHAR(255),
  num_responses INTEGER,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Question Analyses (Step 1 results)
CREATE TABLE question_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  question_label VARCHAR(100) NOT NULL,
  question_text TEXT NOT NULL,
  analysis_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Common Issues (Step 2 results)
CREATE TABLE common_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  common_issue TEXT NOT NULL,
  evidence_signal TEXT NOT NULL,
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Action Items (created by facilitators)
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  issue TEXT NOT NULL,
  action TEXT NOT NULL,
  priority VARCHAR(20) CHECK (priority IN ('High', 'Medium', 'Low')),
  person_in_charge VARCHAR(255),
  deadline DATE,
  status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Completed', 'On Hold')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Ratings (aggregated per session)
CREATE TABLE session_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  facilitator_understanding DECIMAL(3,2),
  learning_mechanics DECIMAL(3,2),
  qa_support DECIMAL(3,2),
  problem_articulation DECIMAL(3,2),
  session_pace DECIMAL(3,2),
  tools_helpfulness DECIMAL(3,2),
  repeatability DECIMAL(3,2),
  learning_objectives DECIMAL(3,2),
  overall_quality DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_action_items_session ON action_items(session_id);
CREATE INDEX idx_action_items_status ON action_items(status);
