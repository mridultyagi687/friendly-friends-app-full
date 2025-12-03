#!/usr/bin/env python3
import os
import sys
from app import app, db, User, hash_password

def init_database():
    with app.app_context():
        # Drop and recreate all tables
        db.drop_all()
        db.create_all()
        
        # Create admin user
        admin = User(
            username='admin',
            email='admin@example.com',
            password_hash=hash_password('admin123'),
            is_admin=True
        )
        db.session.add(admin)
        db.session.commit()
        
        print("Database initialized successfully!")
        print("Admin user created: username=admin, password=admin123")

if __name__ == "__main__":
    init_database()
