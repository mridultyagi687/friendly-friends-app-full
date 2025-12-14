#!/usr/bin/env python3
"""
Simple Quraky Robot AI Client
Send commands to your quraky robot and get AI responses.
"""

import requests
import json

# Configuration
API_URL = "https://friendly-friends-app-full.onrender.com/api/robots/quraky/command"

def send_command(command):
    """Send a command to the quraky robot AI."""
    if not command or not command.strip():
        print("❌ Error: Command cannot be empty")
        return None
    
    command = command.strip()
    
    # Prepare the request
    payload = {"command": command}
    headers = {"Content-Type": "application/json"}
    
    try:
        # Send the request
        response = requests.post(API_URL, json=payload, headers=headers, timeout=30)
        
        # Check response
        if response.status_code == 200:
            return response.json()
        else:
            # Try to get error message
            try:
                error_data = response.json()
                return error_data
            except:
                return {"error": f"HTTP {response.status_code}: {response.text[:100]}"}
                
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

# Main loop
if __name__ == "__main__":
    print("🤖 Quraky Robot AI Client")
    print("Type 'quit' to exit\n")
    
    while True:
        try:
            # Get command from user
            command = input("What should Quarky do? ").strip()
            
            # Check for quit
            if command.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            # Skip empty commands
            if not command:
                continue
            
            # Send command
            result = send_command(command)
            
            # Display result
            if result:
                if "error" in result:
                    print(f">> Error: {result['error']}")
                else:
                    print(f">> AI Response: {result}")
            else:
                print(">> Failed to get response")
                
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

