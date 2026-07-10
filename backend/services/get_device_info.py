import subprocess
from dotenv import load_dotenv
import os
# Load environment variables from .env
load_dotenv()


# Fetch credentials and IP from the environment variables
DEVICE_IP = os.getenv("DOOR_CONTROLLER_ENDPOINT")  # IP address of the door controller
USERNAME = os.getenv("DOOR_CONTROLLER_USERNAME")  # Username for authentication
PASSWORD = os.getenv("DOOR_CONTROLLER_PASSWORD")  # Password for authentication
PORT = 80

# Command to run
command = [
    'curl', '--digest', '-u', f'{USERNAME}:{PASSWORD}', 
    '-H', 'Content-Type: application/xml', 
    '-X', 'PUT', 
    '-d', '<RemoteControlDoor><doorNo>1</doorNo><cmd>open</cmd></RemoteControlDoor>',
    '--silent', '--show-error', 
    f'http://{DEVICE_IP}:{PORT}/ISAPI/AccessControl/RemoteControl/door/1'
]

# Running the command
result = subprocess.run(command, capture_output=True, text=True)

# Print the output and errors (if any)
print("Output:", result.stdout)
# print("Error:", result.stderr)





# # Command to run with dynamic values from .env
# command = [
#     'curl', '--digest', '-u', f'{USERNAME}:{PASSWORD}', 
#     '-H', 'Content-Type: application/xml', 
#     '-X', 'PUT', 
#     '-d', '<RemoteControlDoor><doorNo>1</doorNo><cmd>open</cmd></RemoteControlDoor>',
#     '--silent', '--show-error', 
#     f'http://{DEVICE_IP}:80/ISAPI/AccessControl/RemoteControl/door/1'
# ]

# # Running the command
# result = subprocess.run(command, capture_output=True, text=True)

# # Print the output and errors (if any)
# print("Output:", result.stdout)
# print("Error:", result.stderr)
