import requests
from requests.auth import HTTPDigestAuth
from debug_logger import log_info

# Dummy ISAPI endpoint and credentials for Hikvision controller
ISAPI_ENDPOINT = "http://<hikvision-ip>/ISAPI/AccessControl/remoteControl/door/1"
USERNAME = "admin"
PASSWORD = "your_password"

# XML command to open the barrier
OPEN_BARRIER_XML = """
<RemoteControlDoor>
    <doorNo>1</doorNo>
    <cmd>open</cmd>
</RemoteControlDoor>
"""

def send_boom_barrier_command():
    headers = {
        "Content-Type": "application/xml"
    }

    try:
        response = requests.post(
            ISAPI_ENDPOINT,
            data=OPEN_BARRIER_XML.strip(),
            headers=headers,
            auth=HTTPDigestAuth(USERNAME, PASSWORD),
            timeout=5
        )

        if response.status_code == 200:
            print("Boom barrier opened successfully.")
            log_info("BoomBarrier Script: Command successful.")
            return {"message": "Barrier opened"}
        else:
            print(f"Failed: {response.status_code}, {response.text}")
            log_info(f"BoomBarrier Script: Command failed. Code: {response.status_code}, Error: {response.text}")
            return {"error": "Barrier open failed", "status": response.status_code}

    except requests.RequestException as e:
        print(f"Exception occurred: {e}")
        log_info(f"BoomBarrier Script: Exception occurred - {str(e)}")
        return {"error": str(e)}
