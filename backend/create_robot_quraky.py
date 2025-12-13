#!/usr/bin/env python3
"""
Script to create the 'quraky' robot in the database.
Run this script to create the robot if it doesn't exist.
"""

import os
import sys
from app import app, db, Robot, User

def create_quraky_robot():
    with app.app_context():
        try:
            # Get admin user (usually the first admin)
            admin = db.session.query(User).filter_by(is_admin=True).first()
            if not admin:
                print("ERROR: No admin user found. Please create an admin user first.")
                sys.exit(1)
            
            # Check if robot already exists
            existing = db.session.query(Robot).filter_by(name='quraky').first()
            if existing:
                print(f"Robot 'quraky' already exists (ID: {existing.id})")
                print(f"API URL: https://friendly-friends-app-full.onrender.com/api/robots/quraky/command")
                return existing
            
            # Create robot
            robot = Robot(
                name='quraky',
                description='Quraky robot for AI commands',
                created_by=admin.id,
                is_active=True
            )
            db.session.add(robot)
            db.session.commit()
            
            print("✅ Robot 'quraky' created successfully!")
            print(f"   ID: {robot.id}")
            print(f"   Created by: {admin.username} (ID: {admin.id})")
            print(f"   Status: {'Active' if robot.is_active else 'Inactive'}")
            print(f"\n📡 API URL: https://friendly-friends-app-full.onrender.com/api/robots/quraky/command")
            print(f"\n🧪 Test with:")
            print(f'   curl -X POST https://friendly-friends-app-full.onrender.com/api/robots/quraky/command \\')
            print(f'     -H "Content-Type: application/json" \\')
            print(f'     -d \'{{"command": "move forward 10 cm"}}\'')
            
            return robot
            
        except Exception as e:
            print(f"ERROR: Failed to create robot: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    create_quraky_robot()

