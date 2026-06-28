export const getBackendUrl = (path = '') => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  return `${baseUrl}/api${path}`;
};

export const getAuthHeaders = () => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const getAuthUser = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const logoutUser = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

const tryRefreshToken = async () => {
  if (typeof window === 'undefined') return false;
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;

  try {
    const res = await fetch(getBackendUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    if (!res.ok) {
      logoutUser();
      return false;
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const apiFetch = async (url, options = {}) => {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };
  
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retryHeaders = {
        ...getAuthHeaders(),
        ...(options.headers || {})
      };
      return fetch(url, { ...options, headers: retryHeaders });
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
  return res;
};
