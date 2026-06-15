import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

database_url = os.getenv('DATABASE_URL')
if database_url and database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

def check_analyzed_at():
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    engine = create_engine(database_url)
    
    with engine.connect() as conn:
        query = text("SELECT id, session_id, status, analyzed_at FROM sessions ORDER BY session_date DESC LIMIT 10;")
        result = conn.execute(query).fetchall()
        
        print(f"{'ID':<40} | {'Session ID':<15} | {'Status':<15} | {'Analyzed At'}")
        print("-" * 110)
        for row in result:
            print(f"{str(row[0]):<40} | {row[1]:<15} | {row[2]:<15} | {row[3]}")

if __name__ == "__main__":
    check_analyzed_at()
