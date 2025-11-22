# Database Migration Guide: Local SQLite → Neon PostgreSQL

## Quick Answer

**Neon creates a NEW empty database.** Your Flask app will automatically create all tables, but they'll be empty.

If you want to **keep your existing data**, you'll need to migrate it from your local SQLite database to Neon PostgreSQL.

---

## What Happens When You Deploy

### Option 1: Start Fresh (Easier)
✅ Neon creates **new empty database**  
✅ Flask app automatically creates all tables on first run  
✅ You start with empty database (no existing data)  
❌ Your local data stays local  

**Best for**: Testing, starting fresh, or if you don't need old data

### Option 2: Migrate Existing Data (More Work)
✅ Neon creates new database  
✅ Flask app creates tables  
✅ You migrate your local SQLite data to Neon PostgreSQL  
✅ You keep all your existing data  

**Best for**: If you have important data you want to keep

---

## Step-by-Step Migration (If You Want to Keep Your Data)

### Step 1: Find Your Local Database File

Your local SQLite database is likely at one of these locations:

1. **If you have a custom path**: Check your `.env` file for `DATABASE_PATH`
2. **Default location**: `backend/instance/friendly_friends.db`
3. **Google Drive location**: Check your Google Drive for the database file
4. **Check backend/app.py** for the exact path logic

**On Mac, try:**
```bash
find ~/Documents/Friendly\ Friends\ App -name "*.db" -type f
```

Or check:
```bash
ls -la "~/Documents/Friendly Friends App/backend/instance/"
```

### Step 2: Export Data from SQLite (JSON Format)

Create a Python script to export your SQLite data to JSON:

**Create file: `migrate_to_neon.py`** (in backend folder):

```python
import sqlite3
import json
import os
from datetime import datetime

# Path to your SQLite database
SQLITE_DB = "instance/friendly_friends.db"  # Adjust path as needed

def export_sqlite_to_json(db_path):
    """Export SQLite data to JSON format."""
    
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return None
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # Access columns by name
    
    tables = {}
    
    # Get all table names
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
    table_names = [row[0] for row in cursor.fetchall()]
    
    print(f"Found tables: {table_names}")
    
    # Export each table
    for table_name in table_names:
        if table_name == 'sqlite_sequence':  # Skip SQLite metadata
            continue
            
        cursor = conn.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        # Convert rows to list of dictionaries
        table_data = []
        for row in rows:
            row_dict = {}
            for key in row.keys():
                value = row[key]
                # Convert datetime objects to strings
                if isinstance(value, datetime):
                    value = value.isoformat()
                row_dict[key] = value
            table_data.append(row_dict)
        
        tables[table_name] = table_data
        print(f"Exported {len(table_data)} rows from {table_name}")
    
    conn.close()
    
    # Save to JSON file
    json_file = "database_export.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(tables, f, indent=2, default=str)
    
    print(f"\n✅ Data exported to {json_file}")
    return json_file

if __name__ == "__main__":
    # Try common database locations
    possible_paths = [
        "instance/friendly_friends.db",
        "../instance/friendly_friends.db",
        "friendly_friends.db",
    ]
    
    db_path = None
    for path in possible_paths:
        if os.path.exists(path):
            db_path = path
            break
    
    if not db_path:
        print("Database not found. Please specify the path:")
        db_path = input("Enter database path: ")
    
    export_sqlite_to_json(db_path)
```

**Run it:**
```bash
cd backend
python migrate_to_neon.py
```

This creates `database_export.json` with all your data.

### Step 3: Import Data to Neon PostgreSQL

After your backend is deployed to Render and connected to Neon:

**Create file: `import_to_neon.py`** (you can run this locally or on Render):

```python
import json
import psycopg2
from psycopg2.extras import execute_values
import os

# Get Neon connection string from environment
DATABASE_URL = os.environ.get("DATABASE_URL")

# Load exported data
with open("database_export.json", 'r') as f:
    data = json.load(f)

# Connect to Neon PostgreSQL
conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Import each table
for table_name, rows in data.items():
    if not rows:  # Skip empty tables
        continue
    
    print(f"Importing {len(rows)} rows to {table_name}...")
    
    # Get column names from first row
    columns = list(rows[0].keys())
    columns_str = ', '.join(columns)
    
    # Build INSERT query
    placeholders = ', '.join(['%s'] * len(columns))
    insert_query = f"INSERT INTO {table_name} ({columns_str}) VALUES {placeholders}"
    
    # Prepare data
    values = []
    for row in rows:
        values.append(tuple(row.get(col) for col in columns))
    
    # Insert data (ignore duplicates)
    try:
        for value_tuple in values:
            cursor.execute(
                f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING",
                value_tuple
            )
        conn.commit()
        print(f"✅ Imported {len(rows)} rows to {table_name}")
    except Exception as e:
        print(f"⚠️ Error importing {table_name}: {e}")
        conn.rollback()

cursor.close()
conn.close()
print("\n✅ Migration complete!")
```

**Or use Neon's SQL Editor** (Easier method):

1. Go to Neon dashboard → **SQL Editor**
2. Manually export data from SQLite using a tool like:
   - **DB Browser for SQLite** (free GUI tool)
   - Export as CSV/JSON
   - Import via Neon SQL Editor

### Step 4: Alternative - Use a Migration Tool

**Option A: Use `pgloader`** (recommended for large databases):

```bash
# Install pgloader (if not installed)
# Mac: brew install pgloader
# Linux: apt-get install pgloader

# Convert SQLite to PostgreSQL
pgloader sqlite:///path/to/friendly_friends.db postgresql://user:password@host/dbname
```

**Option B: Use Neon's import feature** (if available in dashboard)

**Option C: Manual export/import via SQL**

1. Export SQL from SQLite:
```bash
sqlite3 friendly_friends.db .dump > dump.sql
```

2. Clean up SQLite-specific syntax for PostgreSQL

3. Import to Neon via SQL Editor

---

## Quick Start Without Migration (Recommended for First Deployment)

**If you don't need your local data right now:**

1. ✅ Deploy to Render + Neon (follow MANUAL_STEPS.md)
2. ✅ Neon creates empty database
3. ✅ Flask app automatically creates all tables
4. ✅ Start fresh with empty database
5. ✅ You can always migrate data later if needed

**Advantages:**
- Simpler setup
- Tests deployment first
- Migrate later if needed

---

## Verify Migration

After migration, verify data in Neon:

1. Go to Neon dashboard → **SQL Editor**
2. Run queries like:
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM videos;
SELECT COUNT(*) FROM blogs;
```

---

## Important Notes

### Data Type Differences

SQLite and PostgreSQL have some differences:
- **SQLite**: `INTEGER PRIMARY KEY AUTOINCREMENT`
- **PostgreSQL**: `SERIAL PRIMARY KEY` or `INTEGER GENERATED ALWAYS AS IDENTITY`

Your Flask app handles this automatically with SQLAlchemy.

### File Paths

If you stored file paths (videos, images) in your local database:
- ✅ File paths stored as strings work the same
- ⚠️ Actual files need to be uploaded separately
- Consider using cloud storage (S3, Cloudinary) for files

### Passwords

If you have user passwords:
- ✅ Password hashes migrate correctly (they're just strings)
- ✅ Authentication works the same way

---

## Summary

**Neon creates a NEW empty database.** 

- ✅ **Tables are created automatically** by Flask on first run
- ✅ **Data stays empty** unless you migrate
- ✅ **You can migrate later** if you want to keep old data
- ✅ **Starting fresh is easier** for first deployment

**Recommendation**: Start with empty database, migrate later if needed!

