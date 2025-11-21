#!/usr/bin/env python3
"""Migration script to add open_apps column to cloud_pcs table."""

import sqlite3
import os
import sys

# Get database path
BASE_DIR = os.environ.get('BASE_DIR') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Friendly Friends App Database')
DB_PATH = os.path.join(BASE_DIR, 'mydatabase.db')

if not os.path.exists(DB_PATH):
    print(f'Database not found at {DB_PATH}')
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check if column exists
cursor.execute("PRAGMA table_info(cloud_pcs)")
columns = [col[1] for col in cursor.fetchall()]

if 'open_apps' not in columns:
    try:
        cursor.execute('ALTER TABLE cloud_pcs ADD COLUMN open_apps TEXT')
        conn.commit()
        print('Successfully added open_apps column to cloud_pcs table')
    except Exception as e:
        print(f'Error adding column: {e}')
        conn.rollback()
        sys.exit(1)
else:
    print('open_apps column already exists')

conn.close()
print('Migration completed successfully')

