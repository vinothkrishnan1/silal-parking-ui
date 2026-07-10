import barcode
from barcode.writer import ImageWriter
import base64
import io
import requests
import logging
import os
from flask import current_app

logger = logging.getLogger(__name__)

# --- Configuration ---
KIOSK_BARRIER_ENDPOINT = "http://<hikvision-ip>/ISAPI/AccessControl/remoteControl/door/1"  # Hikvision ISAPI endpoint


def _get_app_base_url():
    configured_base_url = ""

    try:
      configured_base_url = (
          current_app.config.get("SELF_BASE_URL")
          or current_app.config.get("KIOSK_WEBSITE_BASE_URL")
          or ""
      )
    except RuntimeError:
      configured_base_url = ""

    env_base_url = (
        os.getenv("SELF_BASE_URL")
        or os.getenv("KIOSK_WEBSITE_BASE_URL")
        or ""
    )

    base_url = (configured_base_url or env_base_url or "http://127.0.0.1:8000").rstrip("/")
    return base_url


def _get_kiosk_website_endpoint():
    return f"{_get_app_base_url()}/receive_data"

def generate_barcode(data):
    """
    Generates a barcode (Code128) image as a base64 encoded string.
    """
    try:
        # Use Code128 barcode format
        code128 = barcode.get('code128', data, writer=ImageWriter())
        
        # Save barcode to a bytes buffer
        buffer = io.BytesIO()
        code128.write(buffer)
        
        # Get base64 string
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return image_base64
    except Exception as e:
        logger.error(f"Error generating barcode: {e}")
        return None

def send_data_to_website(payload):
    """
    Sends vehicle entry data to the website endpoint for live updates.
    """
    endpoint = _get_kiosk_website_endpoint()

    try:
        response = requests.post(endpoint, json=payload, timeout=5)
        response.raise_for_status()
        logger.info(
            "Successfully sent data to website: %s via %s",
            payload.get("license_plate"),
            endpoint,
        )
        return True
    except Exception as e:
        logger.error(
            "Error sending data to website via %s: %s",
            endpoint,
            e,
        )
        return False

def open_barrier():
    """
    Sends a request to the Hikvision barrier to open it.
    """
    # This is a placeholder for actual Hikvision ISAPI integration
    # Typically requires XML payload and Digest Authentication
    try:
        # Example (simplified):
        # response = requests.put(KIOSK_BARRIER_ENDPOINT, data="<RemoteControlDoor><cmd>open</cmd></RemoteControlDoor>", auth=HTTPDigestAuth(username, password))
        logger.info("Triggered barrier opening.")
        return True
    except Exception as e:
        logger.error(f"Error opening barrier: {e}")
        return False
