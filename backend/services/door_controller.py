import os
import subprocess
import threading
import time

from debug_logger import log_info


class DoorController:
    def __init__(self, device_ip=None, username=None, password=None, port=80):
        self.device_ip = device_ip or os.getenv("DOOR_CONTROLLER_ENDPOINT")
        self.username = username or os.getenv("DOOR_CONTROLLER_USERNAME")
        self.password = password or os.getenv("DOOR_CONTROLLER_PASSWORD")
        self.port = port
        self.url = f"http://{self.device_ip}:{self.port}/ISAPI/System/IO/outputs/1/trigger"

    def _send_command(self, state):
        payload = f"""<?xml version="1.0" encoding="utf-8"?>
<IOPortData>
    <outputState>{state}</outputState>
</IOPortData>""".strip()

        command = [
            "curl",
            "--digest",
            "-u",
            f"{self.username}:{self.password}",
            "-H",
            "Content-Type: application/xml",
            "-X",
            "PUT",
            "-d",
            payload,
            "--silent",
            "--show-error",
            self.url,
        ]

        log_info(f"DoorController command: {' '.join(command)}")
        result = subprocess.run(command, capture_output=True, text=True)
        log_info(f"DoorController return code: {result.returncode}")
        log_info(f"DoorController stdout: {result.stdout}")
        log_info(f"DoorController stderr: {result.stderr}")

        if result.returncode == 0:
            log_info(f"Barrier {state.upper()} command sent successfully.")
            return True

        log_info(f"Failed to send {state.upper()} command. Error: {result.stderr}")
        return False

    def open_and_auto_close(self, delay_seconds=15):
        log_info(f"DoorController open_and_auto_close delay={delay_seconds}")
        if self._send_command("high"):
            def delayed_close():
                log_info(f"DoorController delayed close in {delay_seconds}s")
                time.sleep(delay_seconds)
                self._send_command("low")
                log_info("DoorController delayed close completed")

            threading.Thread(target=delayed_close, daemon=True).start()
            return {"message": "Barrier opened. Auto-close in progress."}, 200

        return {"message": "Failed to open barrier."}, 400

    def open_barrier(self):
        return self.open_and_auto_close()
