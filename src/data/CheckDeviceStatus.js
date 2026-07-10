import { API_BASE_URL } from "../utils/api";

async function checkDeviceStatus(ipAddress, port) {
  const url = `${API_BASE_URL}/api/device_config/check-device-status?ip_address=${encodeURIComponent(ipAddress)}&port=${encodeURIComponent(port)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      let errorData = {};
      try { errorData = await response.json(); } catch { errorData.message = response.statusText; }
      throw new Error(`Backend check error! Status: ${response.status}, Message: ${errorData.message || "Unknown backend error"}`);
    }

    const responseData = await response.json();
    if (responseData.status === "success") {
      return {
        success: true,
        isActive: responseData.isActive,
        message: responseData.message || (responseData.isActive ? "Device is active." : "Device is inactive."),
      };
    }

    return { success: false, isActive: false, message: responseData.message || "Backend failed to check device status." };
  } catch (error) {
    console.error(`Error checking status for ${ipAddress}:${port}:`, error);
    return { success: false, isActive: false, message: error.message };
  }
}

export default checkDeviceStatus;
