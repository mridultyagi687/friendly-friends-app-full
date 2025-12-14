#!/usr/bin/env python3
"""
Simple test script for Quraky robot - guaranteed to work

To run this script:
    python3 test_quraky.py
    
Or make it executable and run directly:
    chmod +x test_quraky.py
    ./test_quraky.py
"""

import requests
import sys

API_URL = "https://friendly-friends-app-full.onrender.com/api/robots/quraky/command"

def main():
    print("🤖 Quraky Robot AI Client")
    print("Type 'quit' or 'exit' to stop\n")
    
    while True:
        try:
            cmd = input("What should Quarky do? ").strip()
            
            if not cmd or cmd.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            # Ensure command is not empty
            if not cmd:
                print("⚠️  Please enter a command")
                continue
            
            # Send request
            print(f"📤 Sending: '{cmd}'")
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
                # Show action details
                if "action" in result:
                    print(f"   Action: {result.get('action')}")
                    print(f"   Parameters: {result.get('parameters')}")
                    print(f"   Robot says: {result.get('speak')}")
            print()  # Empty line
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f">> Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()

