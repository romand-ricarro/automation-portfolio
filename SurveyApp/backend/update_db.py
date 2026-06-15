import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

database_url = os.getenv('DATABASE_URL')
if database_url and database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

def update_db():
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        print("Checking for analyzed_at column...")
        # Check if column exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='sessions' AND column_name='analyzed_at';
        """)
        result = conn.execute(check_query).fetchone()
        
        if not result:
            print("Adding analyzed_at column to sessions table...")
            try:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN analyzed_at TIMESTAMP;"))
                conn.commit()
                print("Successfully added analyzed_at column.")
            except Exception as e:
                print(f"Error adding column: {e}")
        else:
            print("Column analyzed_at already exists.")

if __name__ == "__main__":
    update_db()
