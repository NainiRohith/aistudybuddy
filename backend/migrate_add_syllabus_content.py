#!/usr/bin/env python3
"""
Migration script to add syllabus_content column to courses table.
This script safely adds the new column without losing existing data.
"""
import sqlite3
import os
from pathlib import Path

# Get database path
db_path = Path(__file__).parent / "study_planner.db"

if not db_path.exists():
    print(f"Database not found at {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Check if column already exists
    cursor.execute("PRAGMA table_info(courses)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'syllabus_content' in columns:
        print("Column 'syllabus_content' already exists. No migration needed.")
    else:
        # Add the column
        cursor.execute("ALTER TABLE courses ADD COLUMN syllabus_content TEXT")
        conn.commit()
        print("Successfully added 'syllabus_content' column to courses table.")
    
    conn.close()
    print("Migration completed successfully!")
    
except Exception as e:
    print(f"Error during migration: {e}")
    exit(1)

