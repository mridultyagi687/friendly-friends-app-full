#!/usr/bin/env python3
"""Simple test script for Quraky robot - guaranteed to work"""

import requests

API_URL = "https://friendly-friends-app-full.onrender.com/api/robots/quraky/command"

while True:
    cmd = input("What should Quarky do? ").strip()
    
    if not cmd or cmd.lower() in ['quit', 'exit']:
        break
    
    # Ensure command is not empty
    if not cmd:
        print("Please enter a command")
        continue
    
    # Send request
    try:
        response = requests.post(
            API_URL,
            json={"command": cmd},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        result = response.json()
        
        if "error" in result:
            print(f">> Error: {result['error']}")
        else:
            print(f">> AI Response: {result}")
    except Exception as e:
        print(f">> Error: {e}")

