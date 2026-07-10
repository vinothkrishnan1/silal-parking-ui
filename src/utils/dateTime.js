import { useEffect, useState } from "react";

export const APP_TIMEZONE_KEY = "appTimeZone";
export const APP_TIMEZONE_EVENT = "app-timezone-changed";

export const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "India Standard Time" },
  { value: "Asia/Dubai", label: "Gulf Standard Time" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London" },
  { value: "America/New_York", label: "New York" },
];

export const getAppTimeZone = () =>
  localStorage.getItem(APP_TIMEZONE_KEY) ||
  Intl.DateTimeFormat().resolvedOptions().timeZone ||
  "UTC";

export const setAppTimeZone = (timeZone) => {
  localStorage.setItem(APP_TIMEZONE_KEY, timeZone);
  window.dispatchEvent(new CustomEvent(APP_TIMEZONE_EVENT, { detail: timeZone }));
};

export const useAppTimeZone = () => {
  const [timeZone, setTimeZone] = useState(getAppTimeZone);

  useEffect(() => {
    const syncTimeZone = (event) => {
      setTimeZone(event?.detail || getAppTimeZone());
    };

    window.addEventListener(APP_TIMEZONE_EVENT, syncTimeZone);
    window.addEventListener("storage", syncTimeZone);

    return () => {
      window.removeEventListener(APP_TIMEZONE_EVENT, syncTimeZone);
      window.removeEventListener("storage", syncTimeZone);
    };
  }, []);

  return timeZone;
};

export const parseBackendDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value !== "string") return new Date(value);

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00`);
  }

  const hasZoneInfo = /([zZ]|[+\-]\d{2}:\d{2})$/.test(trimmed);
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");

  return new Date(hasZoneInfo ? normalized : `${normalized}Z`);
};

export const formatWithTimeZone = (value, options = {}, fallback = "--") => {
  const parsed = parseBackendDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return fallback;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: getAppTimeZone(),
    ...options,
  }).format(parsed);
};

export const formatAppDate = (value, fallback = "--") =>
  formatWithTimeZone(
    value,
    { year: "numeric", month: "short", day: "numeric" },
    fallback
  );

export const formatAppTime = (value, fallback = "--") =>
  formatWithTimeZone(
    value,
    { hour: "2-digit", minute: "2-digit", hour12: true },
    fallback
  );

export const formatAppDateTime = (value, fallback = "--") =>
  formatWithTimeZone(
    value,
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
    fallback
  );
