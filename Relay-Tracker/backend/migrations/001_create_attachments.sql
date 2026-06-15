CREATE TABLE IF NOT EXISTS issue_attachments (
    id TEXT PRIMARY KEY,
    issue_key TEXT NOT NULL,
    uploader_id TEXT,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    size INTEGER,
    mime_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_issue_key ON issue_attachments(issue_key);