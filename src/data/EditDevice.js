import { API_BASE_URL } from "../utils/api";

async function editDevice(deviceId, deviceData) {
  const url = `${API_BASE_URL}/api/device_config/edit-device/${deviceId}`;

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deviceData),
    });

    if (!response.ok) {
      let errorData = {};
      try { errorData = await response.json(); } catch { errorData.message = response.statusText; }
      throw new Error(`${errorData.message || "Unknown server error"}`);
    }

    const responseData = await response.json();
    if (responseData.status === "success") {
      return { success: true, message: responseData.message, data: responseData };
    }

    return { success: false, message: responseData.message || "Device update failed on server.", data: responseData };
  } catch (error) {
    console.error("Error editing device:", error);
    return { success: false, message: error.message, data: null };
  }
}

export default editDevice;
