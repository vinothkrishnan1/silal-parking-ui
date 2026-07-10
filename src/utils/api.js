const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const isLoopbackOrigin = (value) => {
  if (!value) return false;

  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
};

const getDevBackendOrigin = (value) => {
  if (!value) return '';

  try {
    const url = new URL(value);
    const devPorts = new Set(['3000', '4173', '5173']);
    if (!devPorts.has(url.port)) return '';

    return `${url.protocol}//${url.hostname}:5000`;
  } catch {
    return '';
  }
};

const envBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const browserOrigin = typeof window !== 'undefined' ? normalizeBaseUrl(window.location.origin) : '';
const devBackendOrigin = getDevBackendOrigin(browserOrigin);

const shouldUseBrowserOrigin =
  browserOrigin &&
  envBaseUrl &&
  isLoopbackOrigin(envBaseUrl) &&
  !isLoopbackOrigin(browserOrigin);

export const API_BASE_URL =
  (shouldUseBrowserOrigin ? browserOrigin : '') ||
  envBaseUrl ||
  devBackendOrigin ||
  browserOrigin ||
  'http://localhost:5000';

export const apiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
