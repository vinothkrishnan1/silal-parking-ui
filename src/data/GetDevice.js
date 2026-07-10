import { API_BASE_URL } from "../utils/api";

async function getDevices() {
  const url = `${API_BASE_URL}/api/device_config/get-devices`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      let errorData = {};
      try { errorData = await response.json(); } catch { errorData.message = response.statusText; }
      throw new Error(`${errorData.message || "Unknown server error"}`);
    }

    const responseData = await response.json();
    if (responseData.status === "success") {
      return {
        success: true,
        message: responseData.message || "Devices fetched successfully.",
        data: responseData.data || [],
      };
    }

    return { success: false, message: responseData.message || "Failed to fetch devices.", data: null };
  } catch (error) {
    console.error("Error fetching devices:", error);
    return { success: false, message: error.message, data: null };
  }
}

export default getDevices;
