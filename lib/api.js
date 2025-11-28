export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

export async function fetchWithAuth(url, options = {}) {
  let token = localStorage.getItem('token');

  const makeRequest = (authToken) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...options.headers
    };

    return fetch(url, {
      ...options,
      headers
    });
  };

  let response = await makeRequest(token);

  if (response.status === 401) {
    // Try to refresh token
    try {
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem('token', data.token);
        token = data.token;

        // Retry the original request with new token
        response = await makeRequest(token);
      } else {
        // Refresh failed, logout
        localStorage.removeItem('token');
        window.location.href = '/auth/login';
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
  }

  return response;
}
