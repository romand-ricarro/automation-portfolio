import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.utils.database import get_connection

def migrate():
    # Load .env from backend folder
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    load_dotenv(dotenv_path=env_path)
    
    print("⌛ Connecting to Turso and applying schema fixes...")
    conn = get_connection()
    
    try:
        # Add 'name' column if it doesn't exist
        print("🔍 Checking 'name' column...")
        conn.execute("ALTER TABLE user_roles ADD COLUMN name TEXT")
        print("✅ Added 'name' column.")
    except Exception as e:
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            print("ℹ️ Column 'name' already exists.")
        else:
            print(f"❌ Error adding 'name': {e}")

    try:
        # Add 'avatar_url' column if it doesn't exist
        print("🔍 Checking 'avatar_url' column...")
        conn.execute("ALTER TABLE user_roles ADD COLUMN avatar_url TEXT")
        print("✅ Added 'avatar_url' column.")
    except Exception as e:
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            print("ℹ️ Column 'avatar_url' already exists.")
        else:
            print(f"❌ Error adding 'avatar_url': {e}")

    conn.commit()
    print("✨ Migration complete! User Management should now work.")

if __name__ == "__main__":
    migrate()
