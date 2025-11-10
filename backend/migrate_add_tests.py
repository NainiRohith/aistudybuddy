#!/usr/bin/env python3
"""
Migration script to add the tests table to the database.
Run this script to add the tests table without losing existing data.
"""

import sqlite3
import os
from pathlib import Path

# Get the database path
db_path = Path(__file__).parent / "study_planner.db"

if not db_path.exists():
    print(f"Database file not found at {db_path}")
    print("The database will be created automatically when you start the server.")
    exit(0)

print(f"Connecting to database at {db_path}...")
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

try:
    # Check if tests table already exists
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='tests'
    """)
    
    if cursor.fetchone():
        print("✅ Tests table already exists. No migration needed.")
    else:
        print("Creating tests table...")
        
        # Create the tests table
        cursor.execute("""
            CREATE TABLE tests (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                name VARCHAR NOT NULL,
                test_date DATETIME NOT NULL,
                test_type VARCHAR,
                score FLOAT,
                max_score FLOAT DEFAULT 100,
                weight FLOAT DEFAULT 0.0,
                topics JSON,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users (id),
                FOREIGN KEY(course_id) REFERENCES courses (id)
            )
        """)
        
        # Create index for faster queries
        cursor.execute("""
            CREATE INDEX ix_tests_user_id ON tests(user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX ix_tests_course_id ON tests(course_id)
        """)
        
        cursor.execute("""
            CREATE INDEX ix_tests_test_date ON tests(test_date)
        """)
        
        conn.commit()
        print("✅ Tests table created successfully!")
        print("✅ Indexes created successfully!")
        
except sqlite3.Error as e:
    print(f"❌ Error during migration: {e}")
    conn.rollback()
    raise
finally:
    conn.close()
    print("Migration completed.")

