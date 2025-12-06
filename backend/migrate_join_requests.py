#!/usr/bin/env python3
"""
Migration script to ensure join_requests table has email field
"""
import os
import sys
from app import app, db
from sqlalchemy import text

def migrate_join_requests():
    with app.app_context():
        try:
            # Check if email column exists in join_requests table
            result = db.session.execute(text("PRAGMA table_info(join_requests)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'email' not in columns:
                print("Adding email column to join_requests table...")
                db.session.execute(text("ALTER TABLE join_requests ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT ''"))
                db.session.commit()
                print("Email column added successfully!")
            else:
                print("Email column already exists in join_requests table.")
                
        except Exception as e:
            print(f"Error during migration: {e}")
            db.session.rollback()
            # If SQLite doesn't support ALTER TABLE, recreate the table
            print("Attempting to recreate tables...")
            try:
                db.create_all()
                print("Tables recreated successfully!")
            except Exception as create_error:
                print(f"Error recreating tables: {create_error}")

if __name__ == "__main__":
    migrate_join_requests()