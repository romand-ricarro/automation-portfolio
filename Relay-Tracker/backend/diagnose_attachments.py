import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Load .env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'api', '.env')
load_dotenv(dotenv_path=env_path)

from api.utils.database import get_connection

def main():
    try:
        conn = get_connection()
        print("✅ Database connection established.")
        
        # Check if table exists
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='issue_attachments'")
        if not cursor.fetchone():
            print("❌ Error: table 'issue_attachments' NOT FOUND.")
            return

        print("✅ Table 'issue_attachments' found.")
        
        # Check table info
        print("\nTable schema for 'issue_attachments':")
        info = conn.execute("PRAGMA table_info(issue_attachments)").fetchall()
        for col in info:
            print(f"  {col[1]} ({col[2]}) {'NOT NULL' if col[3] else ''}")
            
        # Check foreign keys
        print("\nForeign keys for 'issue_attachments':")
        fks = conn.execute("PRAGMA foreign_key_list(issue_attachments)").fetchall()
        for fk in fks:
            print(f"  {fk[3]} -> {fk[2]}({fk[4]})")
            
        # Check if 'issues' table exists
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='issues'")
        if not cursor.fetchone():
            print("\n⚠️ WARNING: table 'issues' NOT FOUND. Foreign keys to this table will fail.")
        else:
            print("\n✅ Table 'issues' found.")

        # Try a test insertion (don't commit if you want to be safe, but here we want to see the error)
        print("\nAttempting test insertion...")
        try:
            conn.execute(
                "INSERT INTO issue_attachments (id, issue_key, uploader_id, filename, url, size, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ("test-id", "FS-13353", "dev-admin-123", "test.png", "https://example.com/test.png", 1000, "image/png")
            )
            print("✅ Insertion succeeded (local).")
            # We don't commit to keep the DB clean
        except Exception as e:
            print(f"❌ Insertion failed: {e}")

    except Exception as e:
        print(f"❌ Diagnostic failed: {e}")

if __name__ == "__main__":
    main()
