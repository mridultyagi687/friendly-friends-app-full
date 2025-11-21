#!/usr/bin/env python3
"""Create a test user account for demo purposes."""

import os
import sys

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db, User
from werkzeug.security import generate_password_hash

def create_test_user(username="demo", password="demo123", email="demo@test.com"):
    """Create a test user account."""
    with app.app_context():
        # Check if user already exists
        existing_user = db.session.query(User).filter_by(username=username).first()
        if existing_user:
            print(f"❌ User '{username}' already exists!")
            print(f"   User ID: {existing_user.id}")
            print(f"   Email: {existing_user.email}")
            response = input("\nDo you want to reset the password? (y/n): ")
            if response.lower() == 'y':
                existing_user.password_hash = generate_password_hash(password)
                db.session.commit()
                print(f"✅ Password reset for user '{username}'")
                print(f"   Username: {username}")
                print(f"   Password: {password}")
                return existing_user
            else:
                print("Cancelled.")
                return None
        
        # Create new user
        try:
            new_user = User(
                username=username,
                email=email,
                password_hash=generate_password_hash(password),
                is_admin=False
            )
            db.session.add(new_user)
            db.session.commit()
            
            print("="*60)
            print("✅ TEST USER CREATED SUCCESSFULLY!")
            print("="*60)
            print(f"Username: {username}")
            print(f"Password: {password}")
            print(f"Email: {email}")
            print(f"User ID: {new_user.id}")
            print("="*60)
            print("\nYou can now use these credentials for your demo!")
            
            return new_user
        except Exception as e:
            print(f"❌ Error creating user: {e}")
            db.session.rollback()
            return None

if __name__ == "__main__":
    print("="*60)
    print("CREATE TEST USER FOR DEMO")
    print("="*60)
    
    # Get user input
    username = input("\nEnter username (default: 'demo'): ").strip() or "demo"
    password = input("Enter password (default: 'demo123'): ").strip() or "demo123"
    email = input(f"Enter email (default: '{username}@test.com'): ").strip() or f"{username}@test.com"
    
    create_test_user(username, password, email)

