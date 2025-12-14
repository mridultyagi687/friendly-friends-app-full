#!/usr/bin/env python3
"""
Quraky Robot AI Client
Send commands to your quraky robot and get AI responses.
"""

import requests
import json
import sys

# Configuration
BASE_URL = "https://friendly-friends-app-full.onrender.com"
ROBOT_NAME = "quraky"
COMMAND_URL = f"{BASE_URL}/api/robots/{ROBOT_NAME}/command"

def send_command(command, image_path=None):
    """
    Send a command to the quraky robot AI.
    
    Args:
        command (str): The command to send (e.g., "move forward 10 cm")
        image_path (str, optional): Path to image file to include
    
    Returns:
        dict: AI response with action, parameters, and speak text
    """
    # Ensure command is not empty
    if not command or not command.strip():
        print("❌ Error: Command cannot be empty")
        return None
    
    # Strip and ensure we have a valid command
    command = command.strip()
    
    # Build payload - ensure command is a string
    payload = {"command": str(command)}
    
    # Optionally include image as base64
    if image_path:
        try:
            import base64
            with open(image_path, 'rb') as img:
                payload["image"] = base64.b64encode(img.read()).decode('utf-8')
        except Exception as e:
            print(f"Warning: Could not load image: {e}")
    
    try:
        # Debug: verify payload before sending
        if not payload.get("command"):
            print(f"❌ Error: Command is empty in payload: {payload}")
            return None
        
        response = requests.post(
            COMMAND_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Check for errors in response
        if response.status_code != 200:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', f'HTTP {response.status_code}')
                print(f"❌ API Error: {error_msg}")
                return error_data
            except:
                print(f"❌ API Error: HTTP {response.status_code} - {response.text[:200]}")
                return {"error": f"HTTP {response.status_code}"}
        
        response.raise_for_status()
        result = response.json()
        
        # Check if response contains an error
        if "error" in result:
            print(f"❌ Error in response: {result.get('error')}")
        
        return result
    except requests.exceptions.RequestException as e:
        print(f"❌ Error connecting to robot API: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                print(f"   Error details: {error_data}")
                return error_data
            except:
                print(f"   Response: {e.response.text[:200]}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return None

def execute_action(action_data):
    """
    Execute the action returned by AI (for demonstration).
    In a real robot, you would control the hardware here.
    """
    if not action_data:
        return
    
    action = action_data.get("action")
    params = action_data.get("parameters", {})
    speak_text = action_data.get("speak", "")
    
    print(f"\n🤖 Robot says: {speak_text}")
    print(f"📋 Action: {action}")
    print(f"⚙️  Parameters: {params}")
    
    # Simulate action execution
    if action == "move_forward":
        distance = params.get("distance", 0)
        print(f"   → Moving forward {distance} cm")
    elif action == "move_backward":
        distance = params.get("distance", 0)
        print(f"   → Moving backward {distance} cm")
    elif action == "turn_left":
        degrees = params.get("degrees", 0)
        print(f"   → Turning left {degrees} degrees")
    elif action == "turn_right":
        degrees = params.get("degrees", 0)
        print(f"   → Turning right {degrees} degrees")
    elif action == "stop":
        print(f"   → Stopping all movement")
    elif action == "wait":
        seconds = params.get("seconds", 1)
        print(f"   → Waiting {seconds} seconds")
    elif action == "speak":
        text = params.get("text", speak_text)
        print(f"   → Speaking: {text}")

def main():
    """Main function - interactive mode or command line"""
    if len(sys.argv) > 1:
        # Command line mode
        command = " ".join(sys.argv[1:])
        print(f"📤 Sending command: {command}")
        result = send_command(command)
        if result:
            execute_action(result)
        else:
            print("❌ Failed to get response from AI")
            sys.exit(1)
    else:
        # Interactive mode
        print("=" * 60)
        print("🤖 Quraky Robot AI Client")
        print("=" * 60)
        print(f"📡 Connected to: {COMMAND_URL}")
        print("Type 'quit' or 'exit' to stop\n")
        
        while True:
            try:
                command = input("What should Quarky do? ").strip()
                if not command:
                    print("⚠️  Please enter a command")
                    continue
                
                if command.lower() in ['quit', 'exit', 'q']:
                    print("👋 Goodbye!")
                    break
                
                result = send_command(command)
                
                if result:
                    if "error" in result:
                        error_msg = result.get('error', 'Unknown error')
                        print(f">> Error: {error_msg}")
                        # If it's "Command is required", the command might have been lost
                        if "Command is required" in error_msg:
                            print(f"   Debug: Command sent was: '{command}' (length: {len(command)})")
                    else:
                        print(">> AI Response:", result)
                        execute_action(result)
                else:
                    print(">> Failed to get response from AI")
                
                print()  # Empty line for readability
                
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()

