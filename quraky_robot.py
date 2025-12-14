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
    # Validate command
    if command is None:
        print("❌ Error: Command is None")
        return None
    
    # Convert to string and strip
    command = str(command).strip()
    
    # Check if empty after stripping
    if not command:
        print("❌ Error: Command cannot be empty or whitespace only")
        return None
    
    # Prepare the request - ensure command is a non-empty string
    payload = {"command": command}
    headers = {"Content-Type": "application/json"}
    
    # Debug: show what we're sending
    print(f"📤 Sending: '{command}' (length: {len(command)})")
    
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
            user_input = input("What should Quarky do? ")
            
            # Strip whitespace
            command = user_input.strip() if user_input else ""
            
            # Check for quit
            if command.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            # Skip empty commands with warning
            if not command:
                print("⚠️  Please enter a command (or 'quit' to exit)")
                continue
            
            # Send command
            result = send_command(command)
            
            # Display result
            if result:
                if "error" in result:
                    error_msg = result['error']
                    print(f">> Error: {error_msg}")
                    # If command is required error, show debug info
                    if "Command is required" in error_msg:
                        print(f"   Debug: Command sent was '{command}' (type: {type(command).__name__}, length: {len(command) if command else 0})")
                        print(f"   Debug: Command repr: {repr(command)}")
                else:
                    print(f">> AI Response: {result}")
            else:
                print(">> Failed to get response")
                
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

