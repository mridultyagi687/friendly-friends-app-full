# Quick Database Migration Commands

## Correct Commands for Your Mac

Since your directory has spaces, use these exact commands:

### Step 1: Navigate to Backend Directory

```bash
cd "/Users/mridul/Documents/Friendly Friends App/backend"
```

**OR** (if you're already in Documents):

```bash
cd "Friendly Friends App/backend"
```

### Step 2: Export Database

```bash
python3 migrate_database.py export
```

**If your database is in a different location**, specify the path:

```bash
python3 migrate_database.py export --database-path "/path/to/your/database.db"
```

### Step 3: Import to Neon (After Deployment)

```bash
python3 migrate_database.py import --database-url "your-neon-connection-string-here"
```

## Finding Your Database File

If the script found 0 rows, your database might be in a different location. Try:

```bash
# Search for database files
find ~/Documents -name "*.db" -type f
find ~/Library/CloudStorage/GoogleDrive* -name "*.db" -type f
```

## Common Database Locations

1. `backend/instance/friendly_friends.db` (default)
2. Google Drive folder (if configured)
3. Custom location set in `.env` file

## If Database is Empty

If you see "0 rows" exported, it means:
- Your database exists but has no data yet
- OR the database is in a different location

**To find the correct database:**
1. Check where your app actually saves data
2. Look for the database file that has data
3. Use that path with `--database-path` option

