"""
Migration script to add streak fields to existing users table.
Run this script once to add the new columns to the database.
"""
from sqlalchemy import create_engine, Column, Integer, DateTime, text
from sqlalchemy.orm import sessionmaker
from database import DATABASE_URL

def migrate_add_streak():
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with engine.connect() as conn:
        try:
            # Check if columns already exist
            result = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'login_streak' not in columns:
                print("Adding login_streak column...")
                conn.execute(text("ALTER TABLE users ADD COLUMN login_streak INTEGER DEFAULT 0"))
                conn.commit()
                print("✓ Added login_streak column")
            else:
                print("login_streak column already exists")
            
            if 'last_login_date' not in columns:
                print("Adding last_login_date column...")
                conn.execute(text("ALTER TABLE users ADD COLUMN last_login_date DATETIME"))
                conn.commit()
                print("✓ Added last_login_date column")
            else:
                print("last_login_date column already exists")
            
            if 'longest_streak' not in columns:
                print("Adding longest_streak column...")
                conn.execute(text("ALTER TABLE users ADD COLUMN longest_streak INTEGER DEFAULT 0"))
                conn.commit()
                print("✓ Added longest_streak column")
            else:
                print("longest_streak column already exists")
            
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            raise

if __name__ == "__main__":
    migrate_add_streak()

