#!/usr/bin/env python3
"""
Database Migration Script: SQLite → Neon PostgreSQL

This script migrates your local SQLite database to Neon PostgreSQL.

Usage:
1. Export from SQLite: python migrate_database.py export
2. Import to Neon: python migrate_database.py import --database-url "postgresql://..."
"""

import os
import sys
import sqlite3
import json
import argparse
from datetime import datetime
from pathlib import Path

# Try importing PostgreSQL libraries
try:
    import psycopg2
    from psycopg2.extras import execute_values
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False
    print("Warning: psycopg2 not installed. Install with: pip install psycopg2-binary")

# Find the SQLite database file
def find_database():
    """Find the local SQLite database file."""
    possible_paths = [
        "instance/friendly_friends.db",
        "../instance/friendly_friends.db",
        os.path.join(os.path.dirname(__file__), "instance", "friendly_friends.db"),
        # Check Google Drive location
        os.path.expanduser("~/Library/CloudStorage/GoogleDrive-mridul6275@gurukultheschool.com/My Drive/Friendly Friends App/friendly_friends.db"),
    ]
    
    # Check environment variable
    if os.environ.get("DATABASE_PATH"):
        possible_paths.insert(0, os.environ.get("DATABASE_PATH"))
    
    for path in possible_paths:
        if os.path.exists(path):
            return os.path.abspath(path)
    
    return None

def export_sqlite_to_json(db_path, output_file="database_export.json"):
    """Export SQLite database to JSON format."""
    
    if not os.path.exists(db_path):
        print(f"❌ Error: Database file not found: {db_path}")
        return False
    
    print(f"📂 Found database: {db_path}")
    print("🔄 Exporting data to JSON...")
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    tables = {}
    
    # Get all table names (excluding SQLite system tables)
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    table_names = [row[0] for row in cursor.fetchall()]
    
    if not table_names:
        print("⚠️  Warning: No tables found in database!")
        conn.close()
        return False
    
    print(f"📊 Found {len(table_names)} tables: {', '.join(table_names)}")
    
    # Export each table
    total_rows = 0
    for table_name in table_names:
        cursor = conn.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        # Convert rows to list of dictionaries
        table_data = []
        for row in rows:
            row_dict = {}
            for key in row.keys():
                value = row[key]
                # Handle None values
                if value is None:
                    row_dict[key] = None
                # Convert datetime objects to ISO format strings
                elif isinstance(value, (datetime, str)):
                    row_dict[key] = str(value)
                else:
                    row_dict[key] = value
            table_data.append(row_dict)
        
        tables[table_name] = table_data
        total_rows += len(table_data)
        print(f"  ✅ {table_name}: {len(table_data)} rows")
    
    conn.close()
    
    # Save to JSON file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(tables, f, indent=2, default=str, ensure_ascii=False)
    
    print(f"\n✅ Export complete!")
    print(f"📄 Exported {total_rows} total rows from {len(table_names)} tables")
    print(f"💾 Saved to: {os.path.abspath(output_file)}")
    
    return True

def import_json_to_neon(json_file, database_url):
    """Import JSON data to Neon PostgreSQL database."""
    
    if not HAS_POSTGRES:
        print("❌ Error: psycopg2-binary not installed!")
        print("   Install with: pip install psycopg2-binary")
        return False
    
    if not os.path.exists(json_file):
        print(f"❌ Error: JSON file not found: {json_file}")
        return False
    
    print(f"📂 Loading data from: {json_file}")
    print("🔄 Connecting to Neon PostgreSQL...")
    
    try:
        # Connect to Neon PostgreSQL
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        print("✅ Connected to Neon database!")
        
        # Load JSON data
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"📊 Found {len(data)} tables in JSON file")
        
        # Import each table
        total_imported = 0
        for table_name, rows in data.items():
            if not rows:
                print(f"  ⏭️  {table_name}: Skipping (empty)")
                continue
            
            print(f"  📥 Importing {table_name}: {len(rows)} rows...")
            
            # Get column names from first row
            if not rows:
                continue
            
            columns = list(rows[0].keys())
            columns_str = ', '.join(f'"{col}"' for col in columns)  # Quote column names
            placeholders = ', '.join(['%s'] * len(columns))
            
            # Prepare data
            values = []
            for row in rows:
                value_tuple = tuple(row.get(col) for col in columns)
                values.append(value_tuple)
            
            # Insert data (use ON CONFLICT DO NOTHING to avoid duplicates)
            try:
                for value_tuple in values:
                    # Build INSERT query with conflict handling
                    insert_query = f"""
                        INSERT INTO "{table_name}" ({columns_str})
                        VALUES ({placeholders})
                        ON CONFLICT DO NOTHING
                    """
                    cursor.execute(insert_query, value_tuple)
                
                conn.commit()
                total_imported += len(values)
                print(f"  ✅ {table_name}: Imported {len(values)} rows")
                
            except Exception as e:
                conn.rollback()
                print(f"  ❌ {table_name}: Error - {e}")
                print(f"     This might be normal if table structure is different")
        
        cursor.close()
        conn.close()
        
        print(f"\n✅ Import complete!")
        print(f"📊 Imported {total_imported} total rows to Neon database")
        
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Error connecting to database: {e}")
        print("   Check your DATABASE_URL connection string")
        return False
    except Exception as e:
        print(f"❌ Error during import: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    parser = argparse.ArgumentParser(description='Migrate database from SQLite to Neon PostgreSQL')
    parser.add_argument('action', choices=['export', 'import'], help='Action to perform')
    parser.add_argument('--database-path', help='Path to SQLite database file')
    parser.add_argument('--database-url', help='Neon PostgreSQL connection string')
    parser.add_argument('--json-file', default='database_export.json', help='JSON export file')
    
    args = parser.parse_args()
    
    if args.action == 'export':
        db_path = args.database_path or find_database()
        if not db_path:
            print("❌ Error: Could not find SQLite database file!")
            print("   Please specify path with: --database-path /path/to/database.db")
            print("\n   Common locations:")
            print("   - backend/instance/friendly_friends.db")
            print("   - Check your Google Drive folder")
            sys.exit(1)
        
        success = export_sqlite_to_json(db_path, args.json_file)
        sys.exit(0 if success else 1)
    
    elif args.action == 'import':
        if not args.database_url:
            # Try environment variable
            database_url = os.environ.get('DATABASE_URL')
            if not database_url:
                print("❌ Error: DATABASE_URL not provided!")
                print("   Use: --database-url 'postgresql://...'")
                print("   Or set DATABASE_URL environment variable")
                sys.exit(1)
        else:
            database_url = args.database_url
        
        success = import_json_to_neon(args.json_file, database_url)
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

