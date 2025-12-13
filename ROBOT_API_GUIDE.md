# Robot API Guide

## Base URL
```
https://friendly-friends-app-full.onrender.com
```

## API Endpoints

### 1. Send Camera Vision (Optional)
**Endpoint:** `POST /api/robots/{robot_name}/vision`

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Form data with `image` field containing the image file

**Example (Python):**
```python
import requests

robot_name = "my-robot"
base_url = "https://friendly-friends-app-full.onrender.com"
url = f"{base_url}/api/robots/{robot_name}/vision"

with open('camera_image.jpg', 'rb') as img:
    files = {'image': img}
    response = requests.post(url, files=files)
    print(response.json())
```

**Example (cURL):**
```bash
curl -X POST \
  https://friendly-friends-app-full.onrender.com/api/robots/my-robot/vision \
  -F "image=@camera_image.jpg"
```

---

### 2. Send Command and Get AI Response (Main Endpoint)
**Endpoint:** `POST /api/robots/{robot_name}/command`

**Request:**
- Method: POST
- Content-Type: application/json
- Body:
```json
{
  "command": "move forward 10 cm",
  "image": "base64_encoded_image_optional"
}
```

**Response:**
```json
{
  "action": "move_forward",
  "parameters": {"distance": 10},
  "speak": "Okay, moving forward!"
}
```

**Available Actions:**
- `move_forward` - Move forward (parameters: `{"distance": number in cm}`)
- `move_backward` - Move backward (parameters: `{"distance": number in cm}`)
- `turn_left` - Turn left (parameters: `{"degrees": number}`)
- `turn_right` - Turn right (parameters: `{"degrees": number}`)
- `stop` - Stop all movement
- `speak` - Just speak (parameters: `{"text": "message"}`)
- `wait` - Wait/pause (parameters: `{"seconds": number}`)

**Example (Python):**
```python
import requests
import json

robot_name = "my-robot"
base_url = "https://friendly-friends-app-full.onrender.com"
url = f"{base_url}/api/robots/{robot_name}/command"

payload = {
    "command": "move forward 10 cm"
}

response = requests.post(
    url,
    json=payload,
    headers={"Content-Type": "application/json"}
)

result = response.json()
print(f"Action: {result['action']}")
print(f"Parameters: {result['parameters']}")
print(f"Speak: {result['speak']}")

# Execute the action
if result['action'] == 'move_forward':
    distance = result['parameters'].get('distance', 0)
    # Your robot code to move forward
    robot.move_forward(distance)
elif result['action'] == 'speak':
    text = result['parameters'].get('text', result['speak'])
    # Your robot code to speak
    robot.speak(text)
```

**Example (cURL):**
```bash
curl -X POST \
  https://friendly-friends-app-full.onrender.com/api/robots/my-robot/command \
  -H "Content-Type: application/json" \
  -d '{"command": "move forward 10 cm"}'
```

**Example with Image (Python):**
```python
import requests
import base64

robot_name = "my-robot"
base_url = "https://friendly-friends-app-full.onrender.com"
url = f"{base_url}/api/robots/{robot_name}/command"

# Encode image to base64
with open('camera_image.jpg', 'rb') as img:
    image_base64 = base64.b64encode(img.read()).decode('utf-8')

payload = {
    "command": "what do you see?",
    "image": image_base64
}

response = requests.post(url, json=payload)
result = response.json()
print(result)
```

---

### 3. Check Robot Status
**Endpoint:** `GET /api/robots/{robot_name}`

**Example:**
```bash
curl https://friendly-friends-app-full.onrender.com/api/robots/my-robot
```

---

## Complete Robot Integration Example (Python)

```python
import requests
import time
import base64
from camera import capture_image  # Your camera module

BASE_URL = "https://friendly-friends-app-full.onrender.com"
ROBOT_NAME = "my-robot"

def send_command(command, image_path=None):
    """Send a command to the AI and get response"""
    url = f"{BASE_URL}/api/robots/{ROBOT_NAME}/command"
    
    payload = {"command": command}
    
    # Optionally include image
    if image_path:
        with open(image_path, 'rb') as img:
            payload["image"] = base64.b64encode(img.read()).decode('utf-8')
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None

def execute_action(action_data):
    """Execute the action returned by AI"""
    action = action_data.get("action")
    params = action_data.get("parameters", {})
    speak_text = action_data.get("speak", "")
    
    # Speak the response
    print(f"Robot says: {speak_text}")
    # robot.speak(speak_text)  # Your robot's speak function
    
    # Execute the action
    if action == "move_forward":
        distance = params.get("distance", 0)
        # robot.move_forward(distance)
        print(f"Moving forward {distance} cm")
    elif action == "move_backward":
        distance = params.get("distance", 0)
        # robot.move_backward(distance)
        print(f"Moving backward {distance} cm")
    elif action == "turn_left":
        degrees = params.get("degrees", 0)
        # robot.turn_left(degrees)
        print(f"Turning left {degrees} degrees")
    elif action == "turn_right":
        degrees = params.get("degrees", 0)
        # robot.turn_right(degrees)
        print(f"Turning right {degrees} degrees")
    elif action == "stop":
        # robot.stop()
        print("Stopping")
    elif action == "wait":
        seconds = params.get("seconds", 1)
        time.sleep(seconds)
        print(f"Waiting {seconds} seconds")

# Main loop
while True:
    # Capture image from camera
    image_path = capture_image()  # Your camera function
    
    # Get voice command (from microphone or text input)
    command = input("Enter command (or 'quit' to exit): ")
    if command.lower() == 'quit':
        break
    
    # Send command to AI
    result = send_command(command, image_path)
    
    if result:
        # Execute the action
        execute_action(result)
    else:
        print("Failed to get response from AI")
    
    time.sleep(1)  # Small delay between commands
```

---

## Quick Reference

**Base URL:** `https://friendly-friends-app-full.onrender.com`

**Main Command Endpoint:**
```
POST https://friendly-friends-app-full.onrender.com/api/robots/{YOUR_ROBOT_NAME}/command
```

**Replace `{YOUR_ROBOT_NAME}` with the name you gave your robot when creating it in the admin panel.**

---

## Notes

1. Replace `my-robot` with your actual robot name
2. The `image` field in the command endpoint is optional
3. All endpoints return JSON
4. The AI will always return a response in the format: `{"action": "...", "parameters": {...}, "speak": "..."}`
5. Make sure your robot is created and active in the admin panel first

