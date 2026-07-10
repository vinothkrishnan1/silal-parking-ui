import { mockCameraData } from "../data/mockData";
import { apiUrl } from "./api";

export const APP_USERS_KEY = "appUsers";
export const APP_USERS_EVENT = "app-users-changed";
export const APP_CAMERAS_KEY = "appCameras";
export const APP_CAMERAS_EVENT = "app-cameras-changed";
export const APP_KIOSK_VIDEOS_EVENT = "app-kiosk-videos-changed";

const APP_KIOSK_VIDEO_SYNC_KEY = "appKioskVideosVersion";

const emitKioskVideosChanged = () => {
  const version = Date.now().toString();

  try {
    localStorage.setItem(APP_KIOSK_VIDEO_SYNC_KEY, version);
  } catch (error) {
    console.warn("Failed to sync kiosk video version:", error);
  }

  window.dispatchEvent(
    new CustomEvent(APP_KIOSK_VIDEOS_EVENT, {
      detail: { version },
    })
  );
};

export const getStoredUsers = (fallbackUsers = []) => {
  const savedUsers = localStorage.getItem(APP_USERS_KEY);
  return savedUsers ? JSON.parse(savedUsers) : fallbackUsers;
};

export const setStoredUsers = (users) => {
  localStorage.setItem(APP_USERS_KEY, JSON.stringify(users));
  window.dispatchEvent(new CustomEvent(APP_USERS_EVENT, { detail: users }));
};

export const getStoredCameras = () => {
  const savedCameras = localStorage.getItem(APP_CAMERAS_KEY);
  return savedCameras ? JSON.parse(savedCameras) : mockCameraData;
};

export const setStoredCameras = (cameras) => {
  localStorage.setItem(APP_CAMERAS_KEY, JSON.stringify(cameras));
  window.dispatchEvent(new CustomEvent(APP_CAMERAS_EVENT, { detail: cameras }));
};

export const getStoredKioskVideos = async () => {
  const response = await fetch(apiUrl("/api/kiosk-videos"));
  if (!response.ok) {
    throw new Error("Failed to read kiosk videos.");
  }

  const videos = await response.json();
  return Array.isArray(videos)
    ? videos.sort((left, right) => new Date(left.uploadedAt) - new Date(right.uploadedAt))
    : [];
};

export const addStoredKioskVideos = async (entries = []) => {
  if (!entries.length) return [];

  const formData = new FormData();
  const titles = [];

  entries.forEach((entry, index) => {
    const file = entry.file || entry.fileBlob;
    if (file) {
      formData.append("videos", file, file.name || entry.fileName || `video-${index + 1}.mp4`);
      titles.push(entry.title || file.name || `Video ${index + 1}`);
    }
  });

  formData.append("titles", JSON.stringify(titles));

  const response = await fetch(apiUrl("/api/kiosk-videos"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Failed to upload kiosk videos.";

    try {
      const payload = await response.json();
      message = payload.message || message;
    } catch {
      // Keep the fallback message if the response is not JSON.
    }

    throw new Error(message);
  }

  const savedEntries = await response.json();

  emitKioskVideosChanged();
  return Array.isArray(savedEntries) ? savedEntries : [];
};

export const deleteStoredKioskVideo = async (id) => {
  if (!id) return;

  const response = await fetch(apiUrl(`/api/kiosk-videos/${id}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete kiosk video.");
  }

  emitKioskVideosChanged();
};
