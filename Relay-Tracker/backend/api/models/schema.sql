-- Relay Database Schema for Turso (SQLite)
-- Run this SQL via Turso CLI or libsql

-- ============================================
-- User Roles Table
-- ============================================
-- Stores user roles separate from Jira permissions
-- user_id is the Google 'sub' claim (unique user identifier)
-- Roles: 'user', 'sqa', 'admin'

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'sqa', 'admin')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- ============================================
-- User Preferences Table
-- ============================================
-- Stores user notification and theme preferences

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  email_notifications INTEGER DEFAULT 1,
  discord_notifications INTEGER DEFAULT 1,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_roles(user_id) ON DELETE CASCADE
);

-- ============================================
-- Activity Log Table
-- ============================================
-- Tracks user actions for auditing

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  jira_issue_key TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_roles(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_issue ON activity_log(jira_issue_key);

-- ============================================
-- Trigger: Update timestamp on user_roles
-- ============================================

CREATE TRIGGER IF NOT EXISTS update_user_roles_timestamp
  AFTER UPDATE ON user_roles
  FOR EACH ROW
BEGIN
  UPDATE user_roles SET updated_at = datetime('now') WHERE user_id = NEW.user_id;
END;

-- ============================================
-- Trigger: Update timestamp on user_preferences
-- ============================================

CREATE TRIGGER IF NOT EXISTS update_user_preferences_timestamp
  AFTER UPDATE ON user_preferences
  FOR EACH ROW
BEGIN
  UPDATE user_preferences SET updated_at = datetime('now') WHERE user_id = NEW.user_id;
END;
