import { API_BASE_URL } from "../utils/api";

async function deleteDevice(deviceId) {
  const url = `${API_BASE_URL}/api/device_config/delete-device/${deviceId}`;

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      let errorData = {};
      try { errorData = await response.json(); } catch { errorData.message = response.statusText; }
      throw new Error(`${errorData.message || "Unknown server error"}`);
    }

    const responseData = await response.json();
    if (responseData.status === "success") {
      return { success: true, message: responseData.message || "Device deleted successfully." };
    }

    return { success: false, message: responseData.message || "Device deletion failed on server." };
  } catch (error) {
    console.error("Error deleting device:", error);
    return { success: false, message: error.message };
  }
}

export default deleteDevice;
